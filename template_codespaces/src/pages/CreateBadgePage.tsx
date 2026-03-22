import { useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { Layout } from "../components/layout/Layout";
import { useRepulink } from "../hooks/useRepulink";
import { useOnChainData } from "../hooks/useOnChainData";
import { type Address } from "@solana/kit";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ArrowLeft, Send, Copy, AlertCircle, Sparkles, User, Mail, Briefcase, FileText, ArrowRight } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export function CreateBadgePage() {
  const { status, wallet } = useWalletConnection();
  const walletAddress = wallet?.account.address as Address | undefined;
  const { profile } = useOnChainData(walletAddress);
  const badgeIndex = profile?.badgeCount ?? 0;

  const { createBadge, isSending } = useRepulink();

  const [form, setForm] = useState({
    title: "",
    description: "",
    clientName: "",
    clientEmail: "",
  });
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [approvalLink, setApprovalLink] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setTxStatus("Sending request...");
      setTxSignature(null);
      setApprovalLink(null);

      const sig = await createBadge(form, badgeIndex);
      setTxSignature(sig ?? null);
      setTxStatus("Request sent! Share this link with your client:");
      setApprovalLink(
        `${window.location.origin}/approve/${walletAddress}/${badgeIndex}`
      );
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
        <div className="flex flex-col items-center justify-center gap-6 py-32">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 animate-pulse">
                <AlertCircle className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg text-muted">
                Connect your wallet to send an endorsement request.
            </p>

            <a
                href="/"
                className="group flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-bold text-background transition-transform hover:scale-105"
            >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Go to home
            </a>
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
        className="mx-auto flex max-w-2xl flex-col gap-8"
      >
        <motion.div variants={itemVariants} className="space-y-2">
          <a
            href="/dashboard"
            className="group inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to dashboard
          </a>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
             Request an endorsement
          </h1>
          <p className="text-base text-muted max-w-xl">
            Send your client a verification request. They'll receive a link to
            confirm your work on-chain, creating a soulbound badge for your profile.
          </p>
        </motion.div>

        <motion.form variants={itemVariants} onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
              {/* Project Details */}
              <fieldset className="rounded-3xl glass-panel p-6 sm:p-8 space-y-6 md:col-span-2">
                <legend className="px-2 text-sm font-bold uppercase tracking-widest text-primary-light flex items-center gap-2 -ml-2 mb-2">
                  <Briefcase className="h-4 w-4" /> Project Details
                </legend>

                <div className="space-y-2">
                  <label
                    className="text-sm font-bold text-foreground/90 ml-1 block"
                    htmlFor="title"
                  >
                    Role or Title
                  </label>
                  <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                          <FileText className="h-4 w-4" />
                      </div>
                      <input
                        id="title"
                        name="title"
                        type="text"
                        placeholder="e.g. Lead Frontend Developer"
                        value={form.title}
                        onChange={handleChange}
                        maxLength={64}
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 py-3 sm:py-3.5 text-sm sm:text-base outline-none transition-all placeholder:text-muted focus:border-primary/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(153,69,255,0.1)] text-white"
                      />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-bold text-foreground/90 ml-1 flex justify-between items-center"
                    htmlFor="description"
                  >
                    <span>Description</span>
                    <span className="text-xs font-medium text-muted">{form.description.length}/256</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="Describe what you built, the tech stack used, and your specific contributions..."
                    value={form.description}
                    onChange={handleChange}
                    maxLength={256}
                    rows={4}
                    required
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-sm sm:text-base outline-none transition-all placeholder:text-muted focus:border-primary/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(153,69,255,0.1)] text-white"
                  />
                </div>
              </fieldset>

              {/* Client Details */}
              <fieldset className="rounded-3xl glass-panel p-6 sm:p-8 space-y-6 md:col-span-2">
                <legend className="px-2 text-sm font-bold uppercase tracking-widest text-primary-light flex items-center gap-2 -ml-2 mb-2">
                  <User className="h-4 w-4" /> Client Details
                </legend>

                <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                    <label
                        className="text-sm font-bold text-foreground/90 ml-1 block"
                        htmlFor="clientName"
                    >
                        Full Name
                    </label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                            <User className="h-4 w-4" />
                        </div>
                        <input
                            id="clientName"
                            name="clientName"
                            type="text"
                            placeholder="e.g. Jane Smith"
                            value={form.clientName}
                            onChange={handleChange}
                            maxLength={64}
                            required
                            className="w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 py-3 sm:py-3.5 text-sm sm:text-base outline-none transition-all placeholder:text-muted focus:border-primary/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(153,69,255,0.1)] text-white"
                        />
                    </div>
                    </div>

                    <div className="space-y-2">
                    <label
                        className="text-sm font-bold text-foreground/90 ml-1 block"
                        htmlFor="clientEmail"
                    >
                        Email Address
                    </label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                            <Mail className="h-4 w-4" />
                        </div>
                        <input
                            id="clientEmail"
                            name="clientEmail"
                            type="email"
                            placeholder="e.g. jane@company.com"
                            value={form.clientEmail}
                            onChange={handleChange}
                            maxLength={128}
                            required
                            className="w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 py-3 sm:py-3.5 text-sm sm:text-base outline-none transition-all placeholder:text-muted focus:border-primary/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(153,69,255,0.1)] text-white"
                        />
                    </div>
                    </div>
                </div>
              </fieldset>
          </div>

          <AnimatePresence>
            {txStatus && (
                <motion.div 
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className="rounded-3xl border border-primary/30 bg-primary/10 p-6 space-y-4 shadow-[0_0_30px_rgba(153,69,255,0.15)] relative overflow-hidden"
                >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-light via-primary to-primary-light animate-pulse" />
                
                <p className="font-medium text-primary-light flex items-center gap-2">
                    {isSending && <Sparkles className="h-4 w-4 animate-spin" />}
                    {txStatus}
                </p>

                {approvalLink && (
                    <div className="space-y-3 mt-2">
                        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-background/50 p-2 backdrop-blur-sm">
                            <p className="flex-1 truncate font-mono text-sm text-white/90 px-2 select-all">
                            {approvalLink}
                            </p>
                            <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(approvalLink)}
                            className="group flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary-light px-4 py-2 text-sm font-bold text-white transition-all shadow-[0_0_15px_rgba(153,69,255,0.4)]"
                            >
                            <Copy className="h-4 w-4 group-hover:scale-110 transition-transform" /> Copy
                            </button>
                        </div>
                        <p className="text-sm text-primary-light/80">
                            Send this link directly to your client. They can approve it instantly (no wallet required).
                        </p>
                    </div>
                )}

                {txSignature && (
                    <a
                    href={
                        "https://explorer.solana.com/tx/" +
                        txSignature +
                        "?cluster=devnet"
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4 transition hover:text-primary-light mt-4"
                    >
                    View Transaction on Solana Explorer <ArrowRight className="h-3 w-3" />
                    </a>
                )}
                </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isSending || !isFormValid}
            className="group relative w-full flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-foreground px-6 py-4 text-base font-bold text-background transition-all hover:scale-[1.01] active:scale-95 disabled:pointer-events-none disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] mt-2"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative z-10 flex items-center gap-2">
                {isSending ? (
                    "Sending Request..."
                ) : (
                    <>
                        Send Endorsement Request <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                )}
            </span>
          </button>
        </motion.form>
      </motion.div>
    </Layout>
  );
}