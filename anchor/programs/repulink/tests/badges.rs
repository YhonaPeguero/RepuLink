//! LiteSVM integration tests for the badge flow (Task 0.4 fixes).
//! Loads the compiled program from target/deploy — run `cargo build-sbf` first.

use anchor_lang::{InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use repulink::accounts as accs;
use repulink::instruction as ix;
use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};

const SOL: u64 = 1_000_000_000;

fn setup() -> (LiteSVM, Keypair) {
    let mut svm = LiteSVM::new();
    let so_path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../target/deploy/repulink.so"
    );
    svm.add_program_from_file(repulink::ID, so_path)
        .expect("failed to load repulink.so — run cargo build-sbf first");
    let owner = Keypair::new();
    svm.airdrop(&owner.pubkey(), 10 * SOL).unwrap();
    (svm, owner)
}

fn profile_pda(owner: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"profile", owner.as_ref()], &repulink::ID).0
}

fn badge_pda(owner: &Pubkey, index: u32) -> Pubkey {
    Pubkey::find_program_address(
        &[b"badge", owner.as_ref(), &index.to_le_bytes()],
        &repulink::ID,
    )
    .0
}

fn send(svm: &mut LiteSVM, signer: &Keypair, instruction: Instruction) -> Result<(), String> {
    let tx = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&signer.pubkey()),
        &[signer],
        svm.latest_blockhash(),
    );
    svm.send_transaction(tx)
        .map(|_| ())
        .map_err(|failed| failed.meta.logs.join("\n"))
}

fn init_profile(svm: &mut LiteSVM, owner: &Keypair) -> Result<(), String> {
    let instruction = Instruction {
        program_id: repulink::ID,
        accounts: accs::InitializeProfile {
            owner: owner.pubkey(),
            profile: profile_pda(&owner.pubkey()),
            system_program: solana_sdk::system_program::ID,
        }
        .to_account_metas(None),
        data: ix::InitializeProfile {
            username: "yhona".to_string(),
        }
        .data(),
    };
    send(svm, owner, instruction)
}

fn create_badge(svm: &mut LiteSVM, owner: &Keypair, index: u32, email: &str) -> Result<(), String> {
    let instruction = Instruction {
        program_id: repulink::ID,
        accounts: accs::CreateBadge {
            owner: owner.pubkey(),
            profile: profile_pda(&owner.pubkey()),
            badge: badge_pda(&owner.pubkey(), index),
            system_program: solana_sdk::system_program::ID,
        }
        .to_account_metas(None),
        data: ix::CreateBadge {
            title: "Landing page".to_string(),
            description: "Built a landing page".to_string(),
            client_name: "ACME".to_string(),
            client_email: email.to_string(),
        }
        .data(),
    };
    send(svm, owner, instruction)
}

fn close_profile(svm: &mut LiteSVM, owner: &Keypair) -> Result<(), String> {
    let instruction = Instruction {
        program_id: repulink::ID,
        accounts: accs::CloseProfile {
            owner: owner.pubkey(),
            profile: profile_pda(&owner.pubkey()),
        }
        .to_account_metas(None),
        data: ix::CloseProfile {}.data(),
    };
    send(svm, owner, instruction)
}

#[test]
fn create_badge_happy_path() {
    let (mut svm, owner) = setup();
    init_profile(&mut svm, &owner).unwrap();
    create_badge(&mut svm, &owner, 0, "client@acme.com").unwrap();

    let badge = svm.get_account(&badge_pda(&owner.pubkey(), 0)).unwrap();
    assert_eq!(badge.owner, repulink::ID);
}

#[test]
fn create_badge_rejects_invalid_client_email() {
    let (mut svm, owner) = setup();
    init_profile(&mut svm, &owner).unwrap();

    let too_long = "a".repeat(121) + "@acme.com"; // 130 bytes > 128
    let logs = create_badge(&mut svm, &owner, 0, &too_long).unwrap_err();
    assert!(logs.contains("InvalidClientEmail"), "logs:\n{logs}");

    let logs = create_badge(&mut svm, &owner, 0, "").unwrap_err();
    assert!(logs.contains("InvalidClientEmail"), "logs:\n{logs}");
}

#[test]
fn close_profile_rejects_profile_with_badges() {
    let (mut svm, owner) = setup();
    init_profile(&mut svm, &owner).unwrap();
    create_badge(&mut svm, &owner, 0, "client@acme.com").unwrap();

    let logs = close_profile(&mut svm, &owner).unwrap_err();
    assert!(logs.contains("ProfileHasBadges"), "logs:\n{logs}");
    assert!(
        svm.get_account(&profile_pda(&owner.pubkey())).is_some(),
        "profile must survive the failed close"
    );
}

#[test]
fn close_profile_succeeds_without_badges() {
    let (mut svm, owner) = setup();
    init_profile(&mut svm, &owner).unwrap();
    close_profile(&mut svm, &owner).unwrap();

    let account = svm.get_account(&profile_pda(&owner.pubkey()));
    assert!(
        account.is_none() || account.unwrap().lamports == 0,
        "profile must be closed"
    );
}
