/**
 * E2E del flujo escrow en devnet (verificación de Fase 3).
 *
 * Ejecuta con wallets de prueba las MISMAS instrucciones que envía la UI:
 *   0. init_config (admin = upgrade authority) + mint de prueba de 6 decimales
 *      (el mint es configurable por env; en producción es USDC devnet).
 *   A. Ciclo feliz: create_job+fund_job atómicos → mark_delivered →
 *      approve_release → verificación de balances (fee → treasury).
 *   B. Disputa: create+fund → open_dispute → resolve_dispute 50/50.
 *
 * Uso: npx tsx scripts/e2e-escrow.ts
 * Requiere ~/.config/solana/id.json (admin/deployer) con SOL en devnet.
 */
import {
  address,
  appendTransactionMessageInstructions,
  getAddressEncoder,
  getProgramDerivedAddress,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
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
import { getTransferSolInstruction, getCreateAccountInstruction } from "@solana-program/system";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getInitializeMintInstruction,
  getMintSize,
  getMintToInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import {
  REPULINK_PROGRAM_ADDRESS,
  getApproveReleaseInstructionAsync,
  getCreateJobInstructionAsync,
  getFundJobInstructionAsync,
  getInitConfigInstructionAsync,
  getMarkDeliveredInstruction,
  getOpenDisputeInstruction,
  getResolveDisputeInstructionAsync,
} from "../src/generated/repulink";
import { fetchJob } from "../src/generated/repulink/accounts/job";
import { fetchMaybeConfig } from "../src/generated/repulink/accounts/config";
import { JobState } from "../src/generated/repulink/types/jobState";
import { deriveConfigPda, deriveJobPda } from "../src/lib/pdas";
import { awaitSignatureCommitment } from "../src/lib/confirm";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const RPC_URL = "https://api.devnet.solana.com";
const rpc = createSolanaRpc(RPC_URL);

const FEE_BPS = 100; // 1%
const links: string[] = [];

function tx(label: string, sig: string) {
  const url = `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
  links.push(`${label}: ${url}`);
  console.log(`  ${label}: ${sig}`);
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
  // Envío raw + polling con getSignatureStatuses: nada de websockets, que en
  // el RPC público de devnet se quedan colgados.
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

/** ProgramData del programa bajo el loader upgradeable (seeds: [program_id]). */
async function deriveProgramDataPda(): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: address("BPFLoaderUpgradeab1e11111111111111111111111"),
    seeds: [getAddressEncoder().encode(REPULINK_PROGRAM_ADDRESS)],
  });
  return pda;
}

async function ata(mint: Address, owner: Address): Promise<Address> {
  const [pda] = await findAssociatedTokenPda({
    mint,
    owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  return pda;
}

async function tokenBalance(tokenAccount: Address): Promise<bigint> {
  const { value } = await rpc.getTokenAccountBalance(tokenAccount).send();
  return BigInt(value.amount);
}

function assertEq(label: string, actual: bigint, expected: bigint) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${expected}, obtenido ${actual}`);
  }
  console.log(`  ✔ ${label} = ${actual}`);
}

async function main() {
  // ── Wallets ───────────────────────────────────────────────────────────────
  const admin = await createKeyPairSignerFromBytes(
    new Uint8Array(
      JSON.parse(readFileSync(path.join(homedir(), ".config/solana/id.json"), "utf8")),
    ),
  );
  const client = await generateKeyPairSigner();
  const freelancer = await generateKeyPairSigner();
  const arbiter = await generateKeyPairSigner();
  console.log(`admin      ${admin.address}`);
  console.log(`client     ${client.address}`);
  console.log(`freelancer ${freelancer.address}`);
  console.log(`arbiter    ${arbiter.address}`);

  // ── Fondos SOL para las wallets de prueba ─────────────────────────────────
  const sol = (n: number) => BigInt(Math.round(n * 1e9));
  await sendTx(admin, [
    getTransferSolInstruction({ source: admin, destination: client.address, amount: sol(0.2) }),
    getTransferSolInstruction({ source: admin, destination: freelancer.address, amount: sol(0.05) }),
    getTransferSolInstruction({ source: admin, destination: arbiter.address, amount: sol(0.05) }),
  ]);
  console.log("wallets de prueba fondeadas");

  // ── Mint de prueba (6 decimales) + 1000 tokens para el client ────────────
  const mintKp = await generateKeyPairSigner();
  const mint = mintKp.address;
  const mintSpace = BigInt(getMintSize());
  const mintRent = await rpc
    .getMinimumBalanceForRentExemption(mintSpace)
    .send();
  const clientToken = await ata(mint, client.address);
  await sendTx(admin, [
    getCreateAccountInstruction({
      payer: admin,
      newAccount: mintKp,
      space: mintSpace,
      lamports: mintRent,
      programAddress: TOKEN_PROGRAM_ADDRESS,
    }),
    getInitializeMintInstruction({
      mint,
      decimals: 6,
      mintAuthority: admin.address,
    }),
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      payer: admin,
      owner: client.address,
      mint,
    }),
    getMintToInstruction({
      mint,
      token: clientToken,
      mintAuthority: admin,
      amount: 1_000_000_000n, // 1000 tokens
    }),
  ]);
  console.log(`mint de prueba: ${mint}`);

  // ── init_config (idempotente entre ejecuciones) ───────────────────────────
  const configPda = await deriveConfigPda();
  const existingConfig = await fetchMaybeConfig(rpc, configPda);
  if (existingConfig.exists) {
    console.log(`config ya existe (arbiter ${existingConfig.data.arbiter}) — usando el existente`);
    if (existingConfig.data.arbiter !== arbiter.address) {
      console.log("  (la disputa se resolverá con el arbiter del config existente si difiere: se omite el flujo B)");
    }
  } else {
    const sig = await sendTx(admin, [
      await getInitConfigInstructionAsync({
        admin,
        programData: await deriveProgramDataPda(),
        arbiter: arbiter.address,
        treasury: admin.address,
        feeBps: FEE_BPS,
      }),
    ]);
    tx("init_config", sig);
  }
  const config = await fetchMaybeConfig(rpc, configPda);
  if (!config.exists) throw new Error("config no existe tras init");
  const treasury = config.data.treasury;
  const treasuryToken = await ata(mint, treasury);

  // ── Flujo A: ciclo feliz ──────────────────────────────────────────────────
  console.log("\n── Flujo A: create+fund → deliver → release ──");
  const jobIdA = BigInt(Date.now());
  const jobA = await deriveJobPda(client.address, jobIdA);
  const amountA = 100_000_000n; // 100 tokens

  let sig = await sendTx(
    client,
    [
      await getCreateJobInstructionAsync({
        client,
        mint,
        jobId: jobIdA,
        freelancer: freelancer.address,
        amount: amountA,
        feeBpsSnapshot: config.data.feeBps,
        termsHash: new Uint8Array(
          await crypto.subtle.digest("SHA-256", new TextEncoder().encode("Brief E2E job A")),
        ),
        reviewWindowSecs: 86_400,
      }),
      await getFundJobInstructionAsync({ client, job: jobA, mint, clientToken }),
    ],
    "finalized",
  );
  tx("create_job+fund_job (atómico)", sig);
  console.log(`  job A: ${jobA}`);

  sig = await sendTx(freelancer, [
    getMarkDeliveredInstruction({
      freelancer,
      job: jobA,
      deliveryHash: new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode("https://github.com/entrega-e2e")),
      ),
    }),
  ]);
  tx("mark_delivered", sig);

  const freelancerToken = await ata(mint, freelancer.address);
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
        job: jobA,
        mint,
        freelancerToken,
        treasuryToken,
      }),
    ],
    "finalized",
  );
  tx("approve_release", sig);

  const jobAAfter = await fetchJob(rpc, jobA);
  if (jobAAfter.data.state !== JobState.Released) {
    throw new Error(`job A: estado ${JobState[jobAAfter.data.state]}, esperaba Released`);
  }
  console.log("  ✔ estado = Released");
  assertEq("freelancer recibe 99 (100 - 1% fee)", await tokenBalance(freelancerToken), 99_000_000n);
  assertEq("treasury recibe 1 (fee)", await tokenBalance(treasuryToken), 1_000_000n);

  // ── Flujo B: disputa ──────────────────────────────────────────────────────
  if (config.data.arbiter === arbiter.address) {
    console.log("\n── Flujo B: create+fund → dispute → resolve 50/50 ──");
    const jobIdB = jobIdA + 1n;
    const jobB = await deriveJobPda(client.address, jobIdB);
    const amountB = 50_000_000n;

    sig = await sendTx(
      client,
      [
        await getCreateJobInstructionAsync({
          client,
          mint,
          jobId: jobIdB,
          freelancer: freelancer.address,
          amount: amountB,
          feeBpsSnapshot: config.data.feeBps,
          termsHash: new Uint8Array(32),
          reviewWindowSecs: 86_400,
        }),
        await getFundJobInstructionAsync({ client, job: jobB, mint, clientToken }),
      ],
      "finalized",
    );
    tx("create_job+fund_job B", sig);
    console.log(`  job B: ${jobB}`);

    sig = await sendTx(freelancer, [
      getOpenDisputeInstruction({ signer: freelancer, job: jobB }),
    ]);
    tx("open_dispute", sig);

    sig = await sendTx(
      arbiter,
      [
        await getResolveDisputeInstructionAsync({
          arbiter,
          job: jobB,
          mint,
          freelancerToken,
          clientToken,
          treasuryToken,
          freelancerAmount: 25_000_000n,
        }),
      ],
      "finalized",
    );
    tx("resolve_dispute (25 freelancer / 25 client)", sig);

    const jobBAfter = await fetchJob(rpc, jobB);
    if (jobBAfter.data.state !== JobState.Resolved) {
      throw new Error(`job B: estado ${JobState[jobBAfter.data.state]}, esperaba Resolved`);
    }
    console.log("  ✔ estado = Resolved");
    // freelancer: 99 (A) + 25 - 1% de 25 = 99 + 24.75
    assertEq("freelancer acumula 123.75", await tokenBalance(freelancerToken), 123_750_000n);
    assertEq("treasury acumula 1.25", await tokenBalance(treasuryToken), 1_250_000n);
    // client: 1000 - 100 - 50 + 25 = 875
    assertEq("client termina con 875", await tokenBalance(clientToken), 875_000_000n);
  }

  console.log("\n── Links de Explorer ──");
  console.log(`job A: https://explorer.solana.com/address/${jobA}?cluster=devnet`);
  for (const l of links) console.log(l);
  console.log(`\nmint de prueba (ponlo en .env como VITE_USDC_MINT para probar la UI): ${mint}`);
  console.log(`\njob A liberado — para la atestación SAS: npx tsx scripts/attest-job.ts ${jobA}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
