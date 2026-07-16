import { useCallback, useState } from "react";
import {
  useSendTransaction,
  useSolanaClient,
  useWalletConnection,
} from "@solana/react-hooks";
import {
  address,
  createNoopSigner,
  getAddressEncoder,
  getProgramDerivedAddress,
  getU64Encoder,
  type Address,
  type Instruction,
  type Signature,
  type TransactionSigner,
} from "@solana/kit";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import {
  getApproveReleaseInstructionAsync,
  getCancelRefundInstructionAsync,
  getClaimTimeoutInstructionAsync,
  getCreateJobInstructionAsync,
  getFundJobInstructionAsync,
  getMarkDeliveredInstruction,
  getOpenDisputeInstruction,
  getResolveDisputeInstructionAsync,
  REPULINK_PROGRAM_ADDRESS,
} from "../generated/repulink";
import { fetchJob, type Job } from "../generated/repulink/accounts/job";
import { fetchConfig } from "../generated/repulink/accounts/config";
import { USDC_MINT } from "../config";
import { awaitSignatureCommitment } from "../lib/confirm";
import { mapEscrowError } from "../lib/escrow-errors";
import { sha256Utf8 } from "../lib/usdc";

export type EscrowStage = "idle" | "sending" | "confirming" | "finalizing";

// ── PDAs ───────────────────────────────────────────────────────────────────

export async function deriveJobPda(
  client: Address,
  jobId: bigint,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: REPULINK_PROGRAM_ADDRESS,
    seeds: [
      "job",
      getAddressEncoder().encode(client),
      getU64Encoder().encode(jobId),
    ],
  });
  return pda;
}

export async function deriveConfigPda(): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: REPULINK_PROGRAM_ADDRESS,
    seeds: ["config"],
  });
  return pda;
}

async function ata(mint: Address, owner: Address): Promise<Address> {
  const [pda] = await findAssociatedTokenPda({
    mint,
    owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  return pda;
}

function randomJobId(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let id = 0n;
  for (const b of bytes) id = (id << 8n) | BigInt(b);
  return id;
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Acciones del flujo escrow. Reglas transversales:
 * - El Job se re-lee de la red justo antes de construir cada instrucción;
 *   nunca se deriva nada de estado React potencialmente stale.
 * - Toda acción espera al menos "confirmed" y verifica err on-chain; las que
 *   mueven fondos esperan "finalized" antes de reportar éxito.
 * - Las ATAs de payout se crean idempotentemente en la misma transacción.
 */
export function useEscrow() {
  const { wallet } = useWalletConnection();
  const { send } = useSendTransaction();
  const client = useSolanaClient();
  const [stage, setStage] = useState<EscrowStage>("idle");

  const walletAddress = wallet?.account.address as Address | undefined;
  const rpc = client.runtime.rpc;

  const requireSigner = useCallback((): {
    signer: TransactionSigner;
    addr: Address;
  } => {
    if (!walletAddress) throw new Error("Connect your wallet first");
    // El firmado real lo hace send() con la wallet conectada; el noop signer
    // solo satisface el TransactionSigner de los builders de Codama.
    return { signer: createNoopSigner(walletAddress), addr: walletAddress };
  }, [walletAddress]);

  const sendAndAwait = useCallback(
    async (
      instructions: Instruction[],
      commitment: "confirmed" | "finalized",
    ): Promise<Signature> => {
      setStage("sending");
      try {
        const signature = await send({ instructions });
        setStage(commitment === "finalized" ? "finalizing" : "confirming");
        await awaitSignatureCommitment(rpc, signature, commitment);
        return signature;
      } catch (err) {
        throw new Error(mapEscrowError(err));
      } finally {
        setStage("idle");
      }
    },
    [send, rpc],
  );

  /** Job fresco de la red (Task 3.3: refetch antes de derivar/enviar). */
  const freshJob = useCallback(
    async (jobAddress: Address) => {
      const job = await fetchJob(rpc, jobAddress);
      return job.data;
    },
    [rpc],
  );

  // ── Crear + fondear (una sola transacción, atómico) ──────────────────────
  const createAndFundJob = useCallback(
    async (form: {
      freelancer: string;
      amount: bigint;
      brief: string;
      reviewWindowSecs: number;
    }): Promise<{ jobAddress: Address; signature: Signature }> => {
      const { signer, addr } = requireSigner();
      const freelancer = address(form.freelancer.trim());
      const mint = address(USDC_MINT);

      // Config fresco: feeBps del snapshot debe ser el vigente.
      const config = await fetchConfig(rpc, await deriveConfigPda());

      const jobId = randomJobId();
      const jobAddress = await deriveJobPda(addr, jobId);
      const termsHash = await sha256Utf8(form.brief);
      const clientToken = await ata(mint, addr);

      const createIx = await getCreateJobInstructionAsync({
        client: signer,
        mint,
        jobId,
        freelancer,
        amount: form.amount,
        feeBpsSnapshot: config.data.feeBps,
        termsHash,
        reviewWindowSecs: form.reviewWindowSecs,
      });
      const fundIx = await getFundJobInstructionAsync({
        client: signer,
        job: jobAddress,
        mint,
        clientToken,
      });

      const signature = await sendAndAwait([createIx, fundIx], "finalized");
      return { jobAddress, signature };
    },
    [requireSigner, rpc, sendAndAwait],
  );

  // ── Freelancer entrega ────────────────────────────────────────────────────
  const markDelivered = useCallback(
    async (jobAddress: Address, deliveryRef: string): Promise<Signature> => {
      const { signer } = requireSigner();
      if (!deliveryRef.trim()) {
        throw new Error("Provide the delivery reference (URL or description)");
      }
      const deliveryHash = await sha256Utf8(deliveryRef);
      const ix = getMarkDeliveredInstruction({
        freelancer: signer,
        job: jobAddress,
        deliveryHash,
      });
      return sendAndAwait([ix], "confirmed");
    },
    [requireSigner, sendAndAwait],
  );

  // ── Payout compartido: release / claim timeout ────────────────────────────
  const releaseWith = useCallback(
    async (
      jobAddress: Address,
      build: typeof getApproveReleaseInstructionAsync,
    ): Promise<Signature> => {
      const { signer } = requireSigner();
      const job = await freshJob(jobAddress);
      const config = await fetchConfig(rpc, await deriveConfigPda());

      const freelancerToken = await ata(job.mint, job.freelancer);
      const treasuryToken = await ata(job.mint, config.data.treasury);

      const ensureAtas = await Promise.all([
        getCreateAssociatedTokenIdempotentInstructionAsync({
          payer: signer,
          owner: job.freelancer,
          mint: job.mint,
        }),
        getCreateAssociatedTokenIdempotentInstructionAsync({
          payer: signer,
          owner: config.data.treasury,
          mint: job.mint,
        }),
      ]);

      const ix = await build({
        signer,
        job: jobAddress,
        mint: job.mint,
        freelancerToken,
        treasuryToken,
      });
      return sendAndAwait([...ensureAtas, ix], "finalized");
    },
    [requireSigner, freshJob, rpc, sendAndAwait],
  );

  const approveRelease = useCallback(
    (jobAddress: Address) =>
      releaseWith(jobAddress, getApproveReleaseInstructionAsync),
    [releaseWith],
  );

  const claimTimeout = useCallback(
    (jobAddress: Address) =>
      releaseWith(jobAddress, getClaimTimeoutInstructionAsync),
    [releaseWith],
  );

  // ── Client cancela / reembolso ────────────────────────────────────────────
  const cancelRefund = useCallback(
    async (jobAddress: Address): Promise<Signature> => {
      const { signer } = requireSigner();
      const job = await freshJob(jobAddress);
      const clientToken = await ata(job.mint, job.client);

      const ensureAta = await getCreateAssociatedTokenIdempotentInstructionAsync({
        payer: signer,
        owner: job.client,
        mint: job.mint,
      });
      const ix = await getCancelRefundInstructionAsync({
        client: signer,
        job: jobAddress,
        mint: job.mint,
        clientToken,
      });
      return sendAndAwait([ensureAta, ix], "finalized");
    },
    [requireSigner, freshJob, sendAndAwait],
  );

  // ── Disputas ──────────────────────────────────────────────────────────────
  const openDispute = useCallback(
    async (jobAddress: Address): Promise<Signature> => {
      const { signer } = requireSigner();
      const ix = getOpenDisputeInstruction({ signer, job: jobAddress });
      return sendAndAwait([ix], "confirmed");
    },
    [requireSigner, sendAndAwait],
  );

  const resolveDispute = useCallback(
    async (
      jobAddress: Address,
      freelancerAmount: bigint,
    ): Promise<Signature> => {
      const { signer } = requireSigner();
      const job = await freshJob(jobAddress);
      const config = await fetchConfig(rpc, await deriveConfigPda());

      const [freelancerToken, clientToken, treasuryToken] = await Promise.all([
        ata(job.mint, job.freelancer),
        ata(job.mint, job.client),
        ata(job.mint, config.data.treasury),
      ]);
      const ensureAtas = await Promise.all(
        [job.freelancer, job.client, config.data.treasury].map((owner) =>
          getCreateAssociatedTokenIdempotentInstructionAsync({
            payer: signer,
            owner,
            mint: job.mint,
          }),
        ),
      );

      const ix = await getResolveDisputeInstructionAsync({
        arbiter: signer,
        job: jobAddress,
        mint: job.mint,
        freelancerToken,
        clientToken,
        treasuryToken,
        freelancerAmount,
      });
      return sendAndAwait([...ensureAtas, ix], "finalized");
    },
    [requireSigner, freshJob, rpc, sendAndAwait],
  );

  return {
    walletAddress,
    isConnected: !!walletAddress,
    stage,
    isBusy: stage !== "idle",
    createAndFundJob,
    markDelivered,
    approveRelease,
    claimTimeout,
    cancelRefund,
    openDispute,
    resolveDispute,
  };
}

export type { Job };
