import { getBadgeStatusLabel, type BadgeStatus } from "../../types/repulink";

interface StatusBadgeProps {
  status: BadgeStatus;
}

const statusStyles = {
  Pending: "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
  Approved: "bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]",
  Rejected: "bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = getBadgeStatusLabel(status);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${statusStyles[label]}`}
    >
      {label}
    </span>
  );
}