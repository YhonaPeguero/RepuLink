import { useWalletConnection } from "@solana/react-hooks";
import { type Address } from "@solana/kit";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Plus, Inbox, UserRound } from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { useMyJobs } from "../hooks/useMyJobs";
import { JobCard } from "../components/job/JobCard";
import { DEMO_JOBS } from "../lib/demo-jobs";

export function DashboardPage() {
  const { wallet, status } = useWalletConnection();
  const walletAddress = wallet?.account.address as Address | undefined;
  const { jobs, isLoading, error, refetch } = useMyJobs(walletAddress);

  if (status !== "connected") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-6 py-32">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <AlertCircle className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg text-muted">
            Connect your wallet to see your agreements.
          </p>
          <a
            href="/"
            className="group flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-bold text-background transition-transform hover:scale-105"
          >
            Go to home{" "}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-10"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              My agreements
            </h1>
            <p className="text-base text-muted">
              Every agreement where you are the payer or the worker.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <a
              href={`/profile/${walletAddress}`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-border-low bg-elev-1 px-4 py-2.5 text-sm font-semibold transition-all duration-[--dur-micro] hover:-translate-y-px hover:bg-elev-2"
            >
              <UserRound className="h-4 w-4" /> My public profile
            </a>
            <a
              href="/job/create"
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background transition-transform hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <Plus className="relative z-10 h-4 w-4" />
              <span className="relative z-10">New agreement</span>
            </a>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
            <button
              onClick={() => void refetch()}
              className="ml-auto underline hover:text-red-200"
            >
              Retry
            </button>
          </div>
        )}

        <section className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="shimmer-skeleton h-[124px] rounded-2xl"
                />
              ))}
            </div>
          ) : jobs.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {jobs.map((job) => (
                <JobCard key={job.address} job={job} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border-low px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                <Inbox className="h-6 w-6 text-muted" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-foreground">
                  No agreements yet
                </p>
                <p className="max-w-sm text-sm text-muted">
                  Start an agreement and the payment is locked in a
                  program-owned vault before any work starts.
                </p>
              </div>
              <a
                href="/job/create"
                className="mt-2 flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white transition-transform duration-[--dur-micro] hover:-translate-y-px"
              >
                <Plus className="h-4 w-4" /> Create your first agreement
              </a>
            </div>
          )}
        </section>

        {/* Jobs de demo: permiten recorrer el ciclo completo sin ser parte de
            ninguno de ellos. Solo se listan en devnet. */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">
              Public agreements on devnet
            </h2>
            <p className="text-sm text-muted">
              Five public jobs seeded on devnet, covering the key states of the
              lifecycle. Anyone can open them read-only.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_JOBS.map((demo) => (
              <a
                key={demo.address}
                href={`/job/${demo.address}`}
                className="group flex flex-col gap-1 rounded-xl border border-border-low bg-elev-1 p-4 transition-all duration-[--dur-fast] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-elev-2"
              >
                <span className="text-sm font-bold text-foreground">
                  {demo.label}
                </span>
                <span className="text-xs text-muted">{demo.note}</span>
                <span className="mt-1 truncate font-mono text-[10px] text-muted/70">
                  {demo.address}
                </span>
              </a>
            ))}
          </div>
        </section>
      </motion.div>
    </Layout>
  );
}
