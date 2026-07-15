// ── Badge status enum ──────────────────────────────────────────────────────
export type BadgeStatus = 
  | { pending: Record<string, never> }
  | { approved: Record<string, never> }
  | { rejected: Record<string, never> };

// ── On-chain account types ─────────────────────────────────────────────────
export interface FreelancerProfile {
  owner: string;
  username: string;
  badgeCount: number;
  bump: number;
}

export interface Badge {
  freelancer: string;
  badgeIndex: number;
  title: string;
  description: string;
  clientName: string;
  clientEmail: string;
  clientWallet: string | null;
  clientLinkedin: string | null;
  clientTwitter: string | null;
  clientEmailReviewer: string | null;
  status: BadgeStatus;
  createdAt: number;
  approvedAt: number | null;
  bump: number;
}

// ── Derived / UI types ─────────────────────────────────────────────────────
export interface BadgeWithPda {
  pda: string;
  account: Badge;
}

export interface ProfileWithBadges {
  pda: string;
  account: FreelancerProfile;
  badges: BadgeWithPda[];
}

// ── Form types ─────────────────────────────────────────────────────────────
export interface CreateBadgeFormData {
  title: string;
  description: string;
  clientName: string;
  clientEmail: string;
}

export interface ApproveBadgeFormData {
  clientLinkedin: string;
  clientTwitter: string;
  clientEmailReviewer: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
export function getBadgeStatusLabel(status: BadgeStatus): "Pending" | "Approved" | "Rejected" {
  if ("approved" in status) return "Approved";
  if ("rejected" in status) return "Rejected";
  return "Pending";
}

export function isBadgeApproved(status: BadgeStatus): boolean {
  return "approved" in status;
}

export function isBadgePending(status: BadgeStatus): boolean {
  return "pending" in status;
}