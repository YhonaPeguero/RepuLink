import { useState, useEffect } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { Layout } from "../components/layout/Layout";
import { BadgeList } from "../components/badge/BadgeList";
import { useRepulink, deriveProfilePda, deriveBadgePda } from "../hooks/useRepulink";
import { type BadgeWithPda, type FreelancerProfile } from "../types/repulink";
import { type Address } from "@solana/kit";
import { REPULINK_PROGRAM_ADDRESS } from "../generated/repulink";

// ── Minimal anchor-compatible account fetcher ──────────────────────────────
async function fetchProfileAccount(
  rpcEndpoint: string,
  pda: Address
): Promise<FreelancerProfile | null> {
  const response = await fetch(rpcEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAccountInfo",
      params: [pda, { encoding: "base64" }],
    }),
  });
  const json = await response.json();
  if (!json.result?.value) return null;
  return json.result.value;
}

export function DashboardPage() {
  const { wallet, status } = useWalletConnection();
  const { initializeProfile, createBadge, isSending } = useRepulink();

  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [badges, setBadges] = useState<BadgeWithPda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const walletAddress = wallet?.account.address as Address | undefined;

  // ── Share approval link ──────────────────────────────────────────────────
  const handleShare = (badge: BadgeWithPda) => {
    const url = `${window.location.origin}/approve/${walletAddress}/${badge.account.badgeIndex}`;
    navigator.clipboard.writeText(url);
    setTxStatus("Approval link copied to clipboard!");
    setTimeout(() => setTxStatus(null), 3000);
  };

  // ── Initialize profile ───────────────────────────────────────────────────
  const handleInitializeProfile = async () => {
    if (!username.trim()) return;
    try {
      setTxStatus("Creating profile...");
      await initializeProfile(username.trim());
      setTxStatus("Profile created!");
      window.location.reload();
    } catch (err: any) {
      setTxStatus(`Error: ${err.message}`);
    }
  };

  if (status !== "connected") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-base text-muted">Connect your wallet to access your dashboard.</p>
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

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted">
              Manage your reputation badges
            </p>
          </div>
          <button
            onClick={() => window.location.href = "/badge/create"}
            className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
          >
            + New badge
          </button>
        </div>

        {/* Profile section */}
        <section className="rounded-2xl border border-border-low bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Your profile</p>
            {walletAddress && (
              <a
                href={`/${walletAddress}`}
                className="text-xs text-muted underline underline-offset-2 hover:text-foreground transition"
              >
                View public profile →
              </a>
            )}
          </div>

          {profile ? (
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cream text-lg font-semibold text-foreground">
                {profile.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-medium text-foreground">
                  @{profile.username}
                </p>
                <p className="text-xs text-muted">
                  {profile.badgeCount} badge{profile.badgeCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                You don't have a profile yet. Create one to start collecting badges.
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
                  {isSending ? "Creating..." : "Create profile"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Status message */}
        {txStatus && (
          <div className="rounded-lg border border-border-low bg-cream/50 px-4 py-3 text-sm text-foreground">
            {txStatus}
          </div>
        )}

        {/* Badges */}
        <section className="space-y-4">
          <p className="text-sm font-semibold text-foreground">Your badges</p>
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