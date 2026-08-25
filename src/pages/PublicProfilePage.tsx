import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { address, type Address } from "@solana/kit";
import { useSolanaClient } from "@solana/react-hooks";
import { motion, type Variants } from "framer-motion";
import {
  BadgeCheck,
  ExternalLink,
  Home,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { useMyJobs, type MyJob } from "../hooks/useMyJobs";
import { JobState } from "../generated/repulink/types/jobState";
import { formatUsdc } from "../lib/usdc";
import { tokenLabel } from "../lib/tokens";
import { STATE_META } from "../lib/job-state";
import { findJobAttestation, explorerAddressUrl } from "../lib/sas";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

/**
 * Solo un job `Released` prueba trabajo entregado y pagado: exige pasar por
 * `mark_delivered` y que el cliente (o el timeout) liberase el vault.
 *
 * `Resolved` NO cuenta. Una disputa puede abrirse desde `Funded`, es decir
 * antes de cualquier entrega, y `resolve_dispute` admite `freelancer_amount = 0`.
 * Contarlo como trabajo completado afirmaría algo que la cadena no respalda.
 */
function isDeliveredAndPaid(job: MyJob): boolean {
  return job.role === "freelancer" && job.account.state === JobState.Released;
}

/** Disputas resueltas donde esta wallet era el freelancer. Se muestran aparte:
 * son un desenlace, no reputación positiva. */
function isResolvedDispute(job: MyJob): boolean {
  return job.role === "freelancer" && job.account.state === JobState.Resolved;
}

export function PublicProfilePage() {
  const { wallet: walletParam } = useParams<{ wallet: string }>();
  const client = useSolanaClient();

  const walletAddress = (() => {
    try {
      return walletParam ? address(walletParam) : undefined;
    } catch {
      return undefined;
    }
  })();

  const { jobs, isLoading, error } = useMyJobs(walletAddress);
  const [attested, setAttested] = useState<Record<string, string>>({});

  const settled = useMemo(() => jobs.filter(isDeliveredAndPaid), [jobs]);
  const disputes = useMemo(() => jobs.filter(isResolvedDispute), [jobs]);
  const asClient = useMemo(
    () => jobs.filter((j) => j.role === "client").length,
    [jobs]
  );

  // Se consultan las atestaciones de los jobs pagados. Un fallo aquí no debe
  // vaciar el perfil: el historial on-chain sigue siendo válido sin SAS.
  useEffect(() => {
    if (settled.length === 0) {
      setAttested({});
      return;
    }
    let cancelled = false;
    void Promise.all(
      settled.map(async (job) => {
        const found = await findJobAttestation(
          client.runtime.rpc,
          job.address
        ).catch(() => null);
        return [job.address, found?.address] as const;
      })
    ).then((pairs) => {
      if (cancelled) return;
      setAttested(
        Object.fromEntries(
          pairs.filter((p): p is readonly [Address, Address] => Boolean(p[1]))
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, [client, settled]);

  if (!walletAddress) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-6 py-32 text-center">
          <ShieldAlert className="h-10 w-10 text-red-400" />
          <p className="text-muted">That is not a valid Solana address.</p>
          <a
            href="/"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20"
          >
            <Home className="h-4 w-4" /> Go to home
          </a>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto flex max-w-4xl flex-col gap-8" aria-busy="true">
          <div className="h-40 shimmer-skeleton rounded-3xl border border-white/5" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-36 shimmer-skeleton rounded-3xl border border-white/5"
              />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-4xl flex-col gap-10"
      >
        <motion.section
          variants={itemVariants}
          className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0A0A]/60 p-8 backdrop-blur-2xl sm:p-10"
        >
          <div className="absolute right-0 top-0 -z-10 h-64 w-64 rounded-full bg-primary/20 blur-[80px]" />

          <div className="relative z-10 flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-light">
                <Wallet className="h-3.5 w-3.5" /> Escrow track record
              </div>
              <h1 className="break-all font-mono text-xl font-bold text-white sm:text-2xl">
                {walletAddress.slice(0, 8)}…{walletAddress.slice(-8)}
              </h1>
              <a
                href={explorerAddressUrl(walletAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-primary"
              >
                View on Explorer <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Delivered & paid", value: settled.length },
                { label: "Attested", value: Object.keys(attested).length },
                { label: "Client-side jobs", value: asClient },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="mb-1 text-2xl font-black leading-none text-white sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {settled.length > 0 && (
            <p className="relative z-10 mt-6 border-t border-white/5 pt-5 text-sm text-muted">
              Every job below was funded into an escrow vault and released
              either by the client approving the delivery or by the freelancer
              claiming after the review window. It is derived from on-chain
              escrow state, not from anything the wallet declared — though the
              delivery itself is a hash the freelancer supplies, and any SPL
              token can be used, so read the amounts together with the mint.
            </p>
          )}
        </motion.section>

        {error && (
          <motion.div
            variants={itemVariants}
            role="alert"
            className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4 text-sm text-red-200"
          >
            <ShieldAlert className="h-5 w-5 text-red-400" />
            {error}
          </motion.div>
        )}

        <motion.section variants={itemVariants} className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Completed work
          </h2>

          {settled.length === 0 ? (
            <div className="rounded-3xl glass-panel px-6 py-16 text-center">
              <p className="text-base font-bold text-foreground">
                No completed jobs yet
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                This wallet has not been paid through a RepuLink escrow yet.
                Everything on this page is derived from jobs that were funded
                and released on-chain, not from self-declared badges.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {settled.map((job) => {
                const meta = STATE_META[job.account.state];
                const attestation = attested[job.address];
                return (
                  <a
                    key={job.address}
                    href={`/job/${job.address}`}
                    className="group space-y-2 rounded-2xl glass-panel p-5 transition hover:-translate-y-0.5 hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border bg-background/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                      {attestation && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-green-400/30 bg-green-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-400">
                          <BadgeCheck className="h-3 w-3" /> Attested
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {formatUsdc(job.account.amount)}{" "}
                      <span className="text-xs font-normal text-muted">
                        {tokenLabel(job.account.mint)}
                      </span>
                    </p>
                    <p className="truncate font-mono text-[10px] text-muted/60">
                      mint {job.account.mint.slice(0, 6)}…
                      {job.account.mint.slice(-6)}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted">
                      {job.address.slice(0, 10)}…{job.address.slice(-10)}
                    </p>
                  </a>
                );
              })}
            </div>
          )}
        </motion.section>

        {disputes.length > 0 && (
          <motion.section variants={itemVariants} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Resolved disputes
              </h2>
              <p className="max-w-2xl text-sm text-muted">
                Agreements that ended in arbitration. These are listed for
                transparency, not counted as completed work: a dispute can be
                opened before any delivery, and the arbiter may award any share
                — including nothing — to the freelancer.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {disputes.map((job) => {
                const meta = STATE_META[job.account.state];
                return (
                  <a
                    key={job.address}
                    href={`/job/${job.address}`}
                    className="space-y-2 rounded-2xl border border-border-low bg-background/40 p-5 transition hover:border-primary/40"
                  >
                    <span
                      className={`inline-block rounded-full border bg-background/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                    <p className="text-sm text-muted">
                      escrowed {formatUsdc(job.account.amount)}{" "}
                      {tokenLabel(job.account.mint)} · split by the arbiter
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted">
                      {job.address.slice(0, 10)}…{job.address.slice(-10)}
                    </p>
                  </a>
                );
              })}
            </div>
          </motion.section>
        )}
      </motion.div>
    </Layout>
  );
}
