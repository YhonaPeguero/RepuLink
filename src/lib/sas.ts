/**
 * Lectura de atestaciones SAS desde el frontend.
 *
 * Solo derivación y lectura: emitir sigue siendo trabajo de `scripts/attest-job.ts`
 * con la authority de RepuLink, que vive fuera del repo. Aquí no se firma nada.
 *
 * Las seeds replican las de `sas-lib` (`deriveAttestationPda`), que es una
 * devDependency y no debe entrar al bundle del navegador.
 */
import {
  getAddressEncoder,
  getProgramDerivedAddress,
  type Address,
} from "@solana/kit";

export const SAS_PROGRAM_ADDRESS =
  "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG" as Address;

export const REPULINK_CREDENTIAL =
  "J9ExNHgiyzVV7hduaeSL1wyyHz2vYgg7hcpeeWUcCgJg" as Address;

/**
 * Schemas del credential `RepuLink`. v1 es el que está desplegado en devnet y
 * bajo el que vive la atestación existente; v2 amplía el payload con las partes
 * y el importe. Se consultan ambos porque conviven durante la migración.
 */
export const REPULINK_SCHEMAS: readonly {
  version: number;
  address: Address;
}[] = [
  {
    version: 1,
    address: "A779c2vvVWv7vEe3sKsK2zGTKveAJwFDwbCxAnCYfAhc" as Address,
  },
  {
    version: 2,
    address: "EhYEKpARyD3vUW64xnHGRmutrkyYAm69RDaavPiE7yYC" as Address,
  },
];

const ATTESTATION_SEED = "attestation";

/** PDA de la atestación de un Job. El nonce es la dirección del Job. */
export async function deriveAttestationPda(
  schema: Address,
  jobAddress: Address
): Promise<Address> {
  const encoder = getAddressEncoder();
  const [pda] = await getProgramDerivedAddress({
    programAddress: SAS_PROGRAM_ADDRESS,
    seeds: [
      ATTESTATION_SEED,
      encoder.encode(REPULINK_CREDENTIAL),
      encoder.encode(schema),
      encoder.encode(jobAddress),
    ],
  });
  return pda;
}

export type JobAttestation = { address: Address; schemaVersion: number };

/**
 * Busca la atestación de un Job en los schemas conocidos. Devuelve la primera
 * que exista on-chain, o null si el job todavía no fue atestado.
 */
export async function findJobAttestation(
  rpc: {
    getAccountInfo: (
      address: Address,
      config: { encoding: "base64" }
    ) => { send: () => Promise<{ value: unknown | null }> };
  },
  jobAddress: Address
): Promise<JobAttestation | null> {
  for (const { version, address } of REPULINK_SCHEMAS) {
    const pda = await deriveAttestationPda(address, jobAddress);
    const info = await rpc.getAccountInfo(pda, { encoding: "base64" }).send();
    if (info.value) return { address: pda, schemaVersion: version };
  }
  return null;
}

export function explorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}
