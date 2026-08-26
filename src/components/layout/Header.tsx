import { useWalletConnection } from "@solana/react-hooks";
import { motion } from "framer-motion";
import { Wallet, LogOut, Plus } from "lucide-react";
import { SolanaMark } from "../brand/SolanaMark";

// 128px basta: en el header se dibuja a 32-40px. El original de 1254px
// pesaba 1,12 MB y se descargaba en cada visita.
const logo = "/logo-repulink-128.png";

export function Header() {
  const { wallet, status, disconnect, connectors, connect } =
    useWalletConnection();

  const address = wallet?.account.address.toString();
  const shortAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:px-6">
        {/* Logo */}
        <a href="/" className="group flex items-center gap-2">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center overflow-hidden rounded-xl shadow-[0_0_15px_rgba(153,69,255,0.4)] border border-primary/20 bg-primary/10"
          >
            <img
              src={logo}
              alt="RepuLink"
              className="h-full w-full object-cover"
            />
          </motion.div>
          <span className="text-xl font-bold tracking-tight text-foreground ml-1">
            Repu
            <span className="text-primary glow-text transition-all duration-300 group-hover:neon-text">
              Link
            </span>
          </span>
          <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-border-low bg-elev-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">
            <SolanaMark className="h-2 w-auto" />
            Devnet
          </span>
        </a>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {status === "connected" && shortAddress ? (
            <>
              <nav className="hidden items-center gap-1 sm:flex">
                <a
                  href="/dashboard"
                  className="inline-flex items-center rounded-xl border border-border-low bg-elev-1 px-4 py-2 text-sm font-medium transition-all duration-[--dur-micro] hover:-translate-y-px hover:bg-elev-2"
                >
                  Agreements
                </a>
                <a
                  href="/job/create"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary-light transition-all duration-[--dur-micro] hover:-translate-y-px hover:border-primary/50 hover:bg-primary/20"
                >
                  <Plus className="h-3.5 w-3.5" /> New agreement
                </a>
              </nav>

              <div className="flex items-center gap-2 rounded-xl glass-panel px-4 py-2 border-primary/20 bg-primary/5">
                <span className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse" />
                <span className="font-mono text-xs font-semibold text-foreground">
                  {shortAddress}
                </span>
              </div>

              <button
                onClick={() => disconnect()}
                className="flex items-center justify-center rounded-xl glass-panel glass-panel-hover p-2 text-muted hover:text-red-400 transition group"
                title="Disconnect"
              >
                <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
              </button>
            </>
          ) : (
            <button
              onClick={() => connect(connectors[0]?.id)}
              disabled={status === "connecting" || !connectors[0]}
              className="group relative flex shrink-0 items-center gap-1.5 overflow-hidden rounded-xl bg-foreground px-3.5 py-2 text-sm font-bold text-background transition-transform duration-[--dur-micro] hover:-translate-y-px active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:gap-2 sm:px-5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <Wallet className="relative z-10 h-4 w-4" />
              <span className="relative z-10 whitespace-nowrap">
                {status === "connecting" ? "Connecting" : "Connect"}
                <span className="hidden sm:inline"> Wallet</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
