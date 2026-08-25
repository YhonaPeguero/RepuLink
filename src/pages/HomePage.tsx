import { useWalletConnection } from "@solana/react-hooks";
import { Layout } from "../components/layout/Layout";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Download, Gavel, Lock, ScrollText } from "lucide-react";

const KNOWN_WALLETS = [
  { name: "Phantom", url: "https://phantom.app/" },
  { name: "Backpack", url: "https://backpack.app/" },
  { name: "Solflare", url: "https://solflare.com/" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const FEATURES = [
  {
    icon: <Lock className="mb-4 h-8 w-8 text-primary-light" />,
    title: "Funds in a program vault",
    description:
      "The client deposits before work starts. The vault belongs to the job's own program address, and funds only ever move through the payout, refund and dispute paths of the state machine.",
  },
  {
    icon: <ScrollText className="mb-4 h-8 w-8 text-secondary" />,
    title: "Reputation from paid work",
    description:
      "A job that is delivered and released can be attested through the Solana Attestation Service. The record follows the wallet, not the platform.",
  },
  {
    icon: <Gavel className="mb-4 h-8 w-8 text-accent-gold" />,
    title: "Human arbitration",
    description:
      "Either side can open a dispute while funds are escrowed. An arbiter splits the vault; the state machine never releases on its own.",
  },
];

export function HomePage() {
  const { connectors, connect, status } = useWalletConnection();

  const notInstalled = KNOWN_WALLETS.filter(
    (w) =>
      !connectors.some((c) =>
        c.name.toLowerCase().includes(w.name.toLowerCase())
      )
  );

  return (
    <Layout>
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center pb-20 text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-12"
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-primary/20 blur-[120px]" />

          <motion.div
            variants={itemVariants}
            className="flex max-w-3xl flex-col items-center space-y-6"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-light shadow-[0_0_15px_rgba(153,69,255,0.2)] backdrop-blur-md">
              <Lock className="h-3.5 w-3.5" /> Escrow on Solana · Devnet
            </span>
            <h1 className="!leading-[1.1] text-5xl font-black tracking-tight text-white sm:text-6xl md:text-7xl">
              Get paid for the work.
              <br />
              <span className="relative inline-block bg-gradient-to-r from-primary-light via-primary to-blue-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(153,69,255,0.5)]">
                Keep the record.
              </span>
            </h1>
            <p className="max-w-2xl px-4 text-lg leading-relaxed text-muted sm:text-xl">
              The client locks the payment in a program-owned vault before work
              starts. The freelancer delivers, the funds are released against an
              on-chain state machine — and the settled job becomes a{" "}
              <strong className="font-semibold text-white">
                verifiable track record no platform owns
              </strong>
              .
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="w-full max-w-md space-y-4"
          >
            {status !== "connected" ? (
              <div className="group relative space-y-4 overflow-hidden rounded-3xl glass-panel p-6 shadow-2xl">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                <div className="space-y-1">
                  <p className="text-sm font-semibold uppercase tracking-widest text-white/80">
                    Connect an installed wallet
                  </p>
                  <p className="text-xs text-muted">
                    RepuLink uses your own Solana wallet. Nothing is custodied.
                  </p>
                </div>
                <div className="grid gap-3">
                  {connectors.map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => connect(connector.id)}
                      disabled={status === "connecting"}
                      className="group/btn relative flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition-all hover:border-primary/50 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(153,69,255,0.2)] disabled:opacity-50"
                    >
                      <span className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 p-1">
                          <img
                            src={connector.icon}
                            alt={connector.name}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        {connector.name}
                      </span>
                      <ArrowRight className="h-4 w-4 opacity-50 transition-all group-hover/btn:translate-x-1 group-hover/btn:opacity-100" />
                    </button>
                  ))}

                  {notInstalled.map((wallet) => (
                    <a
                      key={wallet.name}
                      href={wallet.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group/btn flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-5 py-3 text-sm font-medium text-white/60 transition-all hover:bg-white/[0.05] hover:text-white"
                    >
                      <span className="flex items-center gap-3">
                        <Download className="h-4 w-4" /> {wallet.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 transition-opacity group-hover/btn:opacity-100">
                        Install
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="mb-4 inline-block rounded-full border border-green-500/20 bg-green-500/10 px-4 py-1.5 text-sm font-bold text-green-400">
                  Wallet connected
                </p>
                <a
                  href="/dashboard"
                  className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-foreground px-8 py-4 text-base font-bold text-background shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-transform hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative z-10 flex items-center gap-2">
                    Go to my jobs{" "}
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </a>
                <a
                  href="/job/create"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl glass-panel glass-panel-hover px-8 py-3.5 text-sm font-bold text-white transition"
                >
                  Create an escrow job
                </a>
              </div>
            )}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-12 grid w-full gap-5 text-left sm:mt-20 md:grid-cols-3"
          >
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group space-y-2 rounded-3xl glass-panel p-6 transition-all duration-300 hover:-translate-y-2 hover:border-primary/40 hover:bg-white/[0.08]"
              >
                <div className="origin-left transition-transform duration-300 group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="text-base font-bold tracking-wide text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted transition-colors group-hover:text-white/80">
                  {feature.description}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="max-w-2xl text-xs text-muted"
          >
            Devnet preview. Unaudited, single-key arbiter, and jobs settle in a
            6-decimal test token — not Circle USDC. See the README for the full
            list of current limitations.
          </motion.p>
        </motion.div>
      </div>
    </Layout>
  );
}
