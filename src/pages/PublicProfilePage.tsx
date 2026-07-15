import { useEffect, useState } from "react";
import { Layout } from "../components/layout/Layout";
import { BadgeList } from "../components/badge/BadgeList";
import { useOnChainData } from "../hooks/useOnChainData";
import { type Address } from "@solana/kit";
import { motion, type Variants } from "framer-motion";
import { ShieldAlert, Home, ShieldCheck, Award, TrendingUp, CheckCircle2, User } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export function PublicProfilePage() {
  const pathParts = window.location.pathname.split("/");
  const walletAddress = pathParts[1] as Address;

  const { profile, badges, isLoading, error } = useOnChainData(
    walletAddress || undefined
  );

  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isLoading && !profile) {
      setNotFound(true);
    } else {
      setNotFound(false);
    }
  }, [isLoading, profile]);

  const approvedBadges = badges.filter((b) => "approved" in b.account.status);

  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl flex flex-col gap-8" aria-busy="true" aria-label="Loading profile">
          <div className="h-40 shimmer-skeleton rounded-3xl border border-white/5" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-48 shimmer-skeleton rounded-3xl border border-white/5"
              />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (notFound || !profile) {
    return (
      <Layout>
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-6 py-32 text-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <div className="space-y-2">
              <p className="text-2xl font-black text-white tracking-tight">
                Profile not found
              </p>
              <p className="text-base text-muted">
                This wallet doesn't have a RepuLink profile yet.
              </p>
          </div>

          <a
            href="/"
            className="group mt-4 flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/20 hover:border-white/30"
          >
            <Home className="h-4 w-4 transition-transform group-hover:scale-110" /> Go to home
          </a>
        </motion.div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-5xl flex flex-col gap-10"
      >
        {/* Profile header */}
        <motion.section 
            variants={itemVariants}
            className="group relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0A0A0A]/60 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl"
        >
          {/* Holographic background effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -z-10 group-hover:bg-primary/30 transition-colors duration-700" />
          
          <div className="relative z-10 flex flex-col sm:flex-row gap-8 items-start sm:items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
                    <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-500 text-3xl sm:text-4xl font-black text-white shadow-[0_0_30px_rgba(153,69,255,0.4)] border-4 border-background overflow-hidden group-hover:scale-105 transition-transform duration-500">
                    <span className="drop-shadow-lg">{profile.username.slice(0, 2).toUpperCase()}</span>
                    </div>
                    {approvedBadges.length > 0 && (
                        <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 border-2 border-background text-background shadow-[0_0_15px_rgba(74,222,128,0.5)]">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    )}
                </div>
                
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                    @{profile.username}
                  </h1>
                  <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 rounded-lg bg-black/40 border border-white/5 px-2.5 py-1 backdrop-blur-md">
                          <User className="h-3 w-3 text-muted" />
                          <p className="font-mono text-xs text-muted">
                            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                          </p>
                      </div>
                      
                      {approvedBadges.length > 0 && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-green-500/10 border border-green-500/20 px-2.5 py-1 backdrop-blur-md">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider">
                                Verified
                            </p>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="w-full sm:w-auto grid grid-cols-3 sm:flex gap-3">
                {[
                  { label: "Badges", value: badges.length, icon: Award, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                  { label: "Verified", value: approvedBadges.length, icon: ShieldCheck, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
                  {
                    label: "Rate",
                    value:
                      badges.length > 0
                        ? Math.round(
                            (approvedBadges.length / badges.length) * 100
                          ) + "%"
                        : "—",
                        icon: TrendingUp, color: "text-primary-light", bg: "bg-primary/10", border: "border-primary/20"
                  },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className={`flex flex-col items-center justify-center rounded-2xl ${stat.border} ${stat.bg} p-4 sm:px-6 sm:py-4 backdrop-blur-md`}
                  >
                    <stat.icon className={`h-4 w-4 mb-2 ${stat.color} opacity-80`} />
                    <p className="text-2xl sm:text-3xl font-black text-white leading-none mb-1">
                      {stat.value}
                    </p>
                    <p className={`text-[10px] sm:text-xs uppercase tracking-widest font-bold ${stat.color} opacity-80`}>
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>
          </div>
        </motion.section>

        {/* Error */}
        {error && (
          <motion.div variants={itemVariants} role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-sm font-medium text-red-200 backdrop-blur-md flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            {error}
          </motion.div>
        )}

        {/* Badges */}
        <motion.section variants={itemVariants} className="space-y-6">
          <div className="flex items-center gap-3 ml-2">
              <Award className="h-5 w-5 text-primary-light" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Reputation Badges
              </h2>
          </div>
          <BadgeList badges={badges} isLoading={false} />
        </motion.section>
      </motion.div>
    </Layout>
  );
}