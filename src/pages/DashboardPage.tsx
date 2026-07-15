import { useState } from "react";
import { ProfileEditor } from "../components/profile/ProfileEditor";
import { useWalletConnection } from "@solana/react-hooks";
import { Layout } from "../components/layout/Layout";
import { BadgeList } from "../components/badge/BadgeList";
import { useRepulink } from "../hooks/useRepulink";
import { useOnChainData } from "../hooks/useOnChainData";
import { type BadgeWithPda } from "../types/repulink";
import { type Address } from "@solana/kit";
import { ReputationCard } from "../components/profile/ReputationCard";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, AlertCircle, ArrowRight } from "lucide-react";

export function DashboardPage() {
    const { wallet, status } = useWalletConnection();
    const walletAddress = wallet?.account.address as Address | undefined;

    const { initializeProfile, isSending } = useRepulink();
    const { profile, badges, isLoading, error, refetch } = useOnChainData(
        walletAddress
    );

    const [username, setUsername] = useState("");
    const [txStatus, setTxStatus] = useState<string | null>(null);

    const handleShare = (badge: BadgeWithPda) => {
        const url = `${window.location.origin}/approve/${walletAddress}/${badge.account.badgeIndex}`;
        navigator.clipboard.writeText(url);
        setTxStatus("Approval link copied!");
        setTimeout(() => setTxStatus(null), 3000);
    };

    const handleInitializeProfile = async () => {
        if (!username.trim()) return;

        try {
            setTxStatus("Creating profile...");
            await initializeProfile(username.trim());
            setTxStatus("Profile created!");
            await refetch();
        } catch (err: any) {
            setTxStatus(`Error: ${err.message}`);
        }
    };

    if (status !== "connected") {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center gap-6 py-32">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                        <AlertCircle className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-lg text-muted">
                        Connect your wallet to access your dashboard.
                    </p>

                    <a
                        href="/"
                        className="group flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-bold text-background transition-transform hover:scale-105"
                    >
                        Go to home <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </a>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, staggerChildren: 0.1 }}
                className="flex flex-col gap-10"
            >
                {/* Header Section */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
                >
                    <div className="space-y-2">
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                            Dashboard
                        </h1>
                        <p className="text-base text-muted">Manage your soulbound reputation.</p>
                    </div>

                    {profile && (
                        <a
                            href="/badge/create"
                            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background transition-transform hover:scale-105 active:scale-95"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <Plus className="relative z-10 h-4 w-4" />
                            <span className="relative z-10">New Badge</span>
                        </a>
                    )}
                </motion.div>

                {error && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2 relative z-10"
                        role="alert"
                    >
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </motion.div>
                )}

                <AnimatePresence>
                    {txStatus && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            role="status"
                            aria-live="polite"
                            className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary-light flex items-center gap-2 relative z-10"
                        >
                            <div className="h-2 w-2 rounded-full bg-primary-light shadow-[0_0_8px_rgba(184,122,255,0.8)] animate-[pulse-glow_2s_infinite]" />
                            {txStatus}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid gap-10 lg:grid-cols-[1fr_350px]">
                    <div className="flex flex-col gap-10">
                        {/* Profile Section */}
                        <motion.section 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-panel p-6 sm:p-8 rounded-3xl space-y-6"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                    Your Profile
                                </h2>

                                {profile && walletAddress && (
                                    <a
                                        href={"/" + walletAddress}
                                        className="text-xs font-semibold text-primary-light hover:text-white transition flex items-center gap-1"
                                    >
                                        View public profile <ArrowRight className="h-3 w-3" />
                                    </a>
                                )}
                            </div>

                            {isLoading ? (
                                <div className="h-24 shimmer-skeleton rounded-2xl" />
                            ) : profile ? (
                                <ProfileEditor
                                    profile={profile}
                                    walletAddress={walletAddress as string}
                                    onUpdate={refetch}
                                />
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted">
                                        You don't have a profile yet. Create a unique username to start collecting soulbound badges.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-1">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">@</span>
                                            <input
                                                type="text"
                                                placeholder="username"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                maxLength={32}
                                                className="w-full rounded-xl border border-primary/20 bg-primary/5 pl-9 pr-4 py-3 text-sm outline-none transition focus:border-primary/60 focus:bg-primary/10"
                                            />
                                        </div>
                                        <button
                                            onClick={handleInitializeProfile}
                                            disabled={isSending || !username.trim()}
                                            aria-busy={isSending}
                                            className="group relative flex items-center justify-center overflow-hidden rounded-xl bg-primary px-8 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(153,69,255,0.4)] transition hover:bg-primary-light disabled:opacity-50"
                                        >
                                            <span className="relative z-10">
                                                {isSending ? "Creating..." : "Create"}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.section>

                        {/* Badges Section */}
                        <motion.section 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                    Your Badges
                                </h2>
                                <p className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-muted">
                                    {badges.length} Total
                                </p>
                            </div>

                            <BadgeList
                                badges={badges}
                                onShare={handleShare}
                                isLoading={isLoading}
                            />
                        </motion.section>
                    </div>

                    {/* Sidebar / Reputation Card */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col gap-6"
                    >
                        {profile && (
                            <ReputationCard
                                profile={profile}
                                badges={badges}
                                walletAddress={walletAddress as string}
                            />
                        )}
                    </motion.div>
                </div>
            </motion.div>
        </Layout>
    );
}