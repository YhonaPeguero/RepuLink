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
