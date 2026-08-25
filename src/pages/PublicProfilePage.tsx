import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { address, type Address } from "@solana/kit";
import { useSolanaClient } from "@solana/react-hooks";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
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
          className="relative overflow-hidden rounded-2xl border border-border-low bg-elev-1 p-7 sm:p-9"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-[70px]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-edge-highlight to-transparent" />

          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="min-w-0 space-y-3">
              <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-light">
                <Wallet className="h-3 w-3" /> Escrow track record
              </p>
              <h1 className="break-all font-mono text-lg font-medium text-white sm:text-2xl">
                {walletAddress.slice(0, 6)}…{walletAddress.slice(-6)}
              </h1>
              <a
                href={explorerAddressUrl(walletAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted transition-colors duration-[--dur-micro] hover:text-primary-light"
              >
                View on Explorer <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex shrink-0 divide-x divide-border-low rounded-xl border border-border-low bg-background/50">
              {[
                {
                  label: "Delivered & paid",
                  value: settled.length,
                  tone: "text-state-done",
                },
                {
                  label: "Attested",
                  value: Object.keys(attested).length,
                  tone: "text-state-done",
                },
                {
                  label: "Client-side jobs",
                  value: asClient,
                  tone: "text-state-funded",
                },
              ].map((stat) => (
                <div key={stat.label} className="px-5 py-4 text-center sm:px-7">
                  <p
                    className={`font-heading text-3xl font-black leading-none tabular ${
                      stat.value > 0 ? stat.tone : "text-muted/40"
                    }`}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-1.5 text-[9px] font-bold uppercase tracking-widest text-muted">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {settled.length > 0 && (
            <p className="relative z-10 mt-7 border-t border-border-low pt-5 text-sm leading-relaxed text-muted">
              Every job below was funded into an escrow vault and released
              either by the client approving the delivery or by the freelancer
              claiming after the review window. It is derived from on-chain
              escrow state, not from anything the wallet declared. Note that the
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
            <div className="rounded-2xl border border-dashed border-border-low px-6 py-16 text-center">
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
            <ul className="divide-y divide-border-low overflow-hidden rounded-2xl border border-border-low bg-elev-1">
              {settled.map((job) => {
                const attestation = attested[job.address];
                return (
                  <li key={job.address}>
                    <a
                      href={`/job/${job.address}`}
                      className="group flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 transition-colors duration-[--dur-fast] hover:bg-elev-2"
                    >
                      <span className="font-heading text-xl font-black text-white tabular">
                        {formatUsdc(job.account.amount)}
                      </span>
                      <span className="text-xs text-muted">
                        {tokenLabel(job.account.mint)}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full border border-state-done/30 bg-state-done/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-state-done">
                        Released
                      </span>
                      {attestation ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-state-done/30 bg-state-done/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-state-done">
                          <BadgeCheck className="h-3 w-3" /> Attested
                        </span>
                      ) : (
                        <span className="rounded-full border border-border-low px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted/60">
                          Not attested
                        </span>
                      )}

                      <span className="ml-auto flex items-center gap-3 font-mono text-[11px] text-muted">
                        <span className="hidden sm:inline">
                          mint {job.account.mint.slice(0, 4)}…
                          {job.account.mint.slice(-4)}
                        </span>
                        <span>
                          {job.address.slice(0, 6)}…{job.address.slice(-6)}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-[--dur-micro] group-hover:translate-x-0.5 group-hover:text-primary-light" />
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
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
                to the freelancer, including nothing at all.
              </p>
            </div>
            <ul className="divide-y divide-border-low overflow-hidden rounded-2xl border border-border-low bg-background/40">
              {disputes.map((job) => (
                <li key={job.address}>
                  <a
                    href={`/job/${job.address}`}
                    className="group flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 transition-colors duration-[--dur-fast] hover:bg-elev-1"
                  >
                    <span className="inline-flex items-center gap-1 rounded-full border border-state-idle/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-state-idle">
                      Resolved
                    </span>
                    <span className="text-sm text-muted">
                      escrowed{" "}
                      <span className="text-foreground tabular">
                        {formatUsdc(job.account.amount)}
                      </span>{" "}
                      {tokenLabel(job.account.mint)} · split by the arbiter
                    </span>
                    <span className="ml-auto flex items-center gap-3 font-mono text-[11px] text-muted">
                      {job.address.slice(0, 6)}…{job.address.slice(-6)}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-[--dur-micro] group-hover:translate-x-0.5" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </motion.section>
        )}
      </motion.div>
    </Layout>
  );
}
