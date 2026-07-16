import {
  getAddressEncoder,
  getProgramDerivedAddress,
  getU64Encoder,
  type Address,
} from "@solana/kit";
import { REPULINK_PROGRAM_ADDRESS } from "../generated/repulink";

/** PDA del Job igual que el programa: seeds = [b"job", client, job_id le u64]. */
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
