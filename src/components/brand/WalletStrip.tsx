import { useWalletConnection } from "@solana/react-hooks";
import { motion } from "framer-motion";
import { Check, Download } from "lucide-react";
import { WALLET_MARKS } from "./WalletMarks";

/**
 * Compatibilidad de wallets, dicha con precisión.
 *
 * RepuLink usa `autoDiscover()` del Wallet Standard de Solana, así que funciona
 * con CUALQUIER wallet que lo implemente. Las que se listan abajo son las
 * habituales, no una lista cerrada de integraciones: no hay código específico
 * para ninguna de ellas.
 *
 * Cuando una wallet está instalada se muestra su icono real, el que la propia
 * extensión expone vía `connector.icon`. Para las que no lo están se usa su
 * color de marca, sin dibujar un logotipo de memoria.
 */
const KNOWN = [
  { name: "Phantom", url: "https://phantom.app/" },
  { name: "Solflare", url: "https://solflare.com/" },
  { name: "Backpack", url: "https://backpack.app/" },
  {
    name: "Jupiter",
    url: "https://chromewebstore.google.com/detail/jupiter-wallet/iledlaeogohbilgbfhmbgkgmpplbfboh",
  },
] as const;

export function WalletStrip({ compact = false }: { compact?: boolean }) {
  const { connectors, connect, status } = useWalletConnection();

  const rows = KNOWN.map((w) => ({
    ...w,
    Mark: WALLET_MARKS[w.name],
    connector: connectors.find((c) =>
      c.name.toLowerCase().includes(w.name.toLowerCase())
    ),
  }));

  // Wallets detectadas que no están en la lista de conocidas: el Wallet
  // Standard hace que aparezcan solas, así que se muestran igual.
  const others = connectors.filter(
    (c) =>
      !KNOWN.some((w) => c.name.toLowerCase().includes(w.name.toLowerCase()))
  );

  return (
    <div className={compact ? "" : "space-y-3"}>
      <div className="flex flex-wrap items-center gap-2">
        {rows.map(({ name, url, connector, Mark }, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.4 }}
          >
            {connector ? (
              <button
                onClick={() => connect(connector.id)}
                disabled={status === "connecting"}
                className="group flex items-center gap-2 rounded-xl border border-border-low bg-elev-1 py-2 pl-2 pr-3.5 text-sm font-semibold text-white transition-all duration-[--dur-micro] hover:-translate-y-px hover:border-primary/40 hover:bg-elev-2 disabled:opacity-50"
              >
                <img
                  src={connector.icon}
                  alt=""
                  className="h-6 w-6 rounded-md object-contain"
                />
                {name}
                <Check className="h-3.5 w-3.5 text-state-done" />
              </button>
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 rounded-xl border border-border-low bg-background/40 py-2 pl-2 pr-3.5 text-sm font-medium text-muted transition-all duration-[--dur-micro] hover:-translate-y-px hover:text-white"
              >
                <Mark className="h-6 w-6 transition-transform duration-[--dur-micro] group-hover:scale-105" />
                {name}
                <Download className="h-3.5 w-3.5 opacity-50" />
              </a>
            )}
          </motion.div>
        ))}

        {others.map((c) => (
          <button
            key={c.id}
            onClick={() => connect(c.id)}
            disabled={status === "connecting"}
            className="flex items-center gap-2 rounded-xl border border-border-low bg-elev-1 py-2 pl-2 pr-3.5 text-sm font-semibold text-white transition-all duration-[--dur-micro] hover:-translate-y-px hover:border-primary/40 disabled:opacity-50"
          >
            <img
              src={c.icon}
              alt=""
              className="h-6 w-6 rounded-md object-contain"
            />
            {c.name}
            <Check className="h-3.5 w-3.5 text-state-done" />
          </button>
        ))}
      </div>
    </div>
  );
}
