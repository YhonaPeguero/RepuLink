import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWalletConnection } from "@solana/react-hooks";
import { motion } from "framer-motion";
import { AlertCircle, Briefcase, Loader2, Send } from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { useEscrow } from "../hooks/useEscrow";
import { usdcToBaseUnits } from "../lib/usdc";

const DAY_SECS = 86_400;

const STAGE_LABEL: Record<string, string> = {
  preparing: "Preparing transaction...",
  sending: "Sending transaction...",
  confirming: "Confirming...",
  finalizing: "Finalizing (funds are moving)...",
};

export function CreateJobPage() {
  const { status } = useWalletConnection();
  const { createAndFundJob, stage, isBusy } = useEscrow();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    freelancer: "",
    amount: "",
    brief: "",
    reviewWindowDays: "7",
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const amount = usdcToBaseUnits(form.amount);
      if (amount <= 0n) throw new Error("Amount must be greater than zero");
      const { jobAddress } = await createAndFundJob({
        freelancer: form.freelancer,
        amount,
        brief: form.brief,
        reviewWindowSecs: Number(form.reviewWindowDays) * DAY_SECS,
      });
      navigate(`/job/${jobAddress}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const isFormValid =
    form.freelancer.trim() && form.amount.trim() && form.brief.trim();

  if (status !== "connected") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-6 py-32">
          <div className="mb-2 flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-primary/10">
            <AlertCircle className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg text-muted">
            Connect your wallet to create an escrow job.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl py-12"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">New escrow job</h1>
            <p className="text-sm text-muted">
              Funds are deposited in escrow the moment the job is created.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel space-y-5 rounded-2xl p-6">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-muted">
              Freelancer wallet
            </span>
            <input
              name="freelancer"
              value={form.freelancer}
              onChange={handleChange}
              placeholder="Freelancer address (devnet)"
              className="w-full rounded-xl border border-border-low bg-background/60 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-primary/50"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-muted">
              Amount (USDC)
            </span>
            <input
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="100.00"
              inputMode="decimal"
              className="w-full rounded-xl border border-border-low bg-background/60 px-4 py-2.5 text-sm outline-none transition focus:border-primary/50"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-muted">
              Brief (hashed on-chain as proof of the agreed terms)
            </span>
            <textarea
              name="brief"
              value={form.brief}
              onChange={handleChange}
              rows={4}
              placeholder="Scope, deliverables and terms of the job..."
              className="w-full rounded-xl border border-border-low bg-background/60 px-4 py-2.5 text-sm outline-none transition focus:border-primary/50"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-muted">
              Review window after delivery
            </span>
            <select
              name="reviewWindowDays"
              value={form.reviewWindowDays}
              onChange={handleChange}
              className="w-full rounded-xl border border-border-low bg-background/60 px-4 py-2.5 text-sm outline-none transition focus:border-primary/50"
            >
              {[1, 3, 7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  {d} day{d > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!isFormValid || isBusy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {STAGE_LABEL[stage] ?? "Working..."}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Create job & deposit funds
              </>
            )}
          </button>
        </form>
      </motion.div>
    </Layout>
  );
}
