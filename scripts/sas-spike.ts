/**
 * Task 2.1 — Spike SAS (Solana Attestation Service) en devnet.
 *
 * Emite una atestación de prueba firmada por la "attestation authority" de
 * RepuLink, referenciando un Job PDA derivado (el job no necesita existir
 * on-chain para el spike). Cada ejecución usa un job_id nuevo, así siempre
 * emite una atestación fresca; credential y schema se reutilizan.
 *
 * Uso: npm run sas:spike
 *
 * Resultado del spike (2026-07-16): funciona → Fase 2 sigue por Task 2.2a
 * (scripts/attest-job.ts), no hace falta el fallback 2.2b.
 */
import { airdropFactory, lamports, type KeyPairSigner } from "@solana/kit";
import { deserializeAttestationData, fetchAttestation, fetchSchema } from "sas-lib";
import { JobState } from "../src/generated/repulink/types/jobState";
import {
  MIN_BALANCE_LAMPORTS,
  deriveJobPda,
  ensureCredentialAndSchema,
  emitJobAttestation,
  loadAuthority,
  rpc,
  rpcSubscriptions,
} from "./sas";

async function ensureFunds(authority: KeyPairSigner): Promise<void> {
  const { value: balance } = await rpc.getBalance(authority.address).send();
  console.log(`authority ${authority.address} — balance ${Number(balance) / 1e9} SOL`);
  if (balance >= MIN_BALANCE_LAMPORTS) return;

  console.log("pidiendo airdrop de 1 SOL en devnet...");
  try {
    const airdrop = airdropFactory({ rpc, rpcSubscriptions });
    await airdrop({
      commitment: "confirmed",
      lamports: lamports(1_000_000_000n),
      recipientAddress: authority.address,
    });
  } catch (err) {
    console.error(
      `airdrop falló (rate limit habitual en devnet). Fondea manualmente:\n` +
        `  https://faucet.solana.com → ${authority.address}\ny reintenta.`,
    );
    throw err;
  }
}

async function main() {
  const authority = await loadAuthority({ allowCreate: true });
  await ensureFunds(authority);

  const { credentialPda, schemaPda } = await ensureCredentialAndSchema(authority);

  // Job PDA de prueba: job_id único por ejecución. En producción el job
  // existirá on-chain; para el spike basta con la dirección derivada.
  const jobId = BigInt(Date.now());
  const jobPda = await deriveJobPda(authority.address, jobId);
  console.log(`job PDA (job_id=${jobId}): ${jobPda}`);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const { attestationPda } = await emitJobAttestation(
    authority,
    credentialPda,
    schemaPda,
    jobPda,
    {
      job: jobPda as string,
      state: JobState.Released,
      created_at: now - 3600n,
      resolved_at: now,
    },
  );

  // Verificación: leer la atestación de la red y deserializar el payload.
  const schema = await fetchSchema(rpc, schemaPda);
  const attestation = await fetchAttestation(rpc, attestationPda);
  const decoded = deserializeAttestationData<Record<string, unknown>>(
    schema.data,
    new Uint8Array(attestation.data.data),
  );
  console.log("payload on-chain:", JSON.stringify(decoded, (_, v) =>
    typeof v === "bigint" ? v.toString() : v,
  ));
  console.log(
    `explorer: https://explorer.solana.com/address/${attestationPda}?cluster=devnet`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
