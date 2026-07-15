import { useReputationNFT } from "../../hooks/useReputationNFT";
import { type FreelancerProfile, type BadgeWithPda } from "../../types/repulink";
import { motion } from "framer-motion";
import { Hexagon, Sparkles, CheckCircle2 } from "lucide-react";

interface ReputationCardProps {
  profile: FreelancerProfile;
  badges: BadgeWithPda[];
  walletAddress: string;
}

export function ReputationCard({
  profile,
  badges,
  walletAddress,
}: ReputationCardProps) {
  const { mintReputationCard, isMinting, mintStatus, mintSignature } =
    useReputationNFT();

  const approved = badges.filter((b) => "approved" in b.account.status);
  const score =
    badges.length > 0
      ? Math.round((approved.length / badges.length) * 100)
      : 0;

  const handleMint = async () => {
    try {
      await mintReputationCard(profile, badges);
    } catch {
      // error already set in hook
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8 space-y-6 relative overflow-hidden group">
      {/* Background glow effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 group-hover:bg-primary/20 transition-colors duration-500" />
      
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
            <Hexagon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Reputation Card</h2>
        </div>
        <p className="text-sm text-muted">
          Mint your verified reputation as a soulbound NFT on Solana.
        </p>
      </div>

      {/* Card preview */}
      <motion.div 
        whileHover={{ scale: 1.02, rotateY: 5, rotateX: 5 }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a001a] via-[#1a0033] to-[#2a004d] p-6 text-white shadow-[0_10px_40px_rgba(153,69,255,0.15)] flex flex-col gap-6"
        style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
      >
        {/* Holographic grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20" />
        
        {/* Top row */}
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary-light">
              RepuLink SBT
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">@{profile.username}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary-light">Trust Score</p>
            <p className="text-3xl sm:text-4xl font-black drop-shadow-[0_0_15px_rgba(153,69,255,0.8)] neon-text text-white">
                {score}%
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-3">
          {[
            { label: "Endorsed", value: approved.length },
            { label: "Total", value: badges.length },
            { label: "On-chain", value: <CheckCircle2 className="h-4 w-4 text-green-400 inline" /> },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 space-y-1 backdrop-blur-md"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">{stat.label}</p>
              <p className="text-lg font-bold text-white/90">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Wallet & Logo */}
        <div className="relative z-10 flex items-end justify-between border-t border-white/10 pt-4 mt-2">
            <p className="font-mono text-xs text-white/40 tracking-wider">
            {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
            </p>
            <div className="flex items-center gap-1.5 opacity-50">
                <Hexagon className="h-4 w-4" />
                <span className="text-xs font-bold tracking-widest">SOL</span>
            </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/20 blur-[40px]" />
        <div className="absolute -left-8 -bottom-8 h-40 w-40 rounded-full bg-blue-500/10 blur-[40px]" />
      </motion.div>

      {/* Status */}
      {mintStatus && (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm space-y-2 backdrop-blur-md"
        >
          <p className="text-primary-light font-medium">{mintStatus}</p>
          {mintSignature && (
            <a
              href={
                "https://explorer.solana.com/tx/" +
                mintSignature +
                "?cluster=devnet"
              }
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs text-primary underline underline-offset-2 transition hover:text-primary-light font-medium"
            >
              View on Solana Explorer →
            </a>
          )}
        </motion.div>
      )}

      {/* Mint button */}
      <button
        onClick={handleMint}
        disabled={isMinting || badges.length === 0}
        className="group relative w-full flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-foreground px-4 py-3.5 text-sm font-bold text-background transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="relative z-10 flex items-center gap-2">
            {isMinting ? (
                mintStatus ?? "Minting..."
            ) : badges.length === 0 ? (
                "Get endorsements first"
            ) : (
                <>
                    <Sparkles className="h-4 w-4" /> Mint Reputation Card
                </>
            )}
        </span>
      </button>

      {badges.length === 0 && (
        <p className="text-center text-xs font-medium text-muted">
          You need at least 1 badge to mint your Reputation Card.
        </p>
      )}
    </div>
  );
}