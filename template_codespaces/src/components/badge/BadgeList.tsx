import { type BadgeWithPda } from "../../types/repulink";
import { BadgeCard } from "./BadgeCard";
import { motion, type Variants } from "framer-motion";

interface BadgeListProps {
  badges: BadgeWithPda[];
  onShare?: (badge: BadgeWithPda) => void;
  isLoading?: boolean;
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function BadgeList({ badges, onShare, isLoading }: BadgeListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-48 rounded-2xl border border-white/5 bg-white/[0.02] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
        ))}
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl glass-panel p-10 text-center flex flex-col items-center justify-center min-h-[200px]"
      >
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-primary text-xl">✨</span>
        </div>
        <p className="text-base font-medium text-foreground">No badges yet.</p>
        <p className="mt-1 text-xs text-muted max-w-sm">
          Create your first badge and send it to a client to start building your on-chain reputation.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4 sm:grid-cols-2"
    >
      {badges.map((badge) => (
        <motion.div key={badge.pda} variants={item}>
            <BadgeCard
            badge={badge}
            onShare={onShare}
            />
        </motion.div>
      ))}
    </motion.div>
  );
}