import { useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { Layout } from "../components/layout/Layout";
import { useRepulink } from "../hooks/useRepulink";

export function CreateBadgePage() {
  const { status } = useWalletConnection();
  const { createBadge, isSending } = useRepulink();

  const [form, setForm] = useState({
    title: "",
    description: "",
    clientName: "",
    clientEmail: "",
  });
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTxStatus("Creating badge...");
      setTxSignature(null);

      // Badge index 0 for now — DashboardPage will pass the real index
      const sig = await createBadge(form, 0);
      setTxSignature(sig ?? null);
      setTxStatus("Badge created successfully!");
      setForm({ title: "", description: "", clientName: "", clientEmail: "" });
    } catch (err: any) {
      setTxStatus(`Error: ${err.message}`);
    }
  };

  const isFormValid =
    form.title.trim() &&
    form.description.trim() &&
    form.clientName.trim() &&
    form.clientEmail.trim();

  if (status !== "connected") {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-base text-muted">
            Connect your wallet to create a badge.
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
      <div className="mx-auto max-w-xl flex flex-col gap-8">

        {/* Header */}
        <div className="space-y-1">
          <a
            href="/dashboard"
            className="text-xs text-muted hover:text-foreground transition underline underline-offset-2"
          >
            ← Back to dashboard
          </a>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create a badge
          </h1>
          <p className="text-sm text-muted">
            Describe the project and the client who will verify it.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Project info */}
          <fieldset className="rounded-2xl border border-border-low bg-card p-5 space-y-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Project
            </legend>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="e.g. Landing page for SaaS startup"
                value={form.title}
                onChange={handleChange}
                maxLength={64}
                required
                className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-foreground/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="Describe what you built and your contribution..."
                value={form.description}
                onChange={handleChange}
                maxLength={256}
                rows={4}
                required
                className="w-full resize-none rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-foreground/30"
              />
              <p className="text-right text-xs text-muted">
                {form.description.length}/256
              </p>
            </div>
          </fieldset>

          {/* Client info */}
          <fieldset className="rounded-2xl border border-border-low bg-card p-5 space-y-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              Client
            </legend>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="clientName">
                Full name
              </label>
              <input
                id="clientName"
                name="clientName"
                type="text"
                placeholder="e.g. Jane Smith"
                value={form.clientName}
                onChange={handleChange}
                maxLength={64}
                required
                className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-foreground/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="clientEmail">
                Email
              </label>
              <input
                id="clientEmail"
                name="clientEmail"
                type="email"
                placeholder="e.g. jane@company.com"
                value={form.clientEmail}
                onChange={handleChange}
                maxLength={128}
                required
                className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-foreground/30"
              />
            </div>
          </fieldset>

          {/* Status */}
          {txStatus && (
            <div className="rounded-lg border border-border-low bg-cream/50 px-4 py-3 text-sm">
              <p>{txStatus}</p>
              {txSignature && (
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs underline underline-offset-2 text-muted hover:text-foreground transition"
                >
                  View on Solana Explorer →
                </a>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSending || !isFormValid}
            className="w-full rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {isSending ? "Confirming..." : "Create badge"}
          </button>
        </form>
      </div>
    </Layout>
  );
}