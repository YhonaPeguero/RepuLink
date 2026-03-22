import { type BadgeWithPda, isBadgeApproved } from "../../types/repulink";
import { StatusBadge } from "../ui/StatusBadge";

interface BadgeCardProps {
    badge: BadgeWithPda;
    onShare?: (badge: BadgeWithPda) => void;
}

export function BadgeCard({ badge, onShare }: BadgeCardProps) {
    const { account } = badge;
    const isApproved = isBadgeApproved(account.status);

    const formattedDate = new Date(account.createdAt * 1000).toLocaleDateString(
        "en-US",
        { year: "numeric", month: "short", day: "numeric" }
    );

    return (
        <article className="flex flex-col gap-4 rounded-2xl border border-border-low bg-card p-5 transition hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-base font-semibold leading-tight text-foreground">
                        {account.title}
                    </p>
                    <p className="text-xs text-muted">{formattedDate}</p>
                </div>
                <StatusBadge status={account.status} />
            </div>

            <p className="text-sm leading-relaxed text-muted line-clamp-2">
                {account.description}
            </p>

            <div className="rounded-xl border border-border-low bg-cream/30 px-4 py-3 space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted">Endorsed by</p>
                <p className="text-sm font-medium text-foreground">{account.clientName}</p>
                <p className="text-xs text-muted">{account.clientEmail}</p>

                {isApproved && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {account.clientLinkedin && (
                            <a // ✅ Corregido
                                href={"https://" + account.clientLinkedin.replace(/^https?:\/\//, "")}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                            >
                                LinkedIn
                            </a>
                        )}
                        {account.clientTwitter && (
                            <a // ✅ Corregido
                                href={"https://twitter.com/" + account.clientTwitter.replace(/^@/, "")}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 transition"
                            >
                                Twitter
                            </a>
                        )}
                        {account.clientWallet && (
                            <a
                                href={
                                    "https://explorer.solana.com/address/" +
                                    account.clientWallet +
                                    "?cluster=devnet"
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 transition hover:bg-purple-100"
                            >
                                View in Explorer
                            </a>
                        )}
                    </div>
                )}
            </div>

            {!isApproved && onShare && (
                <button
                    onClick={() => onShare(badge)}
                    className="w-full rounded-lg border border-border-low bg-card px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                    Share approval link
                </button>
            )}
        </article>
    );
}