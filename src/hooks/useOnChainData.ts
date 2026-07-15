import { useEffect, useState, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { type Address } from "@solana/kit";
import { type FreelancerProfile, type Badge, type BadgeWithPda } from "../types/repulink";

const RPC_URL = import.meta.env.VITE_HELIUS_RPC_URL as string;
const PROGRAM_ID = import.meta.env.VITE_PROGRAM_ID as string;

// ── Anchor discriminators (8 bytes from sha256 of account name) ────────────
function getDiscriminator(name: string): Buffer {
  const hash = anchor.utils.sha256.hash(`account:${name}`);
  return Buffer.from(hash, "hex").slice(0, 8);
}

// ── Deserialize FreelancerProfile ─────────────────────────────────────────
function deserializeProfile(data: Buffer): FreelancerProfile | null {
  try {
    let offset = 8; // skip discriminator

    const owner = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;

    const usernameLen = data.readUInt32LE(offset);
    offset += 4;
    const username = data.slice(offset, offset + usernameLen).toString("utf8");
    offset += usernameLen;

    const badgeCount = data.readUInt32LE(offset);
    offset += 4;

    const bump = data.readUInt8(offset);

    return { owner, username, badgeCount, bump };
  } catch {
    return null;
  }
}

// ── Deserialize Badge ─────────────────────────────────────────────────────
function deserializeBadge(data: Buffer): Badge | null {
  try {
    let offset = 8; // skip discriminator

    const freelancer = new PublicKey(data.slice(offset, offset + 32)).toBase58();
    offset += 32;

    const badgeIndex = data.readUInt32LE(offset);
    offset += 4;

    const readString = (): string => {
      const len = data.readUInt32LE(offset);
      offset += 4;
      const str = data.slice(offset, offset + len).toString("utf8");
      offset += len;
      return str;
    };

    const readOptionString = (): string | null => {
      const isSome = data.readUInt8(offset);
      offset += 1;
      if (!isSome) return null;
      return readString();
    };

    const readOptionPubkey = (): string | null => {
      const isSome = data.readUInt8(offset);
      offset += 1;
      if (!isSome) return null;
      const pk = new PublicKey(data.slice(offset, offset + 32)).toBase58();
      offset += 32;
      return pk;
    };

    const title = readString();
    const description = readString();
    const clientName = readString();
    const clientEmail = readString();
    const clientWallet = readOptionPubkey();
    const clientLinkedin = readOptionString();
    const clientTwitter = readOptionString();
    const clientEmailReviewer = readOptionString();

    const statusByte = data.readUInt8(offset);
    offset += 1;
    const status =
      statusByte === 0
        ? { pending: {} as Record<string, never> }
        : statusByte === 1
        ? { approved: {} as Record<string, never> }
        : { rejected: {} as Record<string, never> };

    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;

    const hasApprovedAt = data.readUInt8(offset);
    offset += 1;
    const approvedAt = hasApprovedAt ? Number(data.readBigInt64LE(offset)) : null;

    const bump = data.readUInt8(offset + (hasApprovedAt ? 8 : 0));

    return {
      freelancer,
      badgeIndex,
      title,
      description,
      clientName,
      clientEmail,
      clientWallet,
      clientLinkedin,
      clientTwitter,
      clientEmailReviewer,
      status,
      createdAt,
      approvedAt,
      bump,
    };
  } catch {
    return null;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useOnChainData(walletAddress: Address | undefined) {
  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [badges, setBadges] = useState<BadgeWithPda[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const programId = new PublicKey(PROGRAM_ID);
      const owner = new PublicKey(walletAddress);

      // ── Fetch profile PDA ──────────────────────────────────────────────
      const [profilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), owner.toBuffer()],
        programId
      );

      const profileInfo = await connection.getAccountInfo(profilePda);
      if (profileInfo?.data) {
        const deserialized = deserializeProfile(Buffer.from(profileInfo.data));
        setProfile(deserialized);
      } else {
        setProfile(null);
      }

      // ── Fetch all badges via getProgramAccounts ────────────────────────
      const badgeDiscriminator = getDiscriminator("Badge");

      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          { memcmp: { offset: 0, bytes: badgeDiscriminator.toString("base64") } },
          { memcmp: { offset: 8, bytes: owner.toBase58() } },
        ],
      });

      const parsedBadges: BadgeWithPda[] = accounts
        .map(({ pubkey, account }) => {
          const deserialized = deserializeBadge(Buffer.from(account.data));
          if (!deserialized) return null;
          return { pda: pubkey.toBase58(), account: deserialized };
        })
        .filter((b): b is BadgeWithPda => b !== null)
        .sort((a, b) => a.account.badgeIndex - b.account.badgeIndex);

      setBadges(parsedBadges);
    } catch (err: any) {
      setError(err.message ?? "Failed to fetch on-chain data");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { profile, badges, isLoading, error, refetch: fetchData };
}