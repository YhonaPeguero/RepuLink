import { useState } from "react";
import { ProfileEditor } from "../components/profile/ProfileEditor";
import { useWalletConnection } from "@solana/react-hooks";
import { Layout } from "../components/layout/Layout";
import { BadgeList } from "../components/badge/BadgeList";
import { useRepulink } from "../hooks/useRepulink";
import { useOnChainData } from "../hooks/useOnChainData";
import { type BadgeWithPda } from "../types/repulink";
import { type Address } from "@solana/kit";

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
                <div className="flex flex-col items-center justify-center gap-4 py-24">
                    <p className="text-base text-muted">
                        Connect your wallet to access your dashboard.
                    </p>

                    <a
                        href="/"
                        className="rounded-lg border border-border-low bg-card px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5"
                    >
                        Go to home
                    </a>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                            Dashboard
                        </h1>
                        <p className="text-sm text-muted">Manage your reputation badges</p>
                    </div>

                    {profile && (
                        <a
                            href="/badge/create"
                            className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
                        >
                            + New badge
                        </a>
                    )}
                </div>

                <section className="rounded-2xl border border-border-low bg-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">
                            Your profile
                        </p>

                        {profile && walletAddress && (
                            <a
                                href={"/" + walletAddress}
                                className="text-xs text-muted underline underline-offset-2 transition hover:text-foreground"
                            >
                                View public profile
                            </a>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="h-12 animate-pulse rounded-xl bg-cream/50" />
                    ) : profile ? (
                        <ProfileEditor
                            profile={profile}
                            walletAddress={walletAddress as string}
                            onUpdate={refetch}
                        />
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-muted">
                                Create a profile to start collecting badges.
                            </p>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Choose a username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    maxLength={32}
                                    className="flex-1 rounded-lg border border-border-low bg-card px-4 py-2 text-sm outline-none transition placeholder:text-muted focus:border-foreground/30"
                                />
                                <button
                                    onClick={handleInitializeProfile}
                                    disabled={isSending || !username.trim()}
                                    className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
                                >
                                    {isSending ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {txStatus && (
                    <div className="rounded-lg border border-border-low bg-cream/50 px-4 py-3 text-sm text-foreground">
                        {txStatus}
                    </div>
                )}

                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Your badges</p>
                        <p className="text-xs text-muted">{badges.length} total</p>
                    </div>

                    <BadgeList
                        badges={badges}
                        onShare={handleShare}
                        isLoading={isLoading}
                    />
                </section>
            </div>
        </Layout>
    );
}