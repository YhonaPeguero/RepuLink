import { useWalletConnection } from "@solana/react-hooks";
import { Layout } from "../components/layout/Layout";
import { motion, type Variants } from "framer-motion";
import { ShieldCheck, Link2, Sparkles, ArrowRight, Download } from "lucide-react";

const KNOWN_WALLETS = [
  { name: "Phantom", url: "https://phantom.app/" },
  { name: "Backpack", url: "https://backpack.app/" },
  { name: "Solflare", url: "https://solflare.com/" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center pb-20">
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center gap-12 w-full max-w-4xl relative z-10"
        >
            {/* Background glow behind text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse pointer-events-none" />

          <motion.div variants={itemVariants} className="space-y-6 max-w-3xl flex flex-col items-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-light backdrop-blur-md shadow-[0_0_15px_rgba(153,69,255,0.2)]">
               <Sparkles className="h-3.5 w-3.5" /> Built on Solana
            </span>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white !leading-[1.1]">
              Your reputation,
              <br />
              <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary-light via-primary to-blue-400 drop-shadow-[0_0_20px_rgba(153,69,255,0.5)]">
                portable forever.
              </span>
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed text-muted max-w-2xl px-4">
              RepuLink lets freelancers collect verified badges from real clients.
              Soulbound on-chain, shareable anywhere, owned by <strong className="text-white font-semibold">you</strong> — not the
              platform.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="w-full max-w-md space-y-4">
            {status !== "connected" ? (
              <div className="space-y-4 rounded-3xl glass-panel p-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                
                <p className="text-sm font-semibold text-white/80 uppercase tracking-widest">
                  Connect your wallet
                </p>
                <div className="grid gap-3">
                  {connectors.map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => connect(connector.id)}
                      disabled={status === "connecting"}
                      className="group/btn relative flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-5 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(153,69,255,0.2)] disabled:opacity-50"
                    >
                      <span className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-md bg-white/10 flex items-center justify-center p-1">
                            {/* Generic wallet icon fallback if no connector icon */}
                            <img src={connector.icon} alt={connector.name} className="h-full w-full object-contain" />
                        </div>
                        {connector.name}
                      </span>
                      <ArrowRight className="h-4 w-4 opacity-50 transition-all group-hover/btn:opacity-100 group-hover/btn:translate-x-1" />
                    </button>
                  ))}

                  {notInstalled.map((wallet) => (
                    <a
                      key={wallet.name}
                      href={wallet.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group/btn flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 px-5 py-3 text-sm font-medium text-white/60 transition-all hover:bg-white/[0.05] hover:text-white"
                    >
                      <span className="flex items-center gap-3">
                        <Download className="h-4 w-4" /> {wallet.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-bold opacity-0 transition-opacity group-hover/btn:opacity-100">
                        Install
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-sm font-bold text-green-400 mb-4 bg-green-500/10 inline-block px-4 py-1.5 rounded-full border border-green-500/20">
                    Wallet connected successfully
                    </p>
                    <a
                        href="/dashboard"
                        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-foreground px-8 py-4 text-base font-bold text-background transition-transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <span className="relative z-10 flex items-center gap-2">
                        Go to Dashboard <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </span>
                    </a>
                </div>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="grid w-full gap-5 text-left md:grid-cols-3 mt-12 sm:mt-20">
            {[
              {
                icon: <ShieldCheck className="h-8 w-8 text-primary-light mb-4" />,
                title: "Client-Verified",
                description: "Badges are approved securely on-chain by your real clients.",
              },
              {
                icon: <Link2 className="h-8 w-8 text-blue-400 mb-4" />,
                title: "Soulbound & Permanent",
                description: "Cannot be faked or transferred. Your reputation is yours, forever.",
              },
              {
                icon: <Sparkles className="h-8 w-8 text-amber-400 mb-4" />,
                title: "Shareable Anywhere",
                description: "A beautiful public profile link. No wallet required for visitors.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-3xl glass-panel p-6 space-y-2 transition-all duration-300 hover:-translate-y-2 hover:border-primary/40 hover:bg-white/[0.08]"
              >
                <div className="transition-transform duration-300 group-hover:scale-110 origin-left">
                    {feature.icon}
                </div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted group-hover:text-white/80 transition-colors">
                  {feature.description}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}