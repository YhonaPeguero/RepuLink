import { useCallback, useRef, useState } from "react";
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
import {
  fetchJob,
  fetchMaybeJob,
  type Job,
} from "../generated/repulink/accounts/job";
import { fetchConfig } from "../generated/repulink/accounts/config";
import { USDC_MINT } from "../config";
import {
  awaitSignatureCommitment,
  TransactionFailedError,
} from "../lib/confirm";
import { mapEscrowError } from "../lib/escrow-errors";
import { sha256Utf8 } from "../lib/usdc";

/** Error de acción con el error original preservado para inspección. */
export class EscrowActionError extends Error {
  constructor(message: string, public readonly original: unknown) {
    super(message);
    this.name = "EscrowActionError";
  }
}

export type EscrowStage =
  | "idle"
  | "preparing"
  | "sending"
  | "confirming"
  | "finalizing";

/** Intento de creación pendiente: mantiene el jobId estable entre reintentos
 * para que un resultado ambiguo (timeout post-envío) nunca produzca un
 * segundo escrow — el retry apunta al mismo Job PDA. */
type PendingCreate = { jobId: string; jobAddress: string; signature?: string };

function pendingCreateKey(wallet: Address): string {
  return `repulink:pending-create:${wallet}`;
}

function loadPendingCreate(wallet: Address): PendingCreate | null {
  try {
    const raw = sessionStorage.getItem(pendingCreateKey(wallet));
    return raw ? (JSON.parse(raw) as PendingCreate) : null;
  } catch {
    return null;
  }
}

function savePendingCreate(wallet: Address, pending: PendingCreate): void {
  sessionStorage.setItem(pendingCreateKey(wallet), JSON.stringify(pending));
}

function clearPendingCreate(wallet: Address): void {
  sessionStorage.removeItem(pendingCreateKey(wallet));
}

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
  const lockRef = useRef(false);

  const walletAddress = wallet?.account.address as Address | undefined;
  const rpc = client.runtime.rpc;

  /** Mutex síncrono: se adquiere antes del primer await de cualquier acción,
   * así dos clicks/submits solapados no pueden enviar dos transacciones. */
  const runExclusive = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      if (lockRef.current) {
        throw new Error("Another action is already in progress");
      }
      lockRef.current = true;
      setStage("preparing");
      try {
        return await fn();
      } finally {
        lockRef.current = false;
        setStage("idle");
      }
    },
    [],
  );

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
      onSent?: (signature: Signature) => void,
    ): Promise<Signature> => {
      setStage("sending");
      try {
        const signature = await send({ instructions });
        onSent?.(signature);
        setStage(commitment === "finalized" ? "finalizing" : "confirming");
        await awaitSignatureCommitment(rpc, signature, commitment);
        return signature;
      } catch (err) {
        throw new EscrowActionError(mapEscrowError(err), err);
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
    (form: {
      freelancer: string;
      amount: bigint;
      brief: string;
      reviewWindowSecs: number;
    }): Promise<{ jobAddress: Address; signature?: Signature }> =>
      runExclusive(async () => {
        const { signer, addr } = requireSigner();
        const freelancer = address(form.freelancer.trim());
        const mint = address(USDC_MINT);

        // Reconciliación: si un intento anterior quedó en resultado ambiguo
        // (timeout post-envío), resolverlo antes de crear nada nuevo.
        const pending = loadPendingCreate(addr);
        if (pending) {
          const existing = await fetchMaybeJob(rpc, address(pending.jobAddress));
          if (existing.exists) {
            clearPendingCreate(addr);
            return {
              jobAddress: address(pending.jobAddress),
              signature: pending.signature as Signature | undefined,
            };
          }
          // El job no existe aún: se reutiliza el mismo jobId (mismo PDA).
          // Si la tx anterior aterrizara después, esta fallará on-chain en
          // vez de fondear un segundo escrow.
        }
        const jobId = pending ? BigInt(pending.jobId) : randomJobId();
        const jobAddress = await deriveJobPda(addr, jobId);

        // Config fresco: feeBps del snapshot debe ser el vigente.
        const config = await fetchConfig(rpc, await deriveConfigPda());
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

        savePendingCreate(addr, { jobId: jobId.toString(), jobAddress });
        try {
          const signature = await sendAndAwait(
            [createIx, fundIx],
            "finalized",
            (sig) =>
              savePendingCreate(addr, {
                jobId: jobId.toString(),
                jobAddress,
                signature: sig,
              }),
          );
          clearPendingCreate(addr);
          return { jobAddress, signature };
        } catch (err) {
          // Fallo definitivo on-chain → no hay job; permitir intento limpio.
          // Resultado desconocido (timeout) → conservar el intento para
          // reconciliar en el siguiente submit.
          if (
            err instanceof EscrowActionError &&
            err.original instanceof TransactionFailedError
          ) {
            clearPendingCreate(addr);
          }
          throw err;
        }
      }),
    [requireSigner, rpc, sendAndAwait, runExclusive],
  );

  // ── Freelancer entrega ────────────────────────────────────────────────────
  const markDelivered = useCallback(
    (jobAddress: Address, deliveryRef: string): Promise<Signature> =>
      runExclusive(async () => {
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
      }),
    [requireSigner, sendAndAwait, runExclusive],
  );

  // ── Payout compartido: release / claim timeout ────────────────────────────
  const releaseWith = useCallback(
    (
      jobAddress: Address,
      build: typeof getApproveReleaseInstructionAsync,
    ): Promise<Signature> =>
      runExclusive(async () => {
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
      }),
    [requireSigner, freshJob, rpc, sendAndAwait, runExclusive],
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
    (jobAddress: Address): Promise<Signature> =>
      runExclusive(async () => {
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
      }),
    [requireSigner, freshJob, sendAndAwait, runExclusive],
  );

  // ── Disputas ──────────────────────────────────────────────────────────────
  const openDispute = useCallback(
    (jobAddress: Address): Promise<Signature> =>
      runExclusive(async () => {
        const { signer } = requireSigner();
        const ix = getOpenDisputeInstruction({ signer, job: jobAddress });
        return sendAndAwait([ix], "confirmed");
      }),
    [requireSigner, sendAndAwait, runExclusive],
  );

  const resolveDispute = useCallback(
    (
      jobAddress: Address,
      freelancerAmount: bigint,
    ): Promise<Signature> =>
      runExclusive(async () => {
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
      }),
    [requireSigner, freshJob, rpc, sendAndAwait, runExclusive],
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
