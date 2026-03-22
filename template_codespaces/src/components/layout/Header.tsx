import { useWalletConnection } from "@solana/react-hooks";
import { motion } from "framer-motion";
import { Link2, Wallet, LogOut } from "lucide-react";

export function Header() {
  const { wallet, status, disconnect, connectors, connect } =
    useWalletConnection();

  const address = wallet?.account.address.toString();
  const shortAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="/" className="group flex items-center gap-2">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-[0_0_15px_rgba(153,69,255,0.4)]"
          >
            <Link2 className="h-4 w-4 text-white" />
          </motion.div>
          <span className="text-xl font-bold tracking-tight text-foreground ml-1">
            Repu<span className="text-primary glow-text transition-all duration-300 group-hover:neon-text">Link</span>
          </span>
          <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-light">
            Devnet
          </span>
        </a>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {status === "connected" && shortAddress ? (
            <>
              <a
                href="/dashboard"
                className="hidden sm:inline-flex items-center rounded-xl glass-panel glass-panel-hover px-4 py-2 text-sm font-medium transition"
              >
                Dashboard
              </a>

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
              className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-foreground px-5 py-2 text-sm font-bold text-background transition hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <Wallet className="relative z-10 h-4 w-4" />
              <span className="relative z-10">
                {status === "connecting" ? "Connecting..." : "Connect Wallet"}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}