import {
  REPULINK_ERROR__FEE_TOO_HIGH,
  REPULINK_ERROR__INVALID_AMOUNT,
  REPULINK_ERROR__INVALID_REVIEW_WINDOW,
  REPULINK_ERROR__INVALID_STATE,
  REPULINK_ERROR__REVIEW_WINDOW_NOT_ELAPSED,
  REPULINK_ERROR__SELF_DEALING_NOT_ALLOWED,
  REPULINK_ERROR__UNAUTHORIZED,
  getRepulinkErrorMessage,
  type RepulinkError,
} from "../generated/repulink/errors";

/** Mensajes humanos para los errores custom del programa (flujo escrow). */
const HUMAN_MESSAGES: Partial<Record<number, string>> = {
  [REPULINK_ERROR__INVALID_STATE]:
    "This action is not valid in the job's current state. Refresh the view and try again.",
  [REPULINK_ERROR__UNAUTHORIZED]:
    "Your wallet is not allowed to perform this action on this job.",
  [REPULINK_ERROR__REVIEW_WINDOW_NOT_ELAPSED]:
    "The review window has not elapsed yet; you cannot claim the payout.",
  [REPULINK_ERROR__SELF_DEALING_NOT_ALLOWED]:
    "The freelancer cannot be your own wallet.",
  [REPULINK_ERROR__INVALID_AMOUNT]:
    "The amount is not valid for this action.",
  [REPULINK_ERROR__INVALID_REVIEW_WINDOW]:
    "The review window must be between 1 and 30 days.",
  [REPULINK_ERROR__FEE_TOO_HIGH]:
    "The fee changed since you loaded the page. Refresh and try again.",
};

/** Busca un código de error custom del programa en la cadena de causas. */
function findCustomErrorCode(err: unknown): number | null {
  const seen = new Set<unknown>();
  let current: unknown = err;
  while (current && !seen.has(current)) {
    seen.add(current);
    if (typeof current === "object") {
      const ctx = (current as { context?: { code?: unknown } }).context;
      if (ctx && typeof ctx.code === "number" && ctx.code >= 0x1770) {
        return ctx.code;
      }
      const msg = (current as { message?: unknown }).message;
      if (typeof msg === "string") {
        const match = msg.match(/custom program error: (0x[0-9a-fA-F]+|\d+)/);
        if (match) return Number(match[1]);
      }
      current = (current as { cause?: unknown }).cause;
    } else {
      break;
    }
  }
  return null;
}

/** Convierte cualquier error de una acción escrow en un mensaje para la UI. */
export function mapEscrowError(err: unknown): string {
  const code = findCustomErrorCode(err);
  if (code !== null) {
    const human = HUMAN_MESSAGES[code];
    if (human) return human;
    try {
      return getRepulinkErrorMessage(code as RepulinkError);
    } catch {
      return `Program error (code ${code})`;
    }
  }
  if (err instanceof Error && err.message) {
    if (/insufficient funds|insufficient lamports/i.test(err.message)) {
      return "Insufficient funds to complete the transaction.";
    }
    return err.message;
  }
  return "Unexpected error while sending the transaction.";
}
