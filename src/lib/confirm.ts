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

/** La transacción aterrizó y falló: resultado definitivo. */
export class TransactionFailedError extends Error {
  constructor(public readonly transactionError: unknown) {
    super(`Transaction failed on-chain: ${JSON.stringify(transactionError)}`);
    this.name = "TransactionFailedError";
  }
}

/** No se pudo determinar el resultado (timeout/expiración): NO es un fallo
 * confirmado — la transacción puede haber aterrizado. */
export class ConfirmationTimeoutError extends Error {
  constructor(commitment: string, signature: string) {
    super(
      `Timed out waiting for "${commitment}" on transaction ${signature}. ` +
        `Its outcome is unknown; check the explorer before retrying.`,
    );
    this.name = "ConfirmationTimeoutError";
  }
}

const LEVEL: Record<string, number> = { processed: 0, confirmed: 1, finalized: 2 };

/**
 * Espera a que una firma alcance el commitment pedido. Éxito solo si el
 * estado llega al nivel Y err es null. Lanza TransactionFailedError (fallo
 * definitivo, con el TransactionError estructurado) o
 * ConfirmationTimeoutError (resultado desconocido).
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
        throw new TransactionFailedError(status.err);
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
  throw new ConfirmationTimeoutError(commitment, signature);
}
