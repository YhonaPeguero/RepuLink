import { useCallback, useEffect, useState } from "react";
import { useSolanaClient } from "@solana/react-hooks";
import {
  getBase58Decoder,
  getBase64Encoder,
  type Address,
  type Base58EncodedBytes,
} from "@solana/kit";
import {
  JOB_DISCRIMINATOR,
  getJobDecoder,
  type Job,
} from "../generated/repulink/accounts/job";
import { REPULINK_PROGRAM_ADDRESS } from "../generated/repulink";

// Layout de Job: discriminator (8) + job_id (8) + client (32) + freelancer (32).
const CLIENT_OFFSET = 16n;
const FREELANCER_OFFSET = 48n;

export type MyJob = {
  address: Address;
  account: Job;
  role: "client" | "freelancer";
};

export function useMyJobs(walletAddress: Address | undefined) {
  const client = useSolanaClient();
  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!walletAddress) {
      setJobs([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { rpc } = client.runtime;
      const discriminator = getBase58Decoder().decode(
        JOB_DISCRIMINATOR
      ) as Base58EncodedBytes;
      const wallet = walletAddress.toString() as Base58EncodedBytes;

      const fetchByParty = (offset: bigint) =>
        rpc
          .getProgramAccounts(REPULINK_PROGRAM_ADDRESS, {
            encoding: "base64",
            filters: [
              {
                memcmp: {
                  offset: 0n,
                  bytes: discriminator,
                  encoding: "base58",
                },
              },
              {
                memcmp: {
                  offset,
                  bytes: wallet,
                  encoding: "base58",
                },
              },
            ],
          })
          .send();

      const [asClient, asFreelancer] = await Promise.all([
        fetchByParty(CLIENT_OFFSET),
        fetchByParty(FREELANCER_OFFSET),
      ]);

      const decoder = getJobDecoder();
      const base64 = getBase64Encoder();
      const byAddress = new Map<string, MyJob>();

      for (const [role, accounts] of [
        ["client", asClient],
        ["freelancer", asFreelancer],
      ] as const) {
        for (const { pubkey, account } of accounts) {
          const address = pubkey as Address;
          if (byAddress.has(address)) continue;
          byAddress.set(address, {
            address,
            account: decoder.decode(base64.encode(account.data[0])),
            role,
          });
        }
      }

      setJobs(
        [...byAddress.values()].sort((a, b) =>
          a.account.createdAt === b.account.createdAt
            ? 0
            : a.account.createdAt > b.account.createdAt
              ? -1
              : 1
        )
      );
    } catch (err) {
      setJobs([]);
      setError(
        err instanceof Error ? err.message : "Failed to fetch escrow jobs"
      );
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, client]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { jobs, isLoading, error, refetch };
}
