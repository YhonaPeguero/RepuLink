/**
 * Reconocimiento de mints conocidos.
 *
 * El programa acepta CUALQUIER mint SPL: no hay allowlist on-chain. Por eso la
 * UI nunca debe asumir que un job liquida en USDC, ni dar por hecho que un mint
 * desconocido es el token de demo. Solo se rotula lo que se puede reconocer.
 */
const KNOWN_MINTS: Readonly<Record<string, string>> = {
  // USDC de Circle.
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU": "USDC", // devnet
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC", // mainnet
  // Token de prueba que usan los jobs sembrados por scripts/seed-demo.ts.
  "493AbaKC2R8VrmYz7oFWk6JD7UkMeozcfSLJcrQUc4Wj": "demo token",
};

/**
 * Símbolo a mostrar para un mint. Nunca inventa "USDC", y un mint que no
 * conocemos se muestra como lo único que sabemos con certeza: un token SPL.
 * La dirección del mint se enseña siempre junto a esta etiqueta.
 */
export function tokenLabel(mint: string): string {
  return KNOWN_MINTS[mint] ?? "SPL token";
}

export function isCircleUsdc(mint: string): boolean {
  return KNOWN_MINTS[mint] === "USDC";
}
