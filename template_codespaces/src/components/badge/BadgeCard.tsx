import { motion } from "framer-motion";
import { type BadgeWithPda, isBadgeApproved } from "../../types/repulink";
import { StatusBadge } from "../ui/StatusBadge";
import { Twitter, Linkedin, ExternalLink, Share2, ShieldCheck, Mail, User } from "lucide-react";

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
        <motion.article 
            whileHover={{ y: -4, scale: 1.01 }}
            className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
                isApproved 
                    ? "glass-panel border-primary/30 shadow-[0_4px_30px_rgba(153,69,255,0.05)] hover:shadow-[0_4px_40px_rgba(153,69,255,0.2)] hover:border-primary/60" 
                    : "bg-card border-border-low grayscale-[50%] opacity-80"
            }`}
        >
            {/* Holographic background shift on hover for approved badges */}
            {isApproved && (
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            )}

            <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <h3 className={`text-lg font-bold leading-tight ${isApproved ? "text-foreground" : "text-muted"}`}>
                        {account.title}
                    </h3>
                    <p className="text-xs text-muted/80 font-mono tracking-wide">{formattedDate}</p>
                </div>
                <div className="flex-shrink-0">
                    <StatusBadge status={account.status} />
                </div>
            </div>

            <p className="relative z-10 text-sm leading-relaxed text-foreground/80 line-clamp-3">
                {account.description}
            </p>

            <div className="relative z-10 mt-auto pt-4 border-t border-border-low/50">
                <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className={`h-4 w-4 ${isApproved ? "text-primary" : "text-muted"}`} />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Client Data</p>
                </div>
                
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <User className="h-3.5 w-3.5 text-muted" />
                        <span className="font-semibold text-foreground/90">{account.clientName}</span>
                    </div>
                    {/* Hover reveal on desktop, visible on mobile but smaller */}
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        whileInView={{ height: "auto", opacity: 1 }}
                        className="sm:opacity-0 sm:group-hover:opacity-100 sm:h-0 sm:group-hover:h-auto overflow-hidden transition-all duration-300"
                    >
                        <div className="flex items-center gap-2 text-xs text-muted mb-3">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{account.clientEmail}</span>
                        </div>
                        
                        {isApproved && (
                            <div className="flex flex-wrap gap-2">
                                {account.clientLinkedin && (
                                    <a
                                        href={"https://" + account.clientLinkedin.replace(/^https?:\/\//, "")}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/20 transition"
                                    >
                                        <Linkedin className="h-3 w-3" /> LinkedIn
                                    </a>
                                )}
                                {account.clientTwitter && (
                                    <a
                                        href={"https://twitter.com/" + account.clientTwitter.replace(/^@/, "")}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 text-[11px] font-semibold text-sky-400 hover:bg-sky-500/20 transition"
                                    >
                                        <Twitter className="h-3 w-3" /> Twitter
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
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary-light transition hover:bg-primary/20"
                                    >
                                        <ExternalLink className="h-3 w-3" /> Solana Tx
                                    </a>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {!isApproved && onShare && (
                <button
                    onClick={(e) => { e.preventDefault(); onShare(badge); }}
                    className="relative z-10 mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-2.5 text-xs font-bold text-primary-light transition hover:bg-primary/10 hover:border-primary/60"
                >
                    <Share2 className="h-4 w-4" /> Share Approval Link
                </button>
            )}
        </motion.article>
    );
}