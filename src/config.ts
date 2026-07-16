/**
 * Configuración de entorno del frontend. Único punto de lectura de
 * import.meta.env: valida al arrancar y falla con un mensaje claro.
 */

const rpcUrl = import.meta.env.VITE_HELIUS_RPC_URL as string | undefined;

if (!rpcUrl) {
  throw new Error(
    "Falta VITE_HELIUS_RPC_URL en el entorno. Copia .env.example a .env y " +
      "pon tu endpoint RPC de Helius (devnet).",
  );
}

export const RPC_URL: string = rpcUrl;

const usdcMint = import.meta.env.VITE_USDC_MINT as string | undefined;

if (!usdcMint) {
  throw new Error(
    "Falta VITE_USDC_MINT en el entorno. Usa el mint de USDC devnet de " +
      ".env.example (el mint nunca va hardcodeado; ver spec).",
  );
}

export const USDC_MINT: string = usdcMint;
export const USDC_DECIMALS = 6;
