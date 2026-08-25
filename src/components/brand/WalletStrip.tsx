import { useWalletConnection } from "@solana/react-hooks";
import { motion } from "framer-motion";
import { Check, Download } from "lucide-react";

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
  { name: "Phantom", url: "https://phantom.app/", tint: "#AB9FF2" },
  { name: "Solflare", url: "https://solflare.com/", tint: "#FC7227" },
  { name: "Backpack", url: "https://backpack.app/", tint: "#E33E3F" },
] as const;

export function WalletStrip({ compact = false }: { compact?: boolean }) {
  const { connectors, connect, status } = useWalletConnection();

  const rows = KNOWN.map((w) => ({
    ...w,
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
        {rows.map(({ name, url, tint, connector }, i) => (
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
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-black text-black/80 transition-transform duration-[--dur-micro] group-hover:scale-105"
                  style={{ backgroundColor: tint }}
                >
                  {name[0]}
                </span>
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
            className="flex items-center gap-2 rounded-xl border border-border-low bg-elev-1 py-2 pl-2 pr-3.5 text-sm font-semibold text-white transition-all duration-[--dur-micro] hover:-translate-y-px hover:border-primary/40"
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

      {!compact && (
        <p className="text-xs leading-relaxed text-muted/70">
          Any Solana wallet that implements the Wallet Standard works. RepuLink
          holds no keys and creates no account.
        </p>
      )}
    </div>
  );
}
