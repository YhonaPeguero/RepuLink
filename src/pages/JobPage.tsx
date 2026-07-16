import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useSolanaClient } from "@solana/react-hooks";
import { address, type Address } from "@solana/kit";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gavel,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { fetchMaybeJob, type Job } from "../generated/repulink/accounts/job";
import { JobState } from "../generated/repulink/types/jobState";
import { useEscrow } from "../hooks/useEscrow";
import { formatUsdc } from "../lib/usdc";
import { usdcToBaseUnits } from "../lib/usdc";

const STATE_META: Record<JobState, { label: string; className: string }> = {
  [JobState.Created]: { label: "Created (unfunded)", className: "text-muted border-border-strong" },
  [JobState.Funded]: { label: "Funded", className: "text-secondary border-secondary/40" },
  [JobState.Delivered]: { label: "Delivered", className: "text-accent-gold border-accent-gold/40" },
  [JobState.Released]: { label: "Released", className: "text-green-400 border-green-400/40" },
  [JobState.Refunded]: { label: "Refunded", className: "text-muted border-border-strong" },
  [JobState.Disputed]: { label: "Disputed", className: "text-red-400 border-red-400/40" },
  [JobState.Resolved]: { label: "Resolved", className: "text-green-400 border-green-400/40" },
};

const STAGE_LABEL: Record<string, string> = {
  preparing: "Preparing transaction...",
  sending: "Sending transaction...",
  confirming: "Confirming...",
  finalizing: "Finalizing (funds are moving)...",
};

function ts(seconds: bigint): string {
  return seconds === 0n ? "—" : new Date(Number(seconds) * 1000).toLocaleString();
}

function useCountdown(deadlineSecs: number | null): string | null {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    if (deadlineSecs === null) return;
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [deadlineSecs]);
  if (deadlineSecs === null) return null;
  const left = deadlineSecs - now;
  if (left <= 0) return "elapsed";
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;
}

export function JobPage() {
  const { jobAddress: jobAddressParam } = useParams<{ jobAddress: string }>();
  const client = useSolanaClient();
  const escrow = useEscrow();

  const [job, setJob] = useState<Job | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deliveryRef, setDeliveryRef] = useState("");
  const [freelancerAmount, setFreelancerAmount] = useState("");

  const jobAddress = useMemo<Address | null>(() => {
    try {
      return jobAddressParam ? address(jobAddressParam) : null;
    } catch {
      return null;
    }
  }, [jobAddressParam]);

  const refetch = useCallback(async () => {
    if (!jobAddress) {
      setLoadError("Invalid job address");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const maybe = await fetchMaybeJob(client.runtime.rpc, jobAddress);
      setJob(maybe.exists ? maybe.data : null);
      if (!maybe.exists) setLoadError("No job found at this address");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [client, jobAddress]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const reviewDeadline =
    job && job.state === JobState.Delivered
      ? Number(job.deliveredAt) + job.reviewWindowSecs
      : null;
  const countdown = useCountdown(reviewDeadline);

  const me = escrow.walletAddress;
  const isClient = !!me && !!job && me === job.client;
  const isFreelancer = !!me && !!job && me === job.freelancer;
  // Autorización del árbitro SIEMPRE desde el Job (no desde Config: una
  // rotación de Config no debe romper disputas existentes).
  const isArbiter = !!me && !!job && me === job.arbiter;

  const run = async (action: () => Promise<string>) => {
    setActionError(null);
    setLastSignature(null);
    try {
      const sig = await action();
      setLastSignature(sig);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      await refetch();
    }
  };

  if (!jobAddress || loadError) {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-4 py-32">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-muted">{loadError ?? "Invalid job address"}</p>
        </div>
      </Layout>
    );
  }

  if (isLoading && !job) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!job) return null;

  const meta = STATE_META[job.state];
  const canDispute =
    (isClient || isFreelancer) &&
    (job.state === JobState.Funded || job.state === JobState.Delivered);

  const btn =
    "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50";

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl space-y-6 py-12"
      >
        {/* Cabecera */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold">Escrow job</h1>
            <a
              href={`https://explorer.solana.com/address/${jobAddress}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs text-muted transition hover:text-primary"
            >
              {jobAddress.slice(0, 8)}...{jobAddress.slice(-8)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border bg-background/60 px-3 py-1 text-xs font-bold uppercase tracking-wider ${meta.className}`}
            >
              {meta.label}
            </span>
            <button
              onClick={refetch}
              title="Refresh"
              className="rounded-xl p-2 text-muted transition hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Datos */}
        <div className="glass-panel grid grid-cols-1 gap-4 rounded-2xl p-6 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Amount</p>
            <p className="text-xl font-bold">
              {formatUsdc(job.amount)} <span className="text-sm text-muted">USDC</span>
            </p>
            <p className="text-xs text-muted">fee {job.feeBps / 100}%</p>
          </div>
          <div className="space-y-1 font-mono text-xs">
            <p>
              <span className="text-muted">client </span>
              {job.client.slice(0, 6)}...{job.client.slice(-6)}
              {isClient && <span className="ml-1 text-primary">(you)</span>}
            </p>
            <p>
              <span className="text-muted">freelancer </span>
              {job.freelancer.slice(0, 6)}...{job.freelancer.slice(-6)}
              {isFreelancer && <span className="ml-1 text-primary">(you)</span>}
            </p>
            <p>
              <span className="text-muted">arbiter </span>
              {job.arbiter.slice(0, 6)}...{job.arbiter.slice(-6)}
              {isArbiter && <span className="ml-1 text-primary">(you)</span>}
            </p>
          </div>
          <div className="space-y-1 text-xs text-muted sm:col-span-2">
            <p>created {ts(job.createdAt)}</p>
            <p>funded {ts(job.fundedAt)}</p>
            <p>delivered {ts(job.deliveredAt)}</p>
            {countdown && (
              <p className="flex items-center gap-1 text-accent-gold">
                <Clock className="h-3.5 w-3.5" />
                review window: {countdown === "elapsed" ? "elapsed — freelancer can claim" : `${countdown} left`}
              </p>
            )}
          </div>
        </div>

        {/* Feedback */}
        {escrow.isBusy && (
          <p className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {STAGE_LABEL[escrow.stage] ?? "Working..."}
          </p>
        )}
        {actionError && (
          <p className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {actionError}
          </p>
        )}
        {lastSignature && (
          <p className="flex items-center gap-2 rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm text-green-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Done.
            <a
              href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline"
            >
              View transaction <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        )}

        {/* Acciones por rol y estado */}
        {!escrow.isConnected ? (
          <p className="text-center text-sm text-muted">
            Connect your wallet to act on this job.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Freelancer: entregar */}
            {isFreelancer && job.state === JobState.Funded && (
              <div className="glass-panel space-y-3 rounded-2xl p-5">
                <p className="text-sm font-semibold">Mark as delivered</p>
                <input
                  value={deliveryRef}
                  onChange={(e) => setDeliveryRef(e.target.value)}
                  placeholder="Delivery reference (URL or description) — hashed on-chain"
                  className="w-full rounded-xl border border-border-low bg-background/60 px-4 py-2.5 text-sm outline-none transition focus:border-primary/50"
                />
                <button
                  disabled={escrow.isBusy || !deliveryRef.trim()}
                  onClick={() => run(() => escrow.markDelivered(jobAddress, deliveryRef))}
                  className={`${btn} w-full bg-brand-gradient text-white hover:opacity-90`}
                >
                  <PackageCheck className="h-4 w-4" /> Deliver work
                </button>
              </div>
            )}

            {/* Client: aprobar */}
            {isClient && job.state === JobState.Delivered && (
              <button
                disabled={escrow.isBusy}
                onClick={() => run(() => escrow.approveRelease(jobAddress))}
                className={`${btn} w-full bg-brand-gradient text-white hover:opacity-90`}
              >
                <CheckCircle2 className="h-4 w-4" /> Approve & release payment
              </button>
            )}

            {/* Freelancer: reclamar por timeout */}
            {isFreelancer && job.state === JobState.Delivered && (
              <button
                disabled={escrow.isBusy || countdown !== "elapsed"}
                onClick={() => run(() => escrow.claimTimeout(jobAddress))}
                className={`${btn} w-full glass-panel glass-panel-hover`}
                title={countdown !== "elapsed" ? "Available when the review window elapses" : undefined}
              >
                <Clock className="h-4 w-4" /> Claim payout (review window elapsed)
              </button>
            )}

            {/* Client: fondear un job Created huérfano / cancelar */}
            {isClient &&
              (job.state === JobState.Created || job.state === JobState.Funded) && (
                <button
                  disabled={escrow.isBusy}
                  onClick={() => run(() => escrow.cancelRefund(jobAddress))}
                  className={`${btn} w-full glass-panel glass-panel-hover text-muted hover:text-foreground`}
                >
                  <Undo2 className="h-4 w-4" />
                  {job.state === JobState.Funded ? "Cancel & refund" : "Cancel job"}
                </button>
              )}

            {/* Disputa */}
            {canDispute && (
              <button
                disabled={escrow.isBusy}
                onClick={() => run(() => escrow.openDispute(jobAddress))}
                className={`${btn} w-full glass-panel glass-panel-hover text-red-300`}
              >
                <ShieldAlert className="h-4 w-4" /> Open dispute
              </button>
            )}

            {/* Árbitro: resolver */}
            {isArbiter && job.state === JobState.Disputed && (
              <div className="glass-panel space-y-3 rounded-2xl p-5">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Gavel className="h-4 w-4 text-accent-gold" /> Resolve dispute
                </p>
                <p className="text-xs text-muted">
                  Amount for the freelancer (0 – {formatUsdc(job.amount)} USDC); the
                  remainder returns to the client.
                </p>
                <input
                  value={freelancerAmount}
                  onChange={(e) => setFreelancerAmount(e.target.value)}
                  placeholder="e.g. 50.00"
                  inputMode="decimal"
                  className="w-full rounded-xl border border-border-low bg-background/60 px-4 py-2.5 text-sm outline-none transition focus:border-primary/50"
                />
                <button
                  disabled={escrow.isBusy || !freelancerAmount.trim()}
                  onClick={() =>
                    run(() =>
                      escrow.resolveDispute(
                        jobAddress,
                        usdcToBaseUnits(freelancerAmount),
                      ),
                    )
                  }
                  className={`${btn} w-full bg-brand-gradient text-white hover:opacity-90`}
                >
                  Resolve & split funds
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
