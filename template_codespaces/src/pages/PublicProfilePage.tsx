import { useEffect, useState } from "react";
import { Layout } from "../components/layout/Layout";
import { BadgeList } from "../components/badge/BadgeList";
import { useOnChainData } from "../hooks/useOnChainData";
import { type Address } from "@solana/kit";

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
        <div className="flex flex-col gap-8">
          <div className="h-32 animate-pulse rounded-2xl border border-border-low bg-card" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-border-low bg-card"
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
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-base font-medium text-foreground">
            Profile not found
          </p>
          <p className="text-sm text-muted">
            This wallet doesn't have a RepuLink profile yet.
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
        {/* Profile header */}
        <section className="rounded-2xl border border-border-low bg-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cream text-xl font-semibold text-foreground">
              {profile.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <p className="text-xl font-semibold text-foreground">
                @{profile.username}
              </p>
              <p className="font-mono text-xs text-muted">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "Total badges", value: badges.length },
              { label: "Verified", value: approvedBadges.length },
              {
                label: "Verification rate",
                value:
                  badges.length > 0
                    ? Math.round(
                        (approvedBadges.length / badges.length) * 100
                      ) + "%"
                    : "—",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border-low bg-cream/30 p-4 space-y-1"
              >
                <p className="text-xs uppercase tracking-wide text-muted">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="flex w-fit items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <p className="text-xs font-medium text-green-700">
              Verified on Solana devnet
            </p>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Badges */}
        <section className="space-y-4">
          <p className="text-sm font-semibold text-foreground">
            Reputation badges
          </p>
          <BadgeList badges={badges} isLoading={false} />
        </section>
      </div>
    </Layout>
  );
}