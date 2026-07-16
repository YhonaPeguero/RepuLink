//! LiteSVM integration tests for the escrow flow (Fase 1).
//! Loads the compiled program from target/deploy — run `cargo build-sbf` first.

use anchor_lang::{InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use repulink::accounts as accs;
use repulink::instruction as ix;
use solana_sdk::{
    clock::Clock,
    instruction::{AccountMeta, Instruction},
    program_pack::Pack,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};
use spl_associated_token_account::get_associated_token_address;

const SOL: u64 = 1_000_000_000;
const FEE_BPS: u16 = 150; // 1.5%
const ONE_DAY: u32 = 86_400;
const SEVEN_DAYS: u32 = 604_800;
// Deliberately does not divide evenly by the fee: 1_000_001 * 150 / 10_000
// truncates to 15_000, leaving the remainder on the freelancer side.
const AMOUNT: u64 = 1_000_001;
const EXPECTED_FEE: u64 = 15_000;

struct Env {
    svm: LiteSVM,
    admin: Keypair,
    arbiter: Keypair,
    treasury: Keypair,
    client: Keypair,
    freelancer: Keypair,
    mint: Pubkey,
}

fn config_pda() -> Pubkey {
    Pubkey::find_program_address(&[b"config"], &repulink::ID).0
}

fn job_pda(client: &Pubkey, job_id: u64) -> Pubkey {
    Pubkey::find_program_address(
        &[b"job", client.as_ref(), &job_id.to_le_bytes()],
        &repulink::ID,
    )
    .0
}

fn vault_ata(job: &Pubkey, mint: &Pubkey) -> Pubkey {
    get_associated_token_address(job, mint)
}

impl Env {
    fn send(&mut self, payer: &Keypair, instructions: &[Instruction]) -> Result<(), String> {
        let tx = Transaction::new_signed_with_payer(
            instructions,
            Some(&payer.pubkey()),
            &[payer],
            self.svm.latest_blockhash(),
        );
        let result = self
            .svm
            .send_transaction(tx)
            .map(|_| ())
            .map_err(|failed| failed.meta.logs.join("\n"));
        // Avoid AlreadyProcessed on identical retried transactions.
        self.svm.expire_blockhash();
        result
    }

    fn send_as_client(&mut self, instructions: &[Instruction]) -> Result<(), String> {
        let payer = self.client.insecure_clone();
        self.send(&payer, instructions)
    }

    fn send_as_freelancer(&mut self, instructions: &[Instruction]) -> Result<(), String> {
        let payer = self.freelancer.insecure_clone();
        self.send(&payer, instructions)
    }

    fn token_balance(&self, token_account: &Pubkey) -> u64 {
        let account = self.svm.get_account(token_account).expect("token account");
        spl_token::state::Account::unpack(&account.data)
            .expect("unpack token account")
            .amount
    }

    fn client_ata(&self) -> Pubkey {
        get_associated_token_address(&self.client.pubkey(), &self.mint)
    }

    fn freelancer_ata(&self) -> Pubkey {
        get_associated_token_address(&self.freelancer.pubkey(), &self.mint)
    }

    fn treasury_ata(&self) -> Pubkey {
        get_associated_token_address(&self.treasury.pubkey(), &self.mint)
    }

    /// Advances the on-chain clock by `secs`.
    fn warp_seconds(&mut self, secs: i64) {
        let mut clock: Clock = self.svm.get_sysvar();
        clock.unix_timestamp += secs;
        self.svm.set_sysvar(&clock);
    }

    fn create_job_ix(&self, job_id: u64, freelancer: Pubkey, review_window: u32) -> Instruction {
        let job = job_pda(&self.client.pubkey(), job_id);
        Instruction {
            program_id: repulink::ID,
            accounts: accs::CreateJob {
                client: self.client.pubkey(),
                config: config_pda(),
                mint: self.mint,
                job,
                vault: vault_ata(&job, &self.mint),
                token_program: spl_token::ID,
                associated_token_program: spl_associated_token_account::ID,
                system_program: solana_sdk::system_program::ID,
            }
            .to_account_metas(None),
            data: ix::CreateJob {
                job_id,
                freelancer,
                amount: AMOUNT,
                fee_bps_snapshot: FEE_BPS,
                terms_hash: [7u8; 32],
                review_window_secs: review_window,
            }
            .data(),
        }
    }

    fn fund_job_ix(&self, job_id: u64) -> Instruction {
        let job = job_pda(&self.client.pubkey(), job_id);
        Instruction {
            program_id: repulink::ID,
            accounts: accs::FundJob {
                client: self.client.pubkey(),
                job,
                mint: self.mint,
                vault: vault_ata(&job, &self.mint),
                client_token: self.client_ata(),
                token_program: spl_token::ID,
            }
            .to_account_metas(None),
            data: ix::FundJob {}.data(),
        }
    }

    fn mark_delivered_ix(&self, job_id: u64, signer: Pubkey) -> Instruction {
        Instruction {
            program_id: repulink::ID,
            accounts: accs::MarkDelivered {
                freelancer: signer,
                job: job_pda(&self.client.pubkey(), job_id),
            }
            .to_account_metas(None),
            data: ix::MarkDelivered {
                delivery_hash: [9u8; 32],
            }
            .data(),
        }
    }

    fn release_accounts(&self, job_id: u64, signer: Pubkey) -> Vec<AccountMeta> {
        let job = job_pda(&self.client.pubkey(), job_id);
        accs::ReleaseJob {
            signer,
            config: config_pda(),
            job,
            mint: self.mint,
            vault: vault_ata(&job, &self.mint),
            freelancer_token: self.freelancer_ata(),
            treasury_token: self.treasury_ata(),
            token_program: spl_token::ID,
        }
        .to_account_metas(None)
    }

    fn approve_release_ix(&self, job_id: u64, signer: Pubkey) -> Instruction {
        Instruction {
            program_id: repulink::ID,
            accounts: self.release_accounts(job_id, signer),
            data: ix::ApproveRelease {}.data(),
        }
    }

    fn claim_timeout_ix(&self, job_id: u64, signer: Pubkey) -> Instruction {
        Instruction {
            program_id: repulink::ID,
            accounts: self.release_accounts(job_id, signer),
            data: ix::ClaimTimeout {}.data(),
        }
    }

    fn cancel_refund_ix(&self, job_id: u64, signer: Pubkey) -> Instruction {
        let job = job_pda(&self.client.pubkey(), job_id);
        Instruction {
            program_id: repulink::ID,
            accounts: accs::CancelRefund {
                client: signer,
                job,
                mint: self.mint,
                vault: vault_ata(&job, &self.mint),
                client_token: self.client_ata(),
                token_program: spl_token::ID,
            }
            .to_account_metas(None),
            data: ix::CancelRefund {}.data(),
        }
    }

    fn open_dispute_ix(&self, job_id: u64, signer: Pubkey) -> Instruction {
        Instruction {
            program_id: repulink::ID,
            accounts: accs::OpenDispute {
                signer,
                job: job_pda(&self.client.pubkey(), job_id),
            }
            .to_account_metas(None),
            data: ix::OpenDispute {}.data(),
        }
    }

    fn resolve_dispute_ix(&self, job_id: u64, signer: Pubkey, freelancer_amount: u64) -> Instruction {
        let job = job_pda(&self.client.pubkey(), job_id);
        Instruction {
            program_id: repulink::ID,
            accounts: accs::ResolveDispute {
                arbiter: signer,
                config: config_pda(),
                job,
                mint: self.mint,
                vault: vault_ata(&job, &self.mint),
                freelancer_token: self.freelancer_ata(),
                client_token: self.client_ata(),
                treasury_token: self.treasury_ata(),
                token_program: spl_token::ID,
            }
            .to_account_metas(None),
            data: ix::ResolveDispute { freelancer_amount }.data(),
        }
    }

    fn close_job_ix(&self, job_id: u64, signer: Pubkey) -> Instruction {
        let job = job_pda(&self.client.pubkey(), job_id);
        Instruction {
            program_id: repulink::ID,
            accounts: accs::CloseJob {
                client: signer,
                job,
                mint: self.mint,
                vault: vault_ata(&job, &self.mint),
                client_token: self.client_ata(),
                token_program: spl_token::ID,
            }
            .to_account_metas(None),
            data: ix::CloseJob {}.data(),
        }
    }

    /// create + fund (atomic, like the frontend) and mark_delivered.
    fn setup_delivered_job(&mut self, job_id: u64) {
        let create = self.create_job_ix(job_id, self.freelancer.pubkey(), SEVEN_DAYS);
        let fund = self.fund_job_ix(job_id);
        self.send_as_client(&[create, fund]).unwrap();
        let deliver = self.mark_delivered_ix(job_id, self.freelancer.pubkey());
        self.send_as_freelancer(&[deliver]).unwrap();
    }
}

fn setup() -> Env {
    let mut svm = LiteSVM::new();
    let so_path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../target/deploy/repulink.so"
    );
    svm.add_program_from_file(repulink::ID, so_path)
        .expect("failed to load repulink.so — run cargo build-sbf first");

    let admin = Keypair::new();
    let arbiter = Keypair::new();
    let treasury = Keypair::new();
    let client = Keypair::new();
    let freelancer = Keypair::new();
    for kp in [&admin, &arbiter, &treasury, &client, &freelancer] {
        svm.airdrop(&kp.pubkey(), 10 * SOL).unwrap();
    }

    // Mint with 6 decimals (USDC-like), authority = admin.
    let mint_kp = Keypair::new();
    let mint = mint_kp.pubkey();
    let rent = svm.minimum_balance_for_rent_exemption(spl_token::state::Mint::LEN);
    let create_mint = [
        system_instruction::create_account(
            &admin.pubkey(),
            &mint,
            rent,
            spl_token::state::Mint::LEN as u64,
            &spl_token::ID,
        ),
        spl_token::instruction::initialize_mint(&spl_token::ID, &mint, &admin.pubkey(), None, 6)
            .unwrap(),
    ];
    let tx = Transaction::new_signed_with_payer(
        &create_mint,
        Some(&admin.pubkey()),
        &[&admin, &mint_kp],
        svm.latest_blockhash(),
    );
    svm.send_transaction(tx).unwrap();

    let mut env = Env {
        svm,
        admin,
        arbiter,
        treasury,
        client,
        freelancer,
        mint,
    };

    // ATAs for client, freelancer and treasury; client starts with 10 USDC.
    let admin_kp = env.admin.insecure_clone();
    for owner in [
        env.client.pubkey(),
        env.freelancer.pubkey(),
        env.treasury.pubkey(),
    ] {
        let create_ata =
            spl_associated_token_account::instruction::create_associated_token_account(
                &admin_kp.pubkey(),
                &owner,
                &env.mint,
                &spl_token::ID,
            );
        env.send(&admin_kp, &[create_ata]).unwrap();
    }
    let mint_to = spl_token::instruction::mint_to(
        &spl_token::ID,
        &env.mint,
        &env.client_ata(),
        &admin_kp.pubkey(),
        &[],
        10_000_000,
    )
    .unwrap();
    env.send(&admin_kp, &[mint_to]).unwrap();

    // Escrow config: fee 1.5%, arbiter and treasury wallets.
    let init = Instruction {
        program_id: repulink::ID,
        accounts: accs::InitConfig {
            admin: admin_kp.pubkey(),
            config: config_pda(),
            program: repulink::ID,
            program_data: None,
            system_program: solana_sdk::system_program::ID,
        }
        .to_account_metas(None),
        data: ix::InitConfig {
            arbiter: env.arbiter.pubkey(),
            treasury: env.treasury.pubkey(),
            fee_bps: FEE_BPS,
        }
        .data(),
    };
    // NOTE: under LiteSVM the program is loaded with the non-upgradeable
    // loader, so there is no ProgramData account and the upgrade-authority
    // gate of init_config is skipped (program_data: None). On devnet the
    // gate is enforced against the deployer wallet.
    env.send(&admin_kp, &[init]).unwrap();

    env
}

// ── 1. Happy path ─────────────────────────────────────────────────────────────

#[test]
fn happy_path_create_fund_deliver_release() {
    let mut env = setup();
    let job_id = 1u64;

    env.setup_delivered_job(job_id);

    let vault = vault_ata(&job_pda(&env.client.pubkey(), job_id), &env.mint);
    assert_eq!(env.token_balance(&vault), AMOUNT);

    let release = env.approve_release_ix(job_id, env.client.pubkey());
    env.send_as_client(&[release]).unwrap();

    assert_eq!(env.token_balance(&env.treasury_ata()), EXPECTED_FEE);
    assert_eq!(
        env.token_balance(&env.freelancer_ata()),
        AMOUNT - EXPECTED_FEE
    );
    assert_eq!(env.token_balance(&vault), 0);

    // A third party dusts the vault directly; close_job must sweep the
    // residue to the client instead of getting blocked.
    let admin = env.admin.insecure_clone();
    let dust = spl_token::instruction::mint_to(
        &spl_token::ID,
        &env.mint,
        &vault,
        &admin.pubkey(),
        &[],
        1,
    )
    .unwrap();
    env.send(&admin, &[dust]).unwrap();
    let client_before = env.token_balance(&env.client_ata());

    // close_job returns the rent and removes the accounts.
    let close = env.close_job_ix(job_id, env.client.pubkey());
    env.send_as_client(&[close]).unwrap();
    assert!(env
        .svm
        .get_account(&job_pda(&env.client.pubkey(), job_id))
        .is_none());
    assert!(env.svm.get_account(&vault).is_none());
    assert_eq!(env.token_balance(&env.client_ata()), client_before + 1);
}

// ── 2. Timeout ────────────────────────────────────────────────────────────────

#[test]
fn claim_timeout_after_review_window() {
    let mut env = setup();
    let job_id = 2u64;

    env.setup_delivered_job(job_id);

    // 6 days: not yet.
    env.warp_seconds(6 * ONE_DAY as i64);
    let claim = env.claim_timeout_ix(job_id, env.freelancer.pubkey());
    let logs = env.send_as_freelancer(&[claim]).unwrap_err();
    assert!(logs.contains("ReviewWindowNotElapsed"), "logs:\n{logs}");

    // 7 days total: payout succeeds with the same split as approve_release.
    env.warp_seconds(ONE_DAY as i64);
    let claim = env.claim_timeout_ix(job_id, env.freelancer.pubkey());
    env.send_as_freelancer(&[claim]).unwrap();

    assert_eq!(env.token_balance(&env.treasury_ata()), EXPECTED_FEE);
    assert_eq!(
        env.token_balance(&env.freelancer_ata()),
        AMOUNT - EXPECTED_FEE
    );
}

// ── 3. Refund ─────────────────────────────────────────────────────────────────

#[test]
fn cancel_refund_returns_full_amount() {
    let mut env = setup();
    let job_id = 3u64;

    let initial = env.token_balance(&env.client_ata());

    let create = env.create_job_ix(job_id, env.freelancer.pubkey(), SEVEN_DAYS);
    let fund = env.fund_job_ix(job_id);
    env.send_as_client(&[create, fund]).unwrap();
    assert_eq!(env.token_balance(&env.client_ata()), initial - AMOUNT);

    let cancel = env.cancel_refund_ix(job_id, env.client.pubkey());
    env.send_as_client(&[cancel]).unwrap();
    assert_eq!(env.token_balance(&env.client_ata()), initial);
}

#[test]
fn cancel_refund_fails_after_delivery() {
    let mut env = setup();
    let job_id = 4u64;

    env.setup_delivered_job(job_id);

    let cancel = env.cancel_refund_ix(job_id, env.client.pubkey());
    let logs = env.send_as_client(&[cancel]).unwrap_err();
    assert!(logs.contains("InvalidState"), "logs:\n{logs}");
}

// ── 4. Dispute ────────────────────────────────────────────────────────────────

#[test]
fn dispute_resolved_with_split() {
    let mut env = setup();
    let job_id = 5u64;

    let initial_client = env.token_balance(&env.client_ata());

    env.setup_delivered_job(job_id);

    let open = env.open_dispute_ix(job_id, env.freelancer.pubkey());
    env.send_as_freelancer(&[open]).unwrap();

    // 60/40 split: freelancer_amount = 600_000 of AMOUNT.
    let freelancer_amount = 600_000u64;
    let fee = freelancer_amount * FEE_BPS as u64 / 10_000; // 9_000
    let resolve = env.resolve_dispute_ix(job_id, env.arbiter.pubkey(), freelancer_amount);
    let arbiter = env.arbiter.insecure_clone();
    env.send(&arbiter, &[resolve]).unwrap();

    assert_eq!(env.token_balance(&env.treasury_ata()), fee);
    assert_eq!(
        env.token_balance(&env.freelancer_ata()),
        freelancer_amount - fee
    );
    assert_eq!(
        env.token_balance(&env.client_ata()),
        initial_client - freelancer_amount
    );
}

// ── 5. Authorization ──────────────────────────────────────────────────────────

#[test]
fn strangers_cannot_operate_a_job() {
    let mut env = setup();
    let job_id = 6u64;
    env.setup_delivered_job(job_id);

    let mallory = Keypair::new();
    env.svm.airdrop(&mallory.pubkey(), 10 * SOL).unwrap();

    // fund with mallory as the client account: has_one must reject it.
    let mut fund = env.fund_job_ix(job_id);
    fund.accounts[0] = AccountMeta::new(mallory.pubkey(), true);
    let logs = env.send(&mallory, &[fund]).unwrap_err();
    assert!(logs.contains("Unauthorized"), "logs:\n{logs}");

    let instructions = [
        env.mark_delivered_ix(job_id, mallory.pubkey()),
        env.approve_release_ix(job_id, mallory.pubkey()),
        env.claim_timeout_ix(job_id, mallory.pubkey()),
        env.cancel_refund_ix(job_id, mallory.pubkey()),
        env.open_dispute_ix(job_id, mallory.pubkey()),
        env.resolve_dispute_ix(job_id, mallory.pubkey(), 1),
        env.close_job_ix(job_id, mallory.pubkey()),
    ];
    for instruction in instructions {
        let logs = env.send(&mallory, &[instruction]).unwrap_err();
        assert!(logs.contains("Unauthorized"), "logs:\n{logs}");
    }
}

#[test]
fn roles_cannot_swap_instructions() {
    let mut env = setup();
    let job_id = 7u64;

    let client_pk = env.client.pubkey();
    let freelancer_pk = env.freelancer.pubkey();
    let create = env.create_job_ix(job_id, freelancer_pk, SEVEN_DAYS);
    let fund = env.fund_job_ix(job_id);
    env.send_as_client(&[create, fund]).unwrap();

    // The client cannot mark_delivered.
    let deliver = env.mark_delivered_ix(job_id, client_pk);
    let logs = env.send_as_client(&[deliver]).unwrap_err();
    assert!(logs.contains("Unauthorized"), "logs:\n{logs}");

    let deliver = env.mark_delivered_ix(job_id, freelancer_pk);
    env.send_as_freelancer(&[deliver]).unwrap();

    // The freelancer cannot approve_release.
    let release = env.approve_release_ix(job_id, freelancer_pk);
    let logs = env.send_as_freelancer(&[release]).unwrap_err();
    assert!(logs.contains("Unauthorized"), "logs:\n{logs}");

    // The client cannot claim_timeout.
    env.warp_seconds(SEVEN_DAYS as i64 + 1);
    let claim = env.claim_timeout_ix(job_id, client_pk);
    let logs = env.send_as_client(&[claim]).unwrap_err();
    assert!(logs.contains("Unauthorized"), "logs:\n{logs}");

    // Neither client nor freelancer can resolve_dispute.
    let open = env.open_dispute_ix(job_id, client_pk);
    env.send_as_client(&[open]).unwrap();

    let resolve = env.resolve_dispute_ix(job_id, client_pk, 1);
    let logs = env.send_as_client(&[resolve]).unwrap_err();
    assert!(logs.contains("Unauthorized"), "logs:\n{logs}");

    let resolve = env.resolve_dispute_ix(job_id, freelancer_pk, 1);
    let logs = env.send_as_freelancer(&[resolve]).unwrap_err();
    assert!(logs.contains("Unauthorized"), "logs:\n{logs}");
}

#[test]
fn create_job_rejects_self_dealing_and_bad_inputs() {
    let mut env = setup();

    // freelancer == client
    let create = env.create_job_ix(8, env.client.pubkey(), SEVEN_DAYS);
    let logs = env.send_as_client(&[create]).unwrap_err();
    assert!(logs.contains("SelfDealingNotAllowed"), "logs:\n{logs}");

    // review window out of range (31 days)
    let create = env.create_job_ix(9, env.freelancer.pubkey(), 31 * ONE_DAY);
    let logs = env.send_as_client(&[create]).unwrap_err();
    assert!(logs.contains("InvalidReviewWindow"), "logs:\n{logs}");
}

#[test]
fn vault_substitution_is_rejected() {
    let mut env = setup();
    let job_a = 10u64;
    let job_b = 11u64;

    // Two funded jobs from the same client.
    for id in [job_a, job_b] {
        let create = env.create_job_ix(id, env.freelancer.pubkey(), SEVEN_DAYS);
        let fund = env.fund_job_ix(id);
        env.send_as_client(&[create, fund]).unwrap();
    }

    // cancel_refund on job A pointing at job B's vault must fail the ATA check.
    let mut instruction = env.cancel_refund_ix(job_a, env.client.pubkey());
    let vault_b = vault_ata(&job_pda(&env.client.pubkey(), job_b), &env.mint);
    // accounts: [client, job, mint, vault, client_token, token_program]
    instruction.accounts[3].pubkey = vault_b;
    let logs = env.send_as_client(&[instruction]).unwrap_err();
    assert!(
        logs.contains("ConstraintTokenOwner") || logs.contains("ConstraintAssociated"),
        "logs:\n{logs}"
    );

    // Job PDA of another job_id paired with job A's vault is rejected too:
    // the vault's owner is job A, never the substituted job B.
    let mut instruction = env.cancel_refund_ix(job_a, env.client.pubkey());
    instruction.accounts[1].pubkey = job_pda(&env.client.pubkey(), job_b);
    let logs = env.send_as_client(&[instruction]).unwrap_err();
    assert!(
        logs.contains("ConstraintTokenOwner") || logs.contains("ConstraintSeeds"),
        "logs:\n{logs}"
    );
}

// ── 6. Invalid states ─────────────────────────────────────────────────────────

#[test]
fn invalid_state_transitions_are_rejected() {
    let mut env = setup();
    let job_id = 12u64;

    // Created (unfunded) job.
    let create = env.create_job_ix(job_id, env.freelancer.pubkey(), SEVEN_DAYS);
    env.send_as_client(&[create]).unwrap();

    // deliver from Created.
    let deliver = env.mark_delivered_ix(job_id, env.freelancer.pubkey());
    let logs = env.send_as_freelancer(&[deliver]).unwrap_err();
    assert!(logs.contains("InvalidState"), "logs:\n{logs}");

    // release from Created.
    let release = env.approve_release_ix(job_id, env.client.pubkey());
    let logs = env.send_as_client(&[release]).unwrap_err();
    assert!(logs.contains("InvalidState"), "logs:\n{logs}");

    // close from Created.
    let close = env.close_job_ix(job_id, env.client.pubkey());
    let logs = env.send_as_client(&[close]).unwrap_err();
    assert!(logs.contains("InvalidState"), "logs:\n{logs}");
}

// ── Config ────────────────────────────────────────────────────────────────────

#[test]
fn config_is_admin_gated_and_fee_capped() {
    let mut env = setup();
    let admin = env.admin.insecure_clone();
    let mallory = Keypair::new();
    env.svm.airdrop(&mallory.pubkey(), 10 * SOL).unwrap();

    let update = |env: &Env, signer: Pubkey, fee_bps: u16| Instruction {
        program_id: repulink::ID,
        accounts: accs::UpdateConfig {
            admin: signer,
            config: config_pda(),
        }
        .to_account_metas(None),
        data: ix::UpdateConfig {
            arbiter: env.arbiter.pubkey(),
            treasury: env.treasury.pubkey(),
            fee_bps,
        }
        .data(),
    };

    // Non-admin cannot update.
    let instruction = update(&env, mallory.pubkey(), 100);
    let logs = env.send(&mallory, &[instruction]).unwrap_err();
    assert!(logs.contains("Unauthorized"), "logs:\n{logs}");

    // Fee above 5% is rejected.
    let instruction = update(&env, admin.pubkey(), 501);
    let logs = env.send(&admin, &[instruction]).unwrap_err();
    assert!(logs.contains("FeeTooHigh"), "logs:\n{logs}");

    // Valid update works.
    let instruction = update(&env, admin.pubkey(), 200);
    env.send(&admin, &[instruction]).unwrap();
}
