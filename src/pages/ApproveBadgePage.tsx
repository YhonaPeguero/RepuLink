import { useState } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import { Layout } from "../components/layout/Layout";
import { useRepulink } from "../hooks/useRepulink";
import { type Address } from "@solana/kit";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { CheckCircle2, ShieldCheck, Mail, Linkedin, Twitter, ArrowRight, XCircle } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

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
      setTxStatus("Submitting approval to Solana...");
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
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-md flex flex-col items-center gap-6 py-24 text-center"
        >
          <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-green-500/20 border border-green-500/30 text-green-400 shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                <CheckCircle2 className="h-10 w-10" />
              </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-black text-white tracking-tight">
              {txStatus}
            </h1>
            <p className="text-muted">The freelancer has been notified of your response.</p>
            {txSignature && (
              <a
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4 transition hover:text-primary-light mt-4"
              >
                View on Solana Explorer <ArrowRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </motion.div>
      </Layout>
    );
  }

  // ── Not connected — ask to connect ────────────────────────────────────
  if (status !== "connected") {
    return (
      <Layout>
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-md flex flex-col items-center gap-8 py-16 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 text-primary-light shadow-[0_0_30px_rgba(153,69,255,0.15)]">
            <ShieldCheck className="h-8 w-8" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight text-white !leading-tight">
              You've been asked to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-blue-400">verify a badge</span>
            </h1>
            <p className="text-base text-muted px-4">
              Connect to approve or reject this reputation badge. No crypto
              experience needed — we'll seamlessly create a secure wallet stack for you in seconds.
            </p>
          </div>

          <div className="w-full space-y-3 glass-panel p-6 rounded-3xl">
              <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4">
                  Select Provider
              </p>
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect(connector.id)}
                disabled={status === "connecting"}
                className="group w-full flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-5 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(153,69,255,0.2)] disabled:opacity-50"
              >
                <span className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-md bg-white/10 flex items-center justify-center p-1">
                        <img src={connector.icon} alt={connector.name} className="h-full w-full object-contain" />
                    </div>
                    {connector.name}
                </span>
                <ArrowRight className="h-4 w-4 relative transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </motion.div>
      </Layout>
    );
  }

  // ── Connected — show approval form ───────────────────────────────────
  return (
    <Layout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-md flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 text-primary-light shadow-[0_0_30px_rgba(153,69,255,0.15)]">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Verify this badge
          </h1>
          <p className="text-sm text-muted">
            By approving, you officially confirm that you worked with this freelancer and
            vouch for their work. Your endorsement will be permanently recorded on-chain.
          </p>
        </motion.div>

        {/* Identity form */}
        <motion.div variants={itemVariants} className="rounded-3xl glass-panel p-6 sm:p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] -z-10" />
          
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-light flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Your Identity
            </p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Optional but recommended for trust</p>
          </div>

          <div className="space-y-4">
              <div className="space-y-2">
                <label
                  className="text-sm font-bold text-foreground/90 ml-1 block"
                  htmlFor="clientEmailReviewer"
                >
                  Email
                </label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                        <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="clientEmailReviewer"
                      name="clientEmailReviewer"
                      type="email"
                      placeholder="you@company.com"
                      value={form.clientEmailReviewer}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 py-3 sm:py-3.5 text-sm sm:text-base outline-none transition-all placeholder:text-muted focus:border-primary/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(153,69,255,0.1)] text-white"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-bold text-foreground/90 ml-1 block"
                  htmlFor="clientLinkedin"
                >
                  LinkedIn Outline
                </label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                        <Linkedin className="h-4 w-4" />
                    </div>
                    <input
                      id="clientLinkedin"
                      name="clientLinkedin"
                      type="text"
                      placeholder="linkedin.com/in/yourname"
                      value={form.clientLinkedin}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 py-3 sm:py-3.5 text-sm sm:text-base outline-none transition-all placeholder:text-muted focus:border-primary/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(153,69,255,0.1)] text-white"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-bold text-foreground/90 ml-1 block"
                  htmlFor="clientTwitter"
                >
                  X (Twitter) Handle
                </label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                        <Twitter className="h-4 w-4" />
                    </div>
                    <input
                      id="clientTwitter"
                      name="clientTwitter"
                      type="text"
                      placeholder="@yourhandle"
                      value={form.clientTwitter}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 py-3 sm:py-3.5 text-sm sm:text-base outline-none transition-all placeholder:text-muted focus:border-primary/50 focus:bg-white/10 focus:shadow-[0_0_15px_rgba(153,69,255,0.1)] text-white"
                    />
                </div>
              </div>
          </div>
        </motion.div>

        {/* Status */}
        <AnimatePresence>
            {txStatus && (
            <motion.div 
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                role="status"
                aria-live="polite"
                className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary-light flex items-center gap-2"
            >
                <div className="h-2 w-2 rounded-full bg-primary-light shadow-[0_0_8px_rgba(184,122,255,0.8)] animate-[pulse-glow_2s_infinite]" />
                {txStatus}
            </motion.div>
            )}
        </AnimatePresence>

        {/* Actions */}
        <motion.div variants={itemVariants} className="flex gap-4">
          <button
            onClick={handleReject}
            disabled={isSending}
            aria-busy={isSending}
            className="group relative flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-sm font-bold text-white/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all disabled:opacity-50"
          >
            {isSending ? "..." : (
                <>
                    <XCircle className="h-4 w-4 group-hover:scale-110 transition-transform" /> Reject
                </>
            )}
          </button>
          <button
            onClick={handleApprove}
            disabled={isSending}
            aria-busy={isSending}
            className="group relative flex-[2] flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-foreground px-4 py-4 text-base font-bold text-background transition-all hover:scale-[1.02] active:scale-95 disabled:pointer-events-none disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative z-10 flex items-center gap-2">
                {isSending ? "Confirming..." : (
                    <>
                        <CheckCircle2 className="h-5 w-5 group-hover:scale-110 transition-transform" /> Approve Badge
                    </>
                )}
            </span>
          </button>
        </motion.div>

        <motion.p variants={itemVariants} className="text-center text-[11px] font-semibold uppercase tracking-widest text-muted/60 mt-4">
          This action is permanent and recorded on the Solana blockchain.
        </motion.p>
      </motion.div>
    </Layout>
  );
}