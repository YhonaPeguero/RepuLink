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
  Marquee,
  Reveal,
} from "../components/marketing/motion-primitives";
import { SolanaBars, SolanaMark } from "../components/brand/SolanaMark";
import { WalletStrip } from "../components/brand/WalletStrip";
import { LifecycleRail } from "../components/job/LifecycleRail";
import { JobState } from "../generated/repulink/types/jobState";
import { DEMO_JOBS } from "../lib/demo-jobs";

const PROGRAM_ID = "2mMN1jtUGZo6j9Fmq46JUTJ7639bV1aEvTXoxtu4ZtH1";

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
  "Freelance projects",
  "Contractor milestones",
  "Creator commissions",
  "DAO contributions",
  "Service retainers",
  "Design sprints",
  "Audit engagements",
  "Team bounties",
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
            <span className="h-3 w-px bg-border-strong" />
            <span className="text-state-done">Devnet live</span>
          </motion.span>

          <motion.h1
            variants={rise}
            className="mt-7 font-heading text-[2.75rem] font-black leading-[0.94] tracking-[-0.04em] text-white sm:text-[3.75rem] lg:text-[4.25rem]"
          >
            Proof that the
            <br />
            work <span className="text-brand-gradient">happened.</span>
          </motion.h1>

          <motion.p
            variants={rise}
            className="mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg"
          >
            Escrow and on-chain attestations for agreements between two parties.
            The money is locked before the work starts, and the outcome becomes
            a credential the wallet keeps.
          </motion.p>

          <motion.div
            variants={rise}
            className="mt-9 flex flex-wrap items-center gap-3"
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
                    className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-brand-gradient px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_36px_-10px_rgba(153,69,255,0.7)] transition-transform duration-[--dur-micro] hover:-translate-y-0.5 disabled:opacity-50"
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
                <GhostCTA href="/dashboard">Browse devnet agreements</GhostCTA>
              </>
            )}
          </motion.div>

          <motion.div variants={rise} className="mt-8">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted/60">
              Works with
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
      <Reveal className="mt-20">
        <div className="mb-4 flex items-center gap-3">
          <SolanaBars className="h-2.5 w-auto text-primary/50" />
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            Freelance work is where we started. The escrow does not care.
          </p>
        </div>
        <Marquee duration={46}>
          {USE_CASES.map((c) => (
            <span
              key={c}
              className="whitespace-nowrap rounded-full border border-border-low bg-elev-1/60 px-5 py-2.5 text-sm font-medium text-white/80 backdrop-blur-sm"
            >
              {c}
            </span>
          ))}
        </Marquee>
      </Reveal>

      {/* ── Cómo funciona ───────────────────────────────────────────── */}
      <Reveal className="mt-20">
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
      <Reveal className="mt-20">
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
      <Reveal className="mt-20">
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

      {/* ── Ecosistema ──────────────────────────────────────────────── */}
      <Reveal className="mt-20">
        <div className="relative overflow-hidden rounded-3xl border border-border-low bg-elev-1/60 p-8 backdrop-blur-sm sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-[90px]" />
          <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-md">
              <SolanaMark className="h-5 w-auto" />
              <p className="mt-5 font-heading text-xl font-bold leading-snug text-white">
                An Anchor program, a token vault and an attestation registry.
                Nothing else in between.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                No backend, no database, no indexer. The app reads the chain
                directly, so the record survives us.
              </p>
            </div>

            <dl className="grid shrink-0 gap-px overflow-hidden rounded-2xl border border-border-low bg-border-low sm:grid-cols-2">
              {[
                {
                  k: "Program",
                  v: PROGRAM_ID,
                  href: `https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`,
                },
                {
                  k: "Attestations",
                  v: "Solana Attestation Service",
                  href: "https://attest.solana.com",
                },
              ].map(({ k, v, href }) => (
                <a
                  key={k}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="group bg-background/80 px-5 py-4 transition-colors hover:bg-elev-1"
                >
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                    {k}
                  </dt>
                  <dd className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-white">
                    {v.length > 24 ? `${v.slice(0, 6)}…${v.slice(-6)}` : v}
                    <ArrowUpRight className="h-3 w-3 text-muted transition-transform duration-[--dur-micro] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary-light" />
                  </dd>
                </a>
              ))}
            </dl>
          </div>
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
      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-brand-gradient px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_36px_-10px_rgba(153,69,255,0.7)] transition-transform duration-[--dur-micro] hover:-translate-y-0.5"
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
