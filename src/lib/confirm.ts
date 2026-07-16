import type { Signature } from "@solana/kit";

type MinimalRpc = {
  getSignatureStatuses(signatures: Signature[]): {
    send(): Promise<{
      readonly value: readonly (null | {
        readonly confirmationStatus?: string | null;
        readonly err: unknown;
      })[];
    }>;
  };
};

const LEVEL: Record<string, number> = { processed: 0, confirmed: 1, finalized: 2 };

/**
 * Espera a que una firma alcance el commitment pedido. Éxito solo si el
 * estado llega al nivel Y err es null; lanza en error on-chain o timeout
 * (una tx no encontrada tras el timeout se trata como caída/expirada).
 */
export async function awaitSignatureCommitment(
  rpc: MinimalRpc,
  signature: Signature,
  commitment: "confirmed" | "finalized",
  timeoutMs = 90_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const target = LEVEL[commitment];

  while (Date.now() < deadline) {
    const { value } = await rpc.getSignatureStatuses([signature]).send();
    const status = value[0];
    if (status) {
      if (status.err != null) {
        throw new Error(
          `Transaction failed on-chain: ${JSON.stringify(status.err)}`,
        );
      }
      if (
        status.confirmationStatus &&
        LEVEL[status.confirmationStatus] >= target
      ) {
        return;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(
    `Timed out waiting for "${commitment}" on transaction ${signature}. ` +
      `It may have expired; check the explorer before retrying.`,
  );
}
