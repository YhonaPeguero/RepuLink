import { useWalletConnection } from "@solana/react-hooks";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Gavel,
  Lock,
  ScrollText,
} from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { EscrowFlow } from "../components/marketing/EscrowFlow";
import {
  CountUp,
  Magnetic,
  DragRail,
  Reveal,
} from "../components/marketing/motion-primitives";
import { SolanaBars, SolanaMark } from "../components/brand/SolanaMark";
import { WalletStrip } from "../components/brand/WalletStrip";
import { LifecycleRail } from "../components/job/LifecycleRail";
import { JobState } from "../generated/repulink/types/jobState";
import { DEMO_JOBS } from "../lib/demo-jobs";

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * El alcance real del producto. El escrow no sabe qué tipo de trabajo es: solo
 * conoce dos partes, un importe y un resultado. Nombrar los casos concretos
 * evita el "para cualquier cosa" que no significa nada.
 */
const USE_CASES = [
  { label: "Freelance projects", tint: "#9945FF", ring: "border-primary/25" },
  {
    label: "Contractor milestones",
    tint: "#3B82F6",
    ring: "border-state-funded/25",
  },
  { label: "Creator commissions", tint: "#F472B6", ring: "border-pink-400/25" },
  { label: "DAO contributions", tint: "#14F195", ring: "border-state-done/25" },
  {
    label: "Service retainers",
    tint: "#FBBF24",
    ring: "border-state-active/25",
  },
  { label: "Design sprints", tint: "#A78BFA", ring: "border-primary/25" },
  { label: "Audit engagements", tint: "#38BDF8", ring: "border-sky-400/25" },
  { label: "Team bounties", tint: "#FB923C", ring: "border-orange-400/25" },
];

const GUARANTEES = [
  {
    icon: Lock,
    tone: "text-state-funded",
    ring: "group-hover:border-state-funded/40",
    title: "Funded before work starts",
    body: "The payer deposits into a vault owned by the agreement's own program address.",
  },
  {
    icon: ScrollText,
    tone: "text-state-done",
    ring: "group-hover:border-state-done/40",
    title: "Settled into a credential",
    body: "A delivered and released agreement can be attested through the Solana Attestation Service.",
  },
  {
    icon: Gavel,
    tone: "text-state-active",
    ring: "group-hover:border-state-active/40",
    title: "Arbitrated by a human",
    body: "Either party can dispute while funds are escrowed. Nothing releases on a timer alone.",
  },
];

export function HomePage() {
  const { connectors, connect, status } = useWalletConnection();
  const connected = status === "connected";
  const primaryWallet = connectors[0];

  return (
    <Layout>
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <motion.section
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid items-center gap-x-14 gap-y-12 pt-2 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:pt-6"
      >
        <div className="min-w-0">
          <motion.span
            variants={rise}
            className="inline-flex items-center gap-2 rounded-full border border-border-low bg-elev-1 py-1.5 pl-2 pr-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted backdrop-blur-sm"
          >
            <SolanaMark className="h-2.5 w-auto" />
            Built on Solana
          </motion.span>

          <motion.h1
            variants={rise}
            className="mt-7 font-heading text-[2.75rem] font-black leading-[0.94] tracking-[-0.04em] text-white sm:text-[3.75rem] lg:text-[4.25rem]"
          >
            Proof that the
            <br />
            work <span className="text-brand-gradient">happened.</span>
          </motion.h1>

          <motion.div
            variants={rise}
            className="mt-10 flex flex-wrap items-center gap-3"
          >
            {connected ? (
              <>
                <Magnetic strength={0.18}>
                  <PrimaryCTA href="/job/create">Start an agreement</PrimaryCTA>
                </Magnetic>
                <GhostCTA href="/dashboard">My agreements</GhostCTA>
              </>
            ) : primaryWallet ? (
              <>
                <Magnetic strength={0.18}>
                  <button
                    onClick={() => connect(primaryWallet.id)}
                    disabled={status === "connecting"}
                    className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl btn-brand px-6 py-3.5 text-sm font-bold text-white transition-transform duration-[--dur-micro] hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    <span className="relative">
                      {status === "connecting"
                        ? "Connecting"
                        : "Connect wallet"}
                    </span>
                    <ArrowRight className="relative h-4 w-4 transition-transform duration-[--dur-micro] group-hover:translate-x-0.5" />
                  </button>
                </Magnetic>
                <GhostCTA href={`/job/${DEMO_JOBS[2].address}`}>
                  See a settled agreement
                </GhostCTA>
              </>
            ) : (
              <>
                <Magnetic strength={0.18}>
                  <PrimaryCTA href={`/job/${DEMO_JOBS[2].address}`}>
                    See a settled agreement
                  </PrimaryCTA>
                </Magnetic>
                <GhostCTA href="/dashboard">Browse agreements</GhostCTA>
              </>
            )}
          </motion.div>

          <motion.div variants={rise} className="mt-10">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted/60">
              Sign in with your Solana wallet
            </p>
            <WalletStrip />
          </motion.div>
        </div>

        {/* El producto, en movimiento */}
        <motion.div
          variants={rise}
          className="relative min-w-0 rounded-3xl border border-border-low bg-elev-1/80 px-4 py-12 backdrop-blur-xl sm:px-10 sm:py-16"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-edge-highlight to-transparent" />
          <EscrowFlow />
        </motion.div>
      </motion.section>

      {/* ── Alcance ─────────────────────────────────────────────────── */}
      <Reveal className="mt-24">
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <SolanaBars className="h-2.5 w-auto text-primary/60" />
          <p className="text-sm font-semibold text-white">
            Freelance work is where we started.
          </p>
        </div>
        <DragRail>
          {USE_CASES.map(({ label, tint, ring }) => (
            <span
              key={label}
              className={`flex shrink-0 select-none items-center gap-2.5 whitespace-nowrap rounded-full border ${ring} bg-elev-1/70 py-2.5 pl-3 pr-5 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors duration-[--dur-fast] hover:bg-elev-2`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: tint }}
              />
              {label}
            </span>
          ))}
        </DragRail>
      </Reveal>

      {/* ── Cómo funciona ───────────────────────────────────────────── */}
      <Reveal className="mt-24">
        <div className="overflow-hidden rounded-3xl border border-border-low bg-elev-1/60 backdrop-blur-sm">
          <div className="grid gap-px bg-border-low lg:grid-cols-[1.15fr_1fr]">
            <div className="flex flex-col bg-background/80 p-8 sm:p-10">
              <h2 className="max-w-sm font-heading text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
                Four states, each one guarded on-chain.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
                Every transition checks a signature. The payer releases, or the
                worker claims once the review window elapses. A dispute and a
                refund are the two ways out.
              </p>

              <div className="my-auto py-10">
                <LifecycleRail state={JobState.Released} />
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border-low pt-5 text-[10px] font-bold uppercase tracking-widest">
                <span className="inline-flex items-center gap-1.5 text-state-alert">
                  <span className="h-1.5 w-1.5 rounded-full bg-state-alert" />
                  Disputed
                </span>
                <span className="inline-flex items-center gap-1.5 text-state-idle">
                  <span className="h-1.5 w-1.5 rounded-full bg-state-idle" />
                  Refunded
                </span>
                <span className="text-muted/50">the two ways out</span>
              </div>
            </div>

            <div className="grid gap-px bg-border-low">
              {GUARANTEES.map(({ icon: Icon, tone, ring, title, body }) => (
                <div
                  key={title}
                  className={`group border border-transparent bg-background/80 p-7 transition-colors duration-[--dur-fast] hover:bg-elev-1 ${ring}`}
                >
                  <Icon
                    className={`h-5 w-5 ${tone} transition-transform duration-[--dur-fast] group-hover:-translate-y-0.5`}
                  />
                  <h3 className="mt-3.5 font-heading text-sm font-bold text-white">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── Cifras ──────────────────────────────────────────────────── */}
      <Reveal className="mt-24">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border-low bg-border-low sm:grid-cols-3">
          {[
            {
              v: <CountUp to={1} suffix="%" />,
              l: "Protocol fee",
              s: "Frozen into each agreement at creation",
            },
            {
              v: <CountUp to={0} />,
              l: "Funds custodied",
              s: "The vault is owned by the agreement itself",
            },
            {
              v: <CountUp to={7} />,
              l: "On-chain states",
              s: "Including dispute, refund and arbitration",
            },
          ].map((s) => (
            <div
              key={s.l}
              className="bg-background/80 px-6 py-7 backdrop-blur-sm"
            >
              <p className="font-heading text-4xl font-black tracking-tight text-white">
                {s.v}
              </p>
              <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                {s.l}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted/60">
                {s.s}
              </p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ── En vivo ─────────────────────────────────────────────────── */}
      <Reveal className="mt-24">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h2 className="font-heading text-xl font-bold text-white">
            Running on devnet right now
          </h2>
          <a
            href="/dashboard"
            className="group inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-primary-light"
          >
            See all
            <ArrowRight className="h-3 w-3 transition-transform duration-[--dur-micro] group-hover:translate-x-0.5" />
          </a>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {DEMO_JOBS.slice(0, 3).map((demo, i) => (
            <a
              key={demo.address}
              href={`/job/${demo.address}`}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border-low bg-elev-1/70 p-6 backdrop-blur-sm transition-all duration-[--dur-fast] hover:-translate-y-1 hover:border-primary/40 hover:bg-elev-2 ${
                i === 2 ? "lg:border-state-done/25" : ""
              }`}
            >
              {i === 2 && (
                <span className="absolute right-5 top-5 rounded-full border border-state-done/30 bg-state-done/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-state-done">
                  Attested
                </span>
              )}
              <p className="font-heading text-base font-bold text-white">
                {demo.label}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                {demo.note}
              </p>
              <span className="mt-auto flex items-center gap-1 pt-6 font-mono text-[10px] text-muted/60 transition-colors group-hover:text-primary-light">
                {demo.address.slice(0, 6)}…{demo.address.slice(-6)}
                <ArrowUpRight className="h-3 w-3 transition-transform duration-[--dur-micro] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </a>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-10">
        <p className="text-xs leading-relaxed text-muted/60">
          Devnet preview. Unaudited, single-key arbiter, and agreements settle
          in a 6-decimal test token rather than Circle USDC.
        </p>
      </Reveal>
    </Layout>
  );
}

function PrimaryCTA({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl btn-brand px-6 py-3.5 text-sm font-bold text-white transition-transform duration-[--dur-micro] hover:-translate-y-0.5"
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative">{children}</span>
      <ArrowRight className="relative h-4 w-4 transition-transform duration-[--dur-micro] group-hover:translate-x-0.5" />
    </a>
  );
}

function GhostCTA({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-2 rounded-xl border border-border-low bg-elev-1 px-6 py-3.5 text-sm font-bold text-white transition-all duration-[--dur-micro] hover:-translate-y-0.5 hover:bg-elev-2"
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform duration-[--dur-micro] group-hover:translate-x-0.5" />
    </a>
  );
}
