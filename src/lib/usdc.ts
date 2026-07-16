import { USDC_DECIMALS } from "../config";

const FACTOR = 10n ** BigInt(USDC_DECIMALS);

/**
 * "12.5" → 12500000n. Lanza si el formato no es un decimal positivo con
 * hasta 6 decimales.
 */
export function usdcToBaseUnits(input: string): bigint {
  const match = input.trim().match(/^(\d+)(?:\.(\d{1,6}))?$/);
  if (!match) {
    throw new Error("Invalid amount: use a number with up to 6 decimals");
  }
  const whole = BigInt(match[1]);
  const frac = BigInt((match[2] ?? "").padEnd(USDC_DECIMALS, "0") || "0");
  return whole * FACTOR + frac;
}

/** 12500000n → "12.5" */
export function formatUsdc(baseUnits: bigint): string {
  const whole = baseUnits / FACTOR;
  const frac = (baseUnits % FACTOR).toString().padStart(USDC_DECIMALS, "0");
  const trimmed = frac.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

/** SHA-256 de un texto (representación canónica: trim + UTF-8) → 32 bytes. */
export async function sha256Utf8(text: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(text.trim());
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}
