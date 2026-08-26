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
import { STATE_META, TERMINAL_STATES } from "../lib/job-state";
import { LifecycleRail } from "../components/job/LifecycleRail";
import { PartyAvatar } from "../components/brand/PartyAvatar";
import { useCompanion } from "../components/companion/useCompanion";
import {
  findJobAttestation,
  explorerAddressUrl,
  type JobAttestation,
} from "../lib/sas";
import { tokenLabel } from "../lib/tokens";
import { usdcToBaseUnits } from "../lib/usdc";

const STAGE_LABEL: Record<string, string> = {
  preparing: "Preparing transaction...",
  sending: "Sending transaction...",
  confirming: "Confirming...",
  finalizing: "Finalizing (funds are moving)...",
};

function ts(seconds: bigint): string {
  if (seconds === 0n) return "—";
  // Compacto a propósito: en la columna de tiempo las tres marcas suelen caer
  // el mismo día, y repetir la fecha completa tres veces es ruido.
  return new Date(Number(seconds) * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const { setJob: setCompanionJob } = useCompanion();

  const [job, setJob] = useState<Job | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deliveryRef, setDeliveryRef] = useState("");
  const [freelancerAmount, setFreelancerAmount] = useState("");
  const [attestation, setAttestation] = useState<JobAttestation | null>(null);
  const [isCheckingAttestation, setIsCheckingAttestation] = useState(false);

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

  // La atestación solo existe una vez el job liquidó; se consulta aparte para
  // que un fallo de SAS nunca impida renderizar el job.
  useEffect(() => {
    if (!jobAddress || !job || !TERMINAL_STATES.has(job.state)) {
      setAttestation(null);
      return;
    }
    let cancelled = false;
    setIsCheckingAttestation(true);
    findJobAttestation(client.runtime.rpc, jobAddress)
      .then((found) => {
        if (!cancelled) setAttestation(found);
      })
      .catch(() => {
        if (!cancelled) setAttestation(null);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingAttestation(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, jobAddress, job]);

  // El companion lee el estado del acuerdo desde aquí, sin consultar la red por
  // su cuenta: así nunca puede mostrar un estado distinto al de esta página.
  useEffect(() => {
    setCompanionJob(
      job ? { state: job.state, freelancer: job.freelancer } : null
    );
    return () => setCompanionJob(null);
  }, [job, setCompanionJob]);

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

  // Esqueleto con la forma real de la página: al llegar los datos nada salta
  // de sitio, que es lo que hace que una carga se perciba lenta.
  if (isLoading && !job) {
    return (
      <Layout>
        <div className="mx-auto max-w-4xl space-y-5" aria-busy="true">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="shimmer-skeleton h-2.5 w-20 rounded" />
              <div className="shimmer-skeleton h-4 w-56 rounded" />
            </div>
            <div className="shimmer-skeleton h-6 w-24 rounded-full" />
          </div>
          <div className="shimmer-skeleton h-[104px] rounded-2xl" />
          <div className="shimmer-skeleton h-[176px] rounded-2xl" />
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
        className="mx-auto max-w-4xl space-y-5"
      >
        {/* Cabecera */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              Agreement
            </p>
            <a
              href={`https://explorer.solana.com/address/${jobAddress}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 font-mono text-sm text-white transition-colors duration-[--dur-micro] hover:text-primary-light"
            >
              {jobAddress.slice(0, 10)}…{jobAddress.slice(-10)}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border bg-background/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${meta.className}`}
            >
              {meta.label}
            </span>
            <button
              onClick={refetch}
              title="Refresh"
              aria-label="Refresh job"
              className="rounded-lg p-2 text-muted transition-colors duration-[--dur-micro] hover:text-foreground"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </header>

        {/* Dónde está este acuerdo — la firma del producto */}
        <section className="rounded-2xl border border-border-low bg-elev-1 px-6 py-7 sm:px-8">
          <LifecycleRail
            state={job.state}
            progress={{ fundedAt: job.fundedAt, deliveredAt: job.deliveredAt }}
          />
        </section>

        {/* El dinero, primero */}
        <section className="grid gap-px overflow-hidden rounded-2xl border border-border-low bg-border-low sm:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1fr]">
          <div className="bg-background p-6 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
              In escrow
            </p>
            <p className="mt-2 font-heading text-4xl font-black tracking-tight text-white tabular">
              {formatUsdc(job.amount)}
              <span className="ml-2 align-middle text-sm font-medium text-muted">
                {tokenLabel(job.mint)}
              </span>
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span>
                fee{" "}
                <span className="text-foreground tabular">
                  {job.feeBps / 100}%
                </span>
              </span>
              <a
                href={explorerAddressUrl(job.mint)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono transition-colors duration-[--dur-micro] hover:text-primary-light"
                title="Token mint used to settle this job"
              >
                mint {job.mint.slice(0, 4)}…{job.mint.slice(-4)}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>

          <div className="space-y-3 bg-background p-6 sm:p-7">
            {[
              { role: "Client", addr: job.client, you: isClient, href: null },
              {
                role: "Freelancer",
                addr: job.freelancer,
                you: isFreelancer,
                href: `/profile/${job.freelancer}`,
              },
              {
                role: "Arbiter",
                addr: job.arbiter,
                you: isArbiter,
                href: null,
              },
            ].map(({ role, addr, you, href }) => (
              <div
                key={role}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                  <PartyAvatar seed={addr} size={22} />
                  {role}
                </span>
                <span className="flex items-center gap-1.5">
                  {href ? (
                    <a
                      href={href}
                      className="font-mono text-xs text-foreground underline decoration-dotted underline-offset-2 transition-colors duration-[--dur-micro] hover:text-primary-light"
                      title="Public escrow track record"
                    >
                      {addr.slice(0, 4)}…{addr.slice(-4)}
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-foreground">
                      {addr.slice(0, 4)}…{addr.slice(-4)}
                    </span>
                  )}
                  {you && (
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-light">
                      you
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-background p-6 sm:p-7">
            <ol className="space-y-2.5">
              {[
                { label: "Created", at: job.createdAt },
                { label: "Funded", at: job.fundedAt },
                { label: "Delivered", at: job.deliveredAt },
              ].map(({ label, at }) => (
                <li
                  key={label}
                  className={`flex items-baseline justify-between gap-3 ${
                    at === 0n ? "opacity-35" : ""
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    {label}
                  </span>
                  <span className="font-mono text-[11px] text-foreground tabular">
                    {ts(at)}
                  </span>
                </li>
              ))}
            </ol>
            {countdown && (
              <p className="mt-4 flex items-start gap-1.5 border-t border-border-low pt-4 text-[11px] leading-snug text-state-active">
                <Clock className="mt-px h-3 w-3 shrink-0" />
                {countdown === "elapsed"
                  ? "Review window elapsed. The freelancer can claim the payout"
                  : `Review window: ${countdown} left`}
              </p>
            )}
          </div>
        </section>

        {/* Cierre del ciclo: qué queda del acuerdo una vez liquidado */}
        {TERMINAL_STATES.has(job.state) && (
          <div className="space-y-3 rounded-2xl border border-green-400/25 bg-green-400/[0.06] p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">
                  {job.state === JobState.Released
                    ? "Payment released"
                    : job.state === JobState.Resolved
                      ? "Dispute resolved and funds split"
                      : "Refunded to the client"}
                </p>
                <p className="text-sm text-muted">
                  {job.state === JobState.Refunded
                    ? "The full amount went back to the client with no fee. A cancelled agreement is not work history."
                    : job.state === JobState.Resolved
                      ? "An arbiter split the vault and the outcome is final on-chain. This is a transparent dispute outcome, not completed work: a dispute can be opened before any delivery, and the arbiter may award the freelancer nothing."
                      : "The vault is empty and the outcome is final on-chain. A delivered and released agreement like this one is what a verifiable track record is built from."}
                </p>
              </div>
            </div>

            {job.state === JobState.Released && (
              <div className="rounded-xl border border-border-low bg-background/40 p-4">
                {isCheckingAttestation ? (
                  <p className="flex items-center gap-2 text-xs text-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Looking for the attestation…
                  </p>
                ) : attestation ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-green-400">
                      Attested · Solana Attestation Service
                    </p>
                    <p className="text-xs text-muted">
                      A credential signed by RepuLink records this outcome
                      against the freelancer&apos;s wallet, in a registry
                      RepuLink does not own.
                    </p>
                    <a
                      href={explorerAddressUrl(attestation.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-primary-light underline"
                    >
                      {attestation.address.slice(0, 10)}…
                      {attestation.address.slice(-10)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-[10px] text-muted/70">
                      schema v{attestation.schemaVersion}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      Not attested yet
                    </p>
                    <p className="text-xs text-muted">
                      Attestations are issued by RepuLink after a job is
                      released, and today that step is run manually. It is not
                      part of the release transaction, so a released job may
                      stay unattested.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
          <p className="rounded-2xl border border-dashed border-border-low px-6 py-8 text-center text-sm text-muted">
            Connect your wallet to act on this agreement.
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
                  placeholder="Delivery reference (URL or description), hashed on-chain"
                  className="w-full rounded-xl border border-border-low bg-background/60 px-4 py-2.5 text-sm outline-none transition focus:border-primary/50"
                />
                <button
                  disabled={escrow.isBusy || !deliveryRef.trim()}
                  onClick={() =>
                    run(() => escrow.markDelivered(jobAddress, deliveryRef))
                  }
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
                title={
                  countdown !== "elapsed"
                    ? "Available when the review window elapses"
                    : undefined
                }
              >
                <Clock className="h-4 w-4" /> Claim payout (review window
                elapsed)
              </button>
            )}

            {/* Client: fondear un job Created huérfano / cancelar */}
            {isClient &&
              (job.state === JobState.Created ||
                job.state === JobState.Funded) && (
                <button
                  disabled={escrow.isBusy}
                  onClick={() => run(() => escrow.cancelRefund(jobAddress))}
                  className={`${btn} w-full glass-panel glass-panel-hover text-muted hover:text-foreground`}
                >
                  <Undo2 className="h-4 w-4" />
                  {job.state === JobState.Funded
                    ? "Cancel & refund"
                    : "Cancel job"}
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
                  Amount for the freelancer (0 – {formatUsdc(job.amount)}{" "}
                  {tokenLabel(job.mint)}); the remainder returns to the client.
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
                        usdcToBaseUnits(freelancerAmount)
                      )
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
