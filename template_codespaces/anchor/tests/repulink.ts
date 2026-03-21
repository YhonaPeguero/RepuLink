import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Repulink } from "../target/types/repulink";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("repulink", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Repulink as Program<Repulink>;
  const freelancer = provider.wallet;

  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), freelancer.publicKey.toBuffer()],
    program.programId
  );

  before(async () => {
    // No airdrop needed — provider wallet already has SOL on devnet
  });

  it("Creates a freelancer profile successfully", async () => {
    await program.methods
      .initializeProfile("alice_dev")
      .accounts({
        owner: freelancer.publicKey,
        profile: profilePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const profileAccount = await program.account.freelancerProfile.fetch(profilePda);
    assert.equal(profileAccount.username, "alice_dev");
    assert.equal(profileAccount.badgeCount, 0);
    assert.ok(profileAccount.owner.equals(freelancer.publicKey));
  });

  it("Creates a badge with Pending status", async () => {
    const badgeIndex = 0;
    const [badgePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("badge"),
        freelancer.publicKey.toBuffer(),
        new anchor.BN(badgeIndex).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    await program.methods
      .createBadge(
        "Smart Contract Audit",
        "Audited the DeFi vaulting protocol for security vulnerabilities",
        "Bob Client",
        "bob@example.com"
      )
      .accounts({
        owner: freelancer.publicKey,
        profile: profilePda,
        badge: badgePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const badgeAccount = await program.account.badge.fetch(badgePda);
    assert.equal(badgeAccount.title, "Smart Contract Audit");
    assert.equal(badgeAccount.clientName, "Bob Client");
    assert.deepEqual(badgeAccount.status, { pending: {} });
    assert.isNull(badgeAccount.approvedAt);
  });

  it("Client approves the badge → status becomes Approved", async () => {
    const badgeIndex = 0;
    const [badgePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("badge"),
        freelancer.publicKey.toBuffer(),
        new anchor.BN(badgeIndex).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    await program.methods
      .approveBadge(badgeIndex)
      .accounts({
        reviewer: freelancer.publicKey,
        freelancer: freelancer.publicKey,
        badge: badgePda,
      })
      .rpc();

    const badgeAccount = await program.account.badge.fetch(badgePda);
    assert.deepEqual(badgeAccount.status, { approved: {} });
    assert.isNotNull(badgeAccount.approvedAt);
  });

  it("Cannot approve an already approved badge → expect BadgeNotPending error", async () => {
    const badgeIndex = 0;
    const [badgePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("badge"),
        freelancer.publicKey.toBuffer(),
        new anchor.BN(badgeIndex).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    try {
      await program.methods
        .approveBadge(badgeIndex)
        .accounts({
          reviewer: freelancer.publicKey,
          freelancer: freelancer.publicKey,
          badge: badgePda,
        })
        .rpc();

      assert.fail("Expected transaction to fail with BadgeNotPending error");
    } catch (err: any) {
      const anchorError = anchor.AnchorError.parse(err.logs);
      assert.isNotNull(anchorError, "Expected an AnchorError");
      assert.equal(anchorError!.error.errorCode.code, "BadgeNotPending");
    }
  });
});