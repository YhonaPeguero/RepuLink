/**
 * Infraestructura SAS compartida (Fase 2): authority, credential, schema y
 * emisión de atestaciones de jobs de RepuLink en devnet.
 *
 * El nonce de cada atestación es el Job PDA, así la attestation PDA de un job
 * es determinística (una por job) y se puede buscar sin indexar nada.
 */
import {
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromPrivateKeyBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getSignatureFromTransaction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
  type KeyPairSigner,
} from "@solana/kit";
import {
  deriveAttestationPda,
  deriveCredentialPda,
  deriveSchemaPda,
  fetchMaybeAttestation,
  fetchMaybeCredential,
  fetchMaybeSchema,
  fetchSchema,
  getCreateAttestationInstruction,
  getCreateCredentialInstruction,
  getCreateSchemaInstruction,
  serializeAttestationData,
} from "sas-lib";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import path from "node:path";

export const RPC_URL = "https://api.devnet.solana.com";
export const RPC_WS_URL = "wss://api.devnet.solana.com";
export const CREDENTIAL_NAME = "RepuLink";
export const SCHEMA_NAME = "repulink-job";
export const SCHEMA_VERSION = 1;
// Layout compacto SAS: 12=string, 0=u8, 8=i64 (ver sas-lib utils)
export const SCHEMA_LAYOUT = new Uint8Array([12, 0, 8, 8]);
export const SCHEMA_FIELDS = ["job", "state", "created_at", "resolved_at"];
const KEY_PATH = path.join(import.meta.dirname, ".keys", "attestation-authority.json");
export const MIN_BALANCE_LAMPORTS = 50_000_000n; // 0.05 SOL

export const rpc = createSolanaRpc(RPC_URL);
export const rpcSubscriptions = createSolanaRpcSubscriptions(RPC_WS_URL);
const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

/** Payload del schema repulink-job v1. */
export type JobAttestationPayload = {
  job: string;
  state: number;
  created_at: bigint;
  resolved_at: bigint;
};

export async function loadOrCreateAuthority(): Promise<KeyPairSigner> {
  if (!existsSync(KEY_PATH)) {
    const secret = webcrypto.getRandomValues(new Uint8Array(32));
    mkdirSync(path.dirname(KEY_PATH), { recursive: true });
    writeFileSync(KEY_PATH, JSON.stringify(Array.from(secret)), { mode: 0o600 });
    console.log(`authority nueva generada en ${KEY_PATH}`);
  }
  const secret = new Uint8Array(JSON.parse(readFileSync(KEY_PATH, "utf8")));
  return createKeyPairSignerFromPrivateKeyBytes(secret);
}

export async function sendIxs(
  authority: KeyPairSigner,
  ixs: Instruction[],
): Promise<string> {
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const tx = await pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(authority, m),
    (m) => appendTransactionMessageInstructions(ixs, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    signTransactionMessageWithSigners,
  );
  assertIsTransactionWithBlockhashLifetime(tx);
  await sendAndConfirm(tx, { commitment: "confirmed" });
  return getSignatureFromTransaction(tx);
}

/** Crea credential y schema si no existen. Devuelve sus PDAs. */
export async function ensureCredentialAndSchema(
  authority: KeyPairSigner,
): Promise<{ credentialPda: Address; schemaPda: Address }> {
  const [credentialPda] = await deriveCredentialPda({
    authority: authority.address,
    name: CREDENTIAL_NAME,
  });
  const credential = await fetchMaybeCredential(rpc, credentialPda);
  if (credential.exists) {
    console.log(`credential ya existe: ${credentialPda}`);
  } else {
    const sig = await sendIxs(authority, [
      getCreateCredentialInstruction({
        payer: authority,
        credential: credentialPda,
        authority,
        name: CREDENTIAL_NAME,
        signers: [authority.address],
      }),
    ]);
    console.log(`credential creado: ${credentialPda} (tx ${sig})`);
  }

  const [schemaPda] = await deriveSchemaPda({
    credential: credentialPda,
    name: SCHEMA_NAME,
    version: SCHEMA_VERSION,
  });
  const maybeSchema = await fetchMaybeSchema(rpc, schemaPda);
  if (maybeSchema.exists) {
    console.log(`schema ya existe: ${schemaPda}`);
  } else {
    const sig = await sendIxs(authority, [
      getCreateSchemaInstruction({
        payer: authority,
        authority,
        credential: credentialPda,
        schema: schemaPda,
        name: SCHEMA_NAME,
        description: "Resultado final de un Job de escrow de RepuLink",
        layout: SCHEMA_LAYOUT,
        fieldNames: SCHEMA_FIELDS,
      }),
    ]);
    console.log(`schema creado: ${schemaPda} (tx ${sig})`);
  }

  return { credentialPda, schemaPda };
}

/**
 * Emite la atestación de un job (nonce = Job PDA). Idempotente: si ya existe,
 * no envía nada y devuelve la PDA existente.
 */
export async function emitJobAttestation(
  authority: KeyPairSigner,
  credentialPda: Address,
  schemaPda: Address,
  jobAddress: Address,
  payload: JobAttestationPayload,
): Promise<{ attestationPda: Address; sig?: string }> {
  const [attestationPda] = await deriveAttestationPda({
    credential: credentialPda,
    schema: schemaPda,
    nonce: jobAddress,
  });
  const existing = await fetchMaybeAttestation(rpc, attestationPda);
  if (existing.exists) {
    console.log(`atestación ya existe: ${attestationPda}`);
    return { attestationPda };
  }

  const schema = await fetchSchema(rpc, schemaPda);
  const sig = await sendIxs(authority, [
    getCreateAttestationInstruction({
      payer: authority,
      authority,
      credential: credentialPda,
      schema: schemaPda,
      attestation: attestationPda,
      nonce: jobAddress,
      data: serializeAttestationData(schema.data, payload),
      expiry: 0, // sin expiración
    }),
  ]);
  console.log(`atestación creada: ${attestationPda} (tx ${sig})`);
  return { attestationPda, sig };
}
