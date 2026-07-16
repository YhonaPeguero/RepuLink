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
  getAddressEncoder,
  getProgramDerivedAddress,
  getSignatureFromTransaction,
  getU64Encoder,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
  type KeyPairSigner,
} from "@solana/kit";
import { REPULINK_PROGRAM_ADDRESS } from "../src/generated/repulink";
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

/** PDA del Job igual que el programa: seeds = [b"job", client, job_id le u64]. */
export async function deriveJobPda(client: Address, jobId: bigint): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: REPULINK_PROGRAM_ADDRESS,
    seeds: [
      "job",
      getAddressEncoder().encode(client),
      getU64Encoder().encode(jobId),
    ],
  });
  return pda;
}

/** Payload del schema repulink-job v1. */
export type JobAttestationPayload = {
  job: string;
  state: number;
  created_at: bigint;
  resolved_at: bigint;
};

/**
 * Carga la keypair de la authority. Solo el bootstrap del spike puede
 * crearla (`allowCreate`); el servicio de atestación falla si no existe para
 * no cambiar la raíz de confianza en silencio. Si `SAS_AUTHORITY_ADDRESS`
 * está definida, la pubkey cargada debe coincidir.
 */
export async function loadAuthority(
  { allowCreate = false }: { allowCreate?: boolean } = {},
): Promise<KeyPairSigner> {
  if (!existsSync(KEY_PATH)) {
    if (!allowCreate) {
      throw new Error(
        `no existe la keypair de la attestation authority en ${KEY_PATH}. ` +
          `Genérala con el bootstrap (npm run sas:spike) o restaura la existente.`,
      );
    }
    const secret = webcrypto.getRandomValues(new Uint8Array(32));
    mkdirSync(path.dirname(KEY_PATH), { recursive: true });
    writeFileSync(KEY_PATH, JSON.stringify(Array.from(secret)), {
      mode: 0o600,
      flag: "wx", // exclusivo: nunca sobrescribir una authority existente
    });
    console.log(`authority nueva generada en ${KEY_PATH}`);
  }
  const parsed: unknown = JSON.parse(readFileSync(KEY_PATH, "utf8"));
  if (!Array.isArray(parsed) || parsed.length !== 32) {
    throw new Error(`${KEY_PATH} no es una keypair válida (se esperan 32 bytes)`);
  }
  const signer = await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(parsed));
  const expected = process.env.SAS_AUTHORITY_ADDRESS;
  if (expected && signer.address !== expected) {
    throw new Error(
      `la authority cargada (${signer.address}) no coincide con ` +
        `SAS_AUTHORITY_ADDRESS (${expected})`,
    );
  }
  return signer;
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
    const sig = await createUnlessRace(
      authority,
      getCreateCredentialInstruction({
        payer: authority,
        credential: credentialPda,
        authority,
        name: CREDENTIAL_NAME,
        signers: [authority.address],
      }),
      () => fetchMaybeCredential(rpc, credentialPda),
    );
    console.log(
      sig
        ? `credential creado: ${credentialPda} (tx ${sig})`
        : `credential creado por otro proceso: ${credentialPda}`,
    );
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
    const sig = await createUnlessRace(
      authority,
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
      () => fetchMaybeSchema(rpc, schemaPda),
    );
    console.log(
      sig
        ? `schema creado: ${schemaPda} (tx ${sig})`
        : `schema creado por otro proceso: ${schemaPda}`,
    );
  }

  return { credentialPda, schemaPda };
}

/**
 * Envía la instrucción de creación tolerando la carrera check-then-create:
 * si el envío falla pero un refetch muestra que la cuenta ya existe (otro
 * proceso ganó), se trata como éxito y devuelve undefined en vez de la firma.
 */
async function createUnlessRace(
  authority: KeyPairSigner,
  ix: Instruction,
  refetch: () => Promise<{ exists: boolean }>,
): Promise<string | undefined> {
  try {
    return await sendIxs(authority, [ix]);
  } catch (err) {
    const after = await refetch();
    if (after.exists) return undefined;
    throw err;
  }
}

/**
 * Emite la atestación de un job (nonce = Job PDA). Idempotente: si ya existe
 * con el mismo payload, no envía nada; si existe con un payload distinto,
 * falla — las atestaciones son inmutables y la discrepancia requiere
 * intervención manual.
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
  const schema = await fetchSchema(rpc, schemaPda);
  const expectedData = serializeAttestationData(schema.data, payload);

  const assertSamePayload = (onChain: Uint8Array) => {
    if (
      onChain.length !== expectedData.length ||
      !onChain.every((b, i) => b === expectedData[i])
    ) {
      throw new Error(
        `la atestación ${attestationPda} ya existe con un payload distinto ` +
          `al esperado; requiere revisión manual`,
      );
    }
  };

  const existing = await fetchMaybeAttestation(rpc, attestationPda);
  if (existing.exists) {
    assertSamePayload(new Uint8Array(existing.data.data));
    console.log(`atestación ya existe con el payload esperado: ${attestationPda}`);
    return { attestationPda };
  }

  let sig: string | undefined;
  try {
    sig = await sendIxs(authority, [
      getCreateAttestationInstruction({
        payer: authority,
        authority,
        credential: credentialPda,
        schema: schemaPda,
        attestation: attestationPda,
        nonce: jobAddress,
        data: expectedData,
        expiry: 0, // sin expiración
      }),
    ]);
  } catch (err) {
    // Carrera check-then-create: si otro proceso la creó, validar su payload.
    const after = await fetchMaybeAttestation(rpc, attestationPda);
    if (!after.exists) throw err;
    assertSamePayload(new Uint8Array(after.data.data));
    console.log(`atestación creada por otro proceso: ${attestationPda}`);
    return { attestationPda };
  }
  console.log(`atestación creada: ${attestationPda} (tx ${sig})`);
  return { attestationPda, sig };
}
