/**
 * Seed del demo público en devnet.
 *
 * Deja 3 jobs visibles en la UI, uno por estado del ciclo feliz:
 *   1. Funded    — create_job+fund_job atómicos
 *   2. Delivered — … + mark_delivered
 *   3. Released  — … + approve_release (fee → treasury del Config)
 *
 * Usa el Config real on-chain (arbiter/treasury) y el mint de VITE_USDC_MINT
 * (de process.env o .env). Las wallets demo son persistentes en ~/.repulink/
 * para que el script sea re-ejecutable sin regar keypairs nuevos.
 *
 * Uso: npx tsx scripts/seed-demo.ts
 * Requiere ~/.config/solana/id.json (admin, con SOL en devnet y autoridad
 * del mint de demo para acuñar tokens al client).
 */
import {
  address,
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
  type KeyPairSigner,
  type Signature,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getMintToInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import {
  getApproveReleaseInstructionAsync,
  getCreateJobInstructionAsync,
  getFundJobInstructionAsync,
  getMarkDeliveredInstruction,
} from "../src/generated/repulink";
import { fetchJob } from "../src/generated/repulink/accounts/job";
import { fetchMaybeConfig } from "../src/generated/repulink/accounts/config";
import { JobState } from "../src/generated/repulink/types/jobState";
import { deriveConfigPda, deriveJobPda } from "../src/lib/pdas";
import { awaitSignatureCommitment } from "../src/lib/confirm";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const RPC_URL = "https://api.devnet.solana.com";
const rpc = createSolanaRpc(RPC_URL);

function loadMintFromEnv(): Address {
  let mint = process.env.VITE_USDC_MINT;
  if (!mint) {
    const envPath = path.join(import.meta.dirname, "../.env");
    if (existsSync(envPath)) {
      mint = readFileSync(envPath, "utf8")
        .split("\n")
        .find((l) => l.startsWith("VITE_USDC_MINT="))
        ?.split("=")[1]
        ?.trim();
    }
  }
  if (!mint) throw new Error("VITE_USDC_MINT no está en el entorno ni en .env");
  return address(mint);
}

async function loadKeypair(file: string): Promise<KeyPairSigner> {
  return createKeyPairSignerFromBytes(
    new Uint8Array(JSON.parse(readFileSync(file, "utf8"))),
  );
}

async function sendTx(
  feePayer: KeyPairSigner,
  ixs: Instruction[],
  commitment: "confirmed" | "finalized" = "confirmed",
): Promise<Signature> {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const signed = await pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(feePayer, m),
    (m) => appendTransactionMessageInstructions(ixs, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    signTransactionMessageWithSigners,
  );
  assertIsTransactionWithBlockhashLifetime(signed);
  // Envío raw + polling: los websockets del RPC público de devnet se cuelgan.
  const sig = getSignatureFromTransaction(signed);
  await rpc
    .sendTransaction(getBase64EncodedWireTransaction(signed), {
      encoding: "base64",
      preflightCommitment: "confirmed",
    })
    .send();
  await awaitSignatureCommitment(rpc, sig, commitment);
  return sig;
}

async function ata(mint: Address, owner: Address): Promise<Address> {
  const [pda] = await findAssociatedTokenPda({
    mint,
    owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  return pda;
}

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
  );
}

const explorer = {
  address: (a: string) => `https://explorer.solana.com/address/${a}?cluster=devnet`,
  tx: (s: string) => `https://explorer.solana.com/tx/${s}?cluster=devnet`,
};

async function main() {
  const admin = await loadKeypair(path.join(homedir(), ".config/solana/id.json"));
  const client = await loadKeypair(path.join(homedir(), ".repulink/demo-client.json"));
  const freelancer = await loadKeypair(path.join(homedir(), ".repulink/demo-freelancer.json"));
  const mint = loadMintFromEnv();
  console.log(`admin      ${admin.address}`);
  console.log(`client     ${client.address}`);
  console.log(`freelancer ${freelancer.address}`);
  console.log(`mint       ${mint}`);

  const config = await fetchMaybeConfig(rpc, await deriveConfigPda());
  if (!config.exists) throw new Error("Config no existe en devnet — corre init_config primero");
  const treasury = config.data.treasury;
  console.log(`arbiter    ${config.data.arbiter} (Config on-chain)`);
  console.log(`treasury   ${treasury} (Config on-chain)`);

  // ── SOL para las wallets demo (solo si están cortas) ──────────────────────
  const sol = (n: number) => BigInt(Math.round(n * 1e9));
  const topUps: Instruction[] = [];
  for (const [wallet, min, amount] of [
    [client, 0.05, 0.1],
    [freelancer, 0.01, 0.02],
  ] as const) {
    const { value: balance } = await rpc.getBalance(wallet.address).send();
    if (balance < sol(min)) {
      topUps.push(
        getTransferSolInstruction({ source: admin, destination: wallet.address, amount: sol(amount) }),
      );
    }
  }
  if (topUps.length > 0) {
    await sendTx(admin, topUps);
    console.log("wallets demo fondeadas con SOL");
  }

  // ── Tokens para el client (el admin debe ser mint authority) ─────────────
  const { value: mintInfo } = await rpc
    .getAccountInfo(mint, { encoding: "jsonParsed" })
    .send();
  const parsed = mintInfo?.data as { parsed?: { info?: { mintAuthority?: string } } };
  if (parsed?.parsed?.info?.mintAuthority !== admin.address) {
    throw new Error(
      `el admin no es mint authority de ${mint} — fondea manualmente el ATA del client (${client.address})`,
    );
  }
  const clientToken = await ata(mint, client.address);
  await sendTx(admin, [
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      payer: admin,
      owner: client.address,
      mint,
    }),
    getMintToInstruction({
      mint,
      token: clientToken,
      mintAuthority: admin,
      amount: 600_000_000n, // 600 tokens: cubre 150+250+100 y deja margen
    }),
  ]);
  console.log("client fondeado con 600 tokens");

  // ── Los 3 jobs del demo ───────────────────────────────────────────────────
  const baseJobId = BigInt(Date.now());
  const jobs = [
    { name: "Funded", jobId: baseJobId, amount: 150_000_000n, brief: "Landing page para lanzamiento de producto" },
    { name: "Delivered", jobId: baseJobId + 1n, amount: 250_000_000n, brief: "Integración de pasarela de pagos" },
    { name: "Released", jobId: baseJobId + 2n, amount: 100_000_000n, brief: "Auditoría de smart contract" },
  ] as const;

  const results: { name: string; job: Address }[] = [];

  for (const { name, jobId, amount, brief } of jobs) {
    const job = await deriveJobPda(client.address, jobId);
    console.log(`\n── Job ${name}: ${job} ──`);

    let sig = await sendTx(
      client,
      [
        await getCreateJobInstructionAsync({
          client,
          mint,
          jobId,
          freelancer: freelancer.address,
          amount,
          feeBpsSnapshot: config.data.feeBps,
          termsHash: await sha256(brief),
          reviewWindowSecs: 86_400,
        }),
        await getFundJobInstructionAsync({ client, job, mint, clientToken }),
      ],
      "finalized",
    );
    console.log(`  create_job+fund_job: ${explorer.tx(sig)}`);

    if (name === "Delivered" || name === "Released") {
      sig = await sendTx(freelancer, [
        getMarkDeliveredInstruction({
          freelancer,
          job,
          deliveryHash: await sha256(`https://github.com/repulink-demo/entrega-${jobId}`),
        }),
      ]);
      console.log(`  mark_delivered: ${explorer.tx(sig)}`);
    }

    if (name === "Released") {
      const freelancerToken = await ata(mint, freelancer.address);
      const treasuryToken = await ata(mint, treasury);
      sig = await sendTx(
        client,
        [
          await getCreateAssociatedTokenIdempotentInstructionAsync({
            payer: client,
            owner: freelancer.address,
            mint,
          }),
          await getCreateAssociatedTokenIdempotentInstructionAsync({
            payer: client,
            owner: treasury,
            mint,
          }),
          await getApproveReleaseInstructionAsync({
            signer: client,
            job,
            mint,
            freelancerToken,
            treasuryToken,
          }),
        ],
        "finalized",
      );
      console.log(`  approve_release: ${explorer.tx(sig)}`);
    }

    const after = await fetchJob(rpc, job);
    const expected = JobState[name as keyof typeof JobState];
    if (after.data.state !== expected) {
      throw new Error(`job ${name}: estado ${JobState[after.data.state]}, esperaba ${name}`);
    }
    console.log(`  ✔ estado = ${name}`);
    results.push({ name, job });
  }

  console.log("\n── Jobs del demo en Explorer ──");
  for (const { name, job } of results) {
    console.log(`${name.padEnd(9)} ${explorer.address(job)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
