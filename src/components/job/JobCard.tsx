import { motion } from "framer-motion";
import { ArrowRight, Briefcase, UserRound } from "lucide-react";
import { type MyJob } from "../../hooks/useMyJobs";
import { formatUsdc } from "../../lib/usdc";
import { STATE_META } from "../../lib/job-state";
import { LifecycleDots } from "./LifecycleRail";
import { tokenLabel } from "../../lib/tokens";

/** Tarjeta de un Job en el listado. El rol se muestra siempre: en un escrow
 * importa más "soy el cliente" que el estado aislado. */
export function JobCard({ job }: { job: MyJob }) {
  const meta = STATE_META[job.account.state];
  const RoleIcon = job.role === "client" ? Briefcase : UserRound;

  return (
    <motion.a
      href={`/job/${job.address}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-center justify-between gap-4 rounded-2xl border border-border-low bg-elev-1 p-5 transition-all duration-[--dur-fast] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-elev-2"
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <LifecycleDots state={job.account.state} />
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${meta.className.split(" ")[0]}`}
          >
            {meta.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted/70">
            <RoleIcon className="h-3 w-3" /> {job.role}
          </span>
        </div>
        <p className="text-xl font-bold text-foreground tabular">
          {formatUsdc(job.account.amount)}{" "}
          <span className="text-xs font-normal text-muted">
            {tokenLabel(job.account.mint)}
          </span>
        </p>
        <p className="truncate font-mono text-xs text-muted">
          {job.address.slice(0, 8)}…{job.address.slice(-8)}
        </p>
        <p className="truncate font-mono text-[10px] text-muted/60">
          mint {job.account.mint.slice(0, 6)}…{job.account.mint.slice(-6)}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary-light" />
    </motion.a>
  );
}
