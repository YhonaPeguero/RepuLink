import { useCallback } from "react";
import { useWalletConnection, useSendTransaction } from "@solana/react-hooks";
import {
    createNoopSigner,
    getProgramDerivedAddress,
    getAddressEncoder,
    getBytesEncoder,
    type Address,
} from "@solana/kit";
import {
    getInitializeProfileInstructionAsync,
    getCreateBadgeInstructionAsync,
    getApproveBadgeInstructionAsync,
    getRejectBadgeInstructionAsync,
    getUpdateProfileInstructionAsync,
    getCloseProfileInstructionAsync,
    REPULINK_PROGRAM_ADDRESS,
} from "../generated/repulink";
import type { CreateBadgeFormData, ApproveBadgeFormData } from "../types/repulink";


// ── PDA derivation helpers ─────────────────────────────────────────────────

export async function deriveProfilePda(ownerAddress: Address): Promise<Address> {
    const [pda] = await getProgramDerivedAddress({
        programAddress: REPULINK_PROGRAM_ADDRESS,
        seeds: [
            getBytesEncoder().encode(new TextEncoder().encode("profile")),
            getAddressEncoder().encode(ownerAddress),
        ],
    });
    return pda;
}

export async function deriveBadgePda(
    freelancerAddress: Address,
    badgeIndex: number
): Promise<Address> {
    const indexBytes = new Uint8Array(4);
    new DataView(indexBytes.buffer).setUint32(0, badgeIndex, true);

    const [pda] = await getProgramDerivedAddress({
        programAddress: REPULINK_PROGRAM_ADDRESS,
        seeds: [
            getBytesEncoder().encode(new TextEncoder().encode("badge")),
            getAddressEncoder().encode(freelancerAddress),
            getBytesEncoder().encode(indexBytes),
        ],
    });
    return pda;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useRepulink() {
    const { wallet } = useWalletConnection();
    const { send, isSending } = useSendTransaction();

    const walletAddress = wallet?.account.address as Address | undefined;

    // El firmado real lo hace send() con la wallet conectada; el noop signer
    // solo satisface el TransactionSigner que exigen los builders de Codama.
    const walletSigner = walletAddress ? createNoopSigner(walletAddress) : undefined;

    // ── Initialize profile ───────────────────────────────────────────────────
    const initializeProfile = useCallback(
        async (username: string) => {
            if (!walletAddress || !walletSigner) throw new Error("Wallet not connected");

            const instruction = await getInitializeProfileInstructionAsync({
                owner: walletSigner,
                username,
            });

            return send({ instructions: [instruction] });
        },
        [walletAddress, walletSigner, send]
    );

    // ── Create badge ─────────────────────────────────────────────────────────
    const createBadge = useCallback(
        async (data: CreateBadgeFormData, badgeIndex: number) => {
            if (!walletAddress || !walletSigner) throw new Error("Wallet not connected");

            const badgePda = await deriveBadgePda(walletAddress, badgeIndex);

            const instruction = await getCreateBadgeInstructionAsync({
                owner: walletSigner,
                badge: badgePda,
                title: data.title,
                description: data.description,
                clientName: data.clientName,
                clientEmail: data.clientEmail,
            });

            return send({ instructions: [instruction] });
        },
        [walletAddress, walletSigner, send]
    );

    // ── Approve badge ────────────────────────────────────────────────────────
    const approveBadge = useCallback(
        async (
            freelancerAddress: Address,
            badgeIndex: number,
            data: ApproveBadgeFormData
        ) => {
            if (!walletAddress || !walletSigner) throw new Error("Wallet not connected");

            const badgePda = await deriveBadgePda(freelancerAddress, badgeIndex);

            const instruction = await getApproveBadgeInstructionAsync({
                reviewer: walletSigner,
                freelancer: freelancerAddress,
                badge: badgePda,
                badgeIndex,
                clientLinkedin: data.clientLinkedin || null,
                clientTwitter: data.clientTwitter || null,
                clientEmailReviewer: data.clientEmailReviewer || null,
            });

            return send({ instructions: [instruction] });
        },
        [walletAddress, walletSigner, send]
    );

    // ── Reject badge ─────────────────────────────────────────────────────────
    const rejectBadge = useCallback(
        async (freelancerAddress: Address, badgeIndex: number) => {
            if (!walletAddress || !walletSigner) throw new Error("Wallet not connected");

            const badgePda = await deriveBadgePda(freelancerAddress, badgeIndex);

            const instruction = await getRejectBadgeInstructionAsync({
                reviewer: walletSigner,
                freelancer: freelancerAddress,
                badge: badgePda,
                badgeIndex,
            });

            return send({ instructions: [instruction] });
        },
        [walletAddress, walletSigner, send]
    );

    // ── Update profile ───────────────────────────────────────────────────────
    const updateProfile = useCallback(
        async (username: string) => {
            if (!walletAddress || !walletSigner) throw new Error("Wallet not connected");

            const instruction = await getUpdateProfileInstructionAsync({
                owner: walletSigner,
                username,
            });

            return send({ instructions: [instruction] });
        },
        [walletAddress, walletSigner, send]
    );

    // ── Close profile ────────────────────────────────────────────────────────
    const closeProfile = useCallback(
        async () => {
            if (!walletAddress || !walletSigner) throw new Error("Wallet not connected");

            const instruction = await getCloseProfileInstructionAsync({
                owner: walletSigner,
            });

            return send({ instructions: [instruction] });
        },
        [walletAddress, walletSigner, send]
    );

    return {
        initializeProfile,
        updateProfile,
        closeProfile,
        createBadge,
        approveBadge,
        rejectBadge,
        isSending,
        walletAddress,
        isConnected: !!walletAddress,
    };
}