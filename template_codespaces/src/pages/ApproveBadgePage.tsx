import { useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { Layout } from "../components/layout/Layout";
import { useRepulink } from "../hooks/useRepulink";
import { type Address } from "@solana/kit";

export function ApproveBadgePage() {
  const { status, connectors, connect } = useWalletConnection();
  const { approveBadge, rejectBadge, isSending } = useRepulink();

  // Parse freelancer address and badge index from URL
  const pathParts = window.location.pathname.split("/");
  const freelancerAddress = pathParts[2] as Address;
  const badgeIndex = parseInt(pathParts[3] ?? "0", 10);

  const [form, setForm] = useState({
    clientLinkedin: "",
    clientTwitter: "",
    clientEmailReviewer: "",
  });
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApprove = async () => {
    try {
      setTxStatus("Submitting approval...");
      const sig = await approveBadge(freelancerAddress, badgeIndex, form);
      setTxSignature(sig ?? null);
      setTxStatus("Badge approved successfully!");
      setIsDone(true);
    } catch (err: any) {
      setTxStatus(`Error: ${err.message}`);
    }
  };

  const handleReject = async () => {
    try {
      setTxStatus("Submitting rejection...");
      const sig = await rejectBadge(freelancerAddress, badgeIndex);
      setTxSignature(sig ?? null);
      setTxStatus("Badge rejected.");
      setIsDone(true);
    } catch (err: any) {
      setTxStatus(`Error: ${err.message}`);
    }
  };

  // ── Done state ─────────────────────────────────────────────────────────
  if (isDone) {
    return (
      <Layout>
        <div className="mx-auto max-w-md flex flex-col items-center gap-6 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <span className="text-2xl">✓</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">
              {txStatus}
            </h1>
            {txSignature && (
              <a
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted underline underline-offset-2 hover:text-foreground transition"
              >
                View on Solana Explorer →
              </a>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // ── Not connected — ask to connect ────────────────────────────────────
  if (status !== "connected") {
    return (
      <Layout>
        <div className="mx-auto max-w-md flex flex-col items-center gap-6 py-16 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              You've been asked to verify a badge
            </h1>
            <p className="text-sm text-muted">
              Sign in to approve or reject this reputation badge. No crypto
              experience needed — we'll create a secure wallet for you.
            </p>
          </div>

          <div className="w-full space-y-3">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect(connector.id)}
                disabled={status === "connecting"}
                className="w-full flex items-center justify-between rounded-xl border border-border-low bg-card px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50"
              >
                <span>{connector.name}</span>
                <span className="h-2 w-2 rounded-full bg-border-low" />
              </button>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // ── Connected — show approval form ───────────────────────────────────
  return (
    <Layout>
      <div className="mx-auto max-w-md flex flex-col gap-8">

        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Verify this badge
          </h1>
          <p className="text-sm text-muted">
            By approving, you confirm that you worked with this freelancer and
            vouch for their work. Your identity will be stored on-chain.
          </p>
        </div>

        {/* Identity form */}
        <div className="rounded-2xl border border-border-low bg-card p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Your identity (optional but recommended)
          </p>

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="clientEmailReviewer"
            >
              Email
            </label>
            <input
              id="clientEmailReviewer"
              name="clientEmailReviewer"
              type="email"
              placeholder="you@company.com"
              value={form.clientEmailReviewer}
              onChange={handleChange}
              className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-foreground/30"
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="clientLinkedin"
            >
              LinkedIn
            </label>
            <input
              id="clientLinkedin"
              name="clientLinkedin"
              type="text"
              placeholder="linkedin.com/in/yourname"
              value={form.clientLinkedin}
              onChange={handleChange}
              className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-foreground/30"
            />
          </div>

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="clientTwitter"
            >
              Twitter / X
            </label>
            <input
              id="clientTwitter"
              name="clientTwitter"
              type="text"
              placeholder="@yourhandle"
              value={form.clientTwitter}
              onChange={handleChange}
              className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-foreground/30"
            />
          </div>
        </div>

        {/* Status */}
        {txStatus && (
          <div className="rounded-lg border border-border-low bg-cream/50 px-4 py-3 text-sm">
            {txStatus}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={isSending}
            className="flex-1 rounded-xl border border-border-low bg-card px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50"
          >
            {isSending ? "..." : "Reject"}
          </button>
          <button
            onClick={handleApprove}
            disabled={isSending}
            className="flex-2 flex-1 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {isSending ? "Confirming..." : "Approve badge"}
          </button>
        </div>

        <p className="text-center text-xs text-muted">
          This action is permanent and recorded on the Solana blockchain.
        </p>
      </div>
    </Layout>
  );
}