import { useEffect, useState, useCallback } from "react";
import { useSolanaClient } from "@solana/react-hooks";
import {
  getBase58Decoder,
  getBase64Encoder,
  unwrapOption,
  type Address,
  type Base58EncodedBytes,
} from "@solana/kit";
import {
  BADGE_DISCRIMINATOR,
  getBadgeDecoder,
  type Badge as GeneratedBadge,
} from "../generated/repulink/accounts/badge";
import { fetchMaybeFreelancerProfile } from "../generated/repulink/accounts/freelancerProfile";
import { BadgeStatus } from "../generated/repulink/types";
import { REPULINK_PROGRAM_ADDRESS } from "../generated/repulink";
import { deriveProfilePda } from "./useRepulink";
import {
  type FreelancerProfile,
  type Badge,
  type BadgeWithPda,
  type BadgeStatus as UiBadgeStatus,
} from "../types/repulink";

// ── Mapeo de tipos generados (Codama) → tipos de la UI de badges ──────────

const STATUS_MAP: Record<BadgeStatus, UiBadgeStatus> = {
  [BadgeStatus.Pending]: { pending: {} },
  [BadgeStatus.Approved]: { approved: {} },
  [BadgeStatus.Rejected]: { rejected: {} },
};

function toUiBadge(badge: GeneratedBadge): Badge {
  const approvedAt = unwrapOption(badge.approvedAt);
  return {
    freelancer: badge.freelancer,
    badgeIndex: badge.badgeIndex,
    title: badge.title,
    description: badge.description,
    clientName: badge.clientName,
    clientEmail: badge.clientEmail,
    clientWallet: unwrapOption(badge.clientWallet),
    clientLinkedin: unwrapOption(badge.clientLinkedin),
    clientTwitter: unwrapOption(badge.clientTwitter),
    clientEmailReviewer: unwrapOption(badge.clientEmailReviewer),
    status: STATUS_MAP[badge.status],
    createdAt: Number(badge.createdAt),
    approvedAt: approvedAt === null ? null : Number(approvedAt),
    bump: badge.bump,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useOnChainData(walletAddress: Address | undefined) {
  const client = useSolanaClient();
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [badges, setBadges] = useState<BadgeWithPda[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const { rpc } = client.runtime;

      // ── Perfil: PDA + fetcher generado ─────────────────────────────────
      const profilePda = await deriveProfilePda(walletAddress);
      const maybeProfile = await fetchMaybeFreelancerProfile(rpc, profilePda);
      setProfile(
        maybeProfile.exists
          ? {
              owner: maybeProfile.data.owner,
              username: maybeProfile.data.username,
              badgeCount: maybeProfile.data.badgeCount,
              bump: maybeProfile.data.bump,
            }
          : null,
      );

      // ── Badges: getProgramAccounts + decoder generado ──────────────────
      const accounts = await rpc
        .getProgramAccounts(REPULINK_PROGRAM_ADDRESS, {
          encoding: "base64",
          filters: [
            {
              memcmp: {
                offset: 0n,
                bytes: getBase58Decoder().decode(
                  BADGE_DISCRIMINATOR,
                ) as Base58EncodedBytes,
                encoding: "base58",
              },
            },
            {
              memcmp: {
                offset: 8n,
                bytes: walletAddress.toString() as Base58EncodedBytes,
                encoding: "base58",
              },
            },
          ],
        })
        .send();

      const badgeDecoder = getBadgeDecoder();
      const base64 = getBase64Encoder();
      const parsedBadges: BadgeWithPda[] = accounts
        .map(({ pubkey, account }): BadgeWithPda => ({
          pda: pubkey as string,
          account: toUiBadge(badgeDecoder.decode(base64.encode(account.data[0]))),
        }))
        .sort((a, b) => a.account.badgeIndex - b.account.badgeIndex);

      setBadges(parsedBadges);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch on-chain data");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, client]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { profile, badges, isLoading, error, refetch: fetchData };
}
