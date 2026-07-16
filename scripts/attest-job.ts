/**
 * Task 2.2a — Servicio mínimo de atestación: dado un Job del programa de
 * escrow en estado final (Released, Refunded o Resolved), emite la atestación
 * SAS firmada por la authority de RepuLink. Idempotente por job.
 *
 * Antes de firmar valida que la cuenta sea un Job legítimo: owner =
 * programa de RepuLink, discriminator de Job y dirección igual al PDA
 * re-derivado desde (client, job_id). `resolved_at` sale del blockTime de la
 * última transacción del job, no del reloj local.
 *
 * Uso: npm run sas:attest-job -- <job-address>
 * Requiere la keypair de la authority ya provisionada (scripts/.keys/);
 * opcionalmente fija SAS_AUTHORITY_ADDRESS para verificar su pubkey.
 */
import { address, fetchEncodedAccount } from "@solana/kit";
import {
  JOB_DISCRIMINATOR,
  decodeJob,
} from "../src/generated/repulink/accounts/job";
import { REPULINK_PROGRAM_ADDRESS } from "../src/generated/repulink";
import { JobState } from "../src/generated/repulink/types/jobState";
import {
  deriveJobPda,
  ensureCredentialAndSchema,
  emitJobAttestation,
  loadAuthority,
  rpc,
} from "./sas";

const FINAL_STATES = new Set([JobState.Released, JobState.Refunded, JobState.Resolved]);

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("uso: npm run sas:attest-job -- <job-address>");
    process.exit(1);
  }
  const jobAddress = address(arg);

  // Validación de la cuenta antes de firmar nada con la authority.
  const account = await fetchEncodedAccount(rpc, jobAddress);
  if (!account.exists) {
    console.error(`no hay cuenta en ${jobAddress}`);
    process.exit(1);
  }
  if (account.programAddress !== REPULINK_PROGRAM_ADDRESS) {
    console.error(
      `la cuenta ${jobAddress} pertenece a ${account.programAddress}, ` +
        `no al programa de RepuLink`,
    );
    process.exit(1);
  }
  if (!JOB_DISCRIMINATOR.every((b, i) => account.data[i] === b)) {
    console.error(`la cuenta ${jobAddress} no es un Job (discriminator inválido)`);
    process.exit(1);
  }
  const job = decodeJob(account);
  const { state, createdAt, client, jobId } = job.data;
  const expectedPda = await deriveJobPda(client, BigInt(jobId));
  if (expectedPda !== jobAddress) {
    console.error(
      `la dirección ${jobAddress} no coincide con el Job PDA derivado ` +
        `de (client=${client}, job_id=${jobId}): ${expectedPda}`,
    );
    process.exit(1);
  }
  if (!FINAL_STATES.has(state)) {
    console.error(
      `el job está en estado ${JobState[state]}; solo se atesta un estado final ` +
        `(Released, Refunded o Resolved)`,
    );
    process.exit(1);
  }

  // Timestamp de la resolución: blockTime de la última tx que tocó el job
  // (la transición al estado final), no el reloj de este proceso.
  const signatures = await rpc
    .getSignaturesForAddress(jobAddress, { limit: 1 })
    .send();
  const blockTime = signatures[0]?.blockTime;
  if (blockTime == null) {
    console.error(
      `no se pudo obtener el blockTime de la última transacción del job; ` +
        `reintenta más tarde`,
    );
    process.exit(1);
  }

  const authority = await loadAuthority();
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
      resolved_at: BigInt(blockTime),
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
