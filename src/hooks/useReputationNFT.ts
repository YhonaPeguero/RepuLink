import { useCallback, useState } from "react";
import { useWalletConnection, useSendTransaction } from "@solana/react-hooks";
import { type BadgeWithPda, type FreelancerProfile } from "../types/repulink";
import { PublicKey } from "@solana/web3.js";
import { type Address } from "@solana/kit";

const MPL_CORE_PROGRAM_ID = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d" as Address;
const SYSTEM_PROGRAM = "11111111111111111111111111111111" as Address;

function buildMetadata(profile: FreelancerProfile, badges: BadgeWithPda[]) {
  const approved = badges.filter((b) => "approved" in b.account.status);
  const score = badges.length > 0
    ? Math.round((approved.length / badges.length) * 100)
    : 0;

  const json = JSON.stringify({
    name: `${profile.username} — RepuLink Card`,
    description: `Verified on Solana. ${approved.length} endorsements. Score: ${score}%.`,
    attributes: [
      { trait_type: "Score", value: `${score}%` },
      { trait_type: "Endorsed", value: approved.length },
      { trait_type: "Total Badges", value: badges.length },
      { trait_type: "Platform", value: "RepuLink" },
    ],
  });

  return {
    name: `${profile.username} — RepuLink Card`,
    score,
    approvedCount: approved.length,
    uri: `data:application/json;base64,${btoa(unescape(encodeURIComponent(json)))}`,
  };
}

function encodeString(str: string): Uint8Array {
  const bytes = new TextEncoder().encode(str);
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, bytes.length, true);
  return new Uint8Array([...len, ...bytes]);
}

export function useReputationNFT() {
  const { wallet } = useWalletConnection();
  const { send } = useSendTransaction();
  const [isMinting, setIsMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState<string | null>(null);
  const [mintSignature, setMintSignature] = useState<string | null>(null);

  const mintReputationCard = useCallback(
    async (profile: FreelancerProfile, badges: BadgeWithPda[]) => {
      if (!wallet) throw new Error("Wallet not connected");

      setIsMinting(true);
      setMintStatus("Preparing your Reputation Card...");
      setMintSignature(null);

      try {
        const metadata = buildMetadata(profile, badges);
        const owner = wallet.account.address as Address;
        const ownerPubkey = new PublicKey(owner);

        // ── Derive asset PDA from owner + seed ───────────────────────────────
        const [assetPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("reputation"),
            ownerPubkey.toBuffer(),
          ],
          new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d")
        );
        const assetAddress = assetPda.toBase58() as Address;

        // ── MPL Core CreateV1 discriminator ──────────────────────────────────
        const discriminator = new Uint8Array([145, 98, 192, 118, 184, 147, 118, 104]);
        const nameBytes = encodeString(metadata.name);
        const uriBytes = encodeString(metadata.uri);
        const flags = new Uint8Array([0, 1, 1, 0]);

        const data = new Uint8Array([
          ...discriminator,
          ...flags,
          ...nameBytes,
          ...uriBytes,
        ]);

        const instruction = {
          programAddress: MPL_CORE_PROGRAM_ID,
          accounts: [
            { address: assetAddress, role: 1 },  // Writable (PDA, no signer needed)
            { address: owner, role: 1 },          // Writable owner
            { address: owner, role: 3 },          // WritableSigner payer
            { address: SYSTEM_PROGRAM, role: 0 }, // Readonly
          ],
          data,
        };

        setMintStatus("Awaiting wallet signature...");

        const sig = await send({ instructions: [instruction] });

        setMintSignature(sig ?? null);
        setMintStatus(
          `Minted! Score: ${metadata.score}% · ${metadata.approvedCount} endorsements on Solana.`
        );

        return { sig, asset: assetAddress };
      } catch (err: any) {
        setMintStatus(`Error: ${err.message}`);
        throw err;
      } finally {
        setIsMinting(false);
      }
    },
    [wallet, send]
  );

  return { mintReputationCard, isMinting, mintStatus, mintSignature };
}