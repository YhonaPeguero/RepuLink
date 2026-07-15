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

  // Use timestamp to avoid PDA collision with previous test runs
  const testUsername = `alice_${Date.now().toString().slice(-6)}`;

  const [profilePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), freelancer.publicKey.toBuffer()],
    program.programId
  );

  it("Creates a freelancer profile successfully", async () => {
    try {
      await program.methods
        .initializeProfile(testUsername)
        .accounts({
          owner: freelancer.publicKey,
          profile: profilePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch (err: any) {
      // Profile may already exist from a previous run — skip
      if (!err.message.includes("already in use")) throw err;
    }

    const profileAccount = await program.account.freelancerProfile.fetch(profilePda);
    assert.ok(profileAccount.owner.equals(freelancer.publicKey));
    assert.ok(profileAccount.badgeCount >= 0);
  });

  it("Creates a badge with Pending status", async () => {
    const profileAccount = await program.account.freelancerProfile.fetch(profilePda);
    const badgeIndex = profileAccount.badgeCount;

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
    assert.isNull(badgeAccount.clientWallet);
  });

  it("Client approves the badge with identity → status becomes Approved", async () => {
    const profileAccount = await program.account.freelancerProfile.fetch(profilePda);
    const badgeIndex = profileAccount.badgeCount - 1;

    const [badgePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("badge"),
        freelancer.publicKey.toBuffer(),
        new anchor.BN(badgeIndex).toArrayLike(Buffer, "le", 4),
      ],
      program.programId
    );

    await program.methods
      .approveBadge(
        badgeIndex,
        "linkedin.com/in/bobclient",
        "@bobclient",
        "bob@example.com"
      )
      .accounts({
        reviewer: freelancer.publicKey,
        freelancer: freelancer.publicKey,
        badge: badgePda,
      })
      .rpc();

    const badgeAccount = await program.account.badge.fetch(badgePda);
    assert.deepEqual(badgeAccount.status, { approved: {} });
    assert.isNotNull(badgeAccount.approvedAt);
    assert.isNotNull(badgeAccount.clientWallet);
    assert.equal(badgeAccount.clientLinkedin, "linkedin.com/in/bobclient");
    assert.equal(badgeAccount.clientTwitter, "@bobclient");
    assert.equal(badgeAccount.clientEmailReviewer, "bob@example.com");
  });

  it("Cannot approve an already approved badge → expect BadgeNotPending error", async () => {
    const profileAccount = await program.account.freelancerProfile.fetch(profilePda);
    const badgeIndex = profileAccount.badgeCount - 1;

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
        .approveBadge(badgeIndex, null, null, null)
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