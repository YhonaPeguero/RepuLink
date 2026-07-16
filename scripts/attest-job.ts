/**
 * Task 2.2a — Servicio mínimo de atestación: dado un Job del programa de
 * escrow en estado final (Released, Refunded o Resolved), emite la atestación
 * SAS firmada por la authority de RepuLink. Idempotente por job.
 *
 * Uso: npx tsx scripts/attest-job.ts <job-address>
 * (manual para el demo; el mismo módulo puede colgarse de un cron o de un
 * listener de eventos más adelante)
 */
import { address } from "@solana/kit";
import { fetchMaybeJob } from "../src/generated/repulink/accounts/job";
import { JobState } from "../src/generated/repulink/types/jobState";
import {
  ensureCredentialAndSchema,
  emitJobAttestation,
  loadOrCreateAuthority,
  rpc,
} from "./sas";

const FINAL_STATES = new Set([JobState.Released, JobState.Refunded, JobState.Resolved]);

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("uso: npx tsx scripts/attest-job.ts <job-address>");
    process.exit(1);
  }
  const jobAddress = address(arg);

  const job = await fetchMaybeJob(rpc, jobAddress);
  if (!job.exists) {
    console.error(`no hay cuenta Job en ${jobAddress}`);
    process.exit(1);
  }
  const { state, createdAt } = job.data;
  if (!FINAL_STATES.has(state)) {
    console.error(
      `el job está en estado ${JobState[state]}; solo se atesta un estado final ` +
        `(Released, Refunded o Resolved)`,
    );
    process.exit(1);
  }

  const authority = await loadOrCreateAuthority();
  const { credentialPda, schemaPda } = await ensureCredentialAndSchema(authority);
  const { attestationPda } = await emitJobAttestation(
    authority,
    credentialPda,
    schemaPda,
    jobAddress,
    {
      job: jobAddress as string,
      state,
      created_at: createdAt,
      resolved_at: BigInt(Math.floor(Date.now() / 1000)),
    },
  );
  console.log(
    `explorer: https://explorer.solana.com/address/${attestationPda}?cluster=devnet`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
