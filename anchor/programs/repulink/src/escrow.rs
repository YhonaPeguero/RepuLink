//! Escrow accounts, contexts, events and payout helpers.
//! Instruction handlers live in the `#[program]` module in lib.rs.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount};

use crate::RepulinkError;

pub const MAX_FEE_BPS: u16 = 500; // 5%
pub const MIN_REVIEW_WINDOW_SECS: u32 = 86_400; // 1 day
pub const MAX_REVIEW_WINDOW_SECS: u32 = 2_592_000; // 30 days
pub const BPS_DENOMINATOR: u64 = 10_000;

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct Config {
    pub admin: Pubkey,    // who can update config
    pub arbiter: Pubkey,  // RepuLink wallet for disputes
    pub treasury: Pubkey, // wallet that receives fees (via its token account)
    pub fee_bps: u16,     // 150 = 1.5%; copied into the Job at creation
    pub bump: u8,
}

impl Config {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 2 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum JobState {
    Created,
    Funded,
    Delivered,
    Released,
    Refunded,
    Disputed,
    Resolved,
}

#[account]
pub struct Job {
    pub job_id: u64,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub arbiter: Pubkey, // copied from Config at creation
    pub mint: Pubkey,
    pub amount: u64,
    pub fee_bps: u16, // copied from Config at creation
    pub state: JobState,
    pub created_at: i64,
    pub funded_at: i64,
    pub delivered_at: i64,
    pub review_window_secs: u32,
    pub terms_hash: [u8; 32],    // SHA-256 of the agreed brief (off-chain)
    pub delivery_hash: [u8; 32], // SHA-256 of the delivery, set in mark_delivered
    pub bump: u8,
}

impl Job {
    /// Discriminator(8) + u64(8) + Pubkey(32)*4 + u64(8) + u16(2) + state(1)
    /// + i64(8)*3 + u32(4) + [u8;32]*2 + u8(1)
    pub const SPACE: usize = 8 + 8 + 32 * 4 + 8 + 2 + 1 + 8 * 3 + 4 + 32 + 32 + 1;
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct JobCreated {
    pub job: Pubkey,
    pub client: Pubkey,
    pub freelancer: Pubkey,
    pub state: JobState,
    pub timestamp: i64,
}

#[event]
pub struct JobFunded {
    pub job: Pubkey,
    pub state: JobState,
    pub timestamp: i64,
}

#[event]
pub struct JobDelivered {
    pub job: Pubkey,
    pub state: JobState,
    pub timestamp: i64,
}

#[event]
pub struct JobReleased {
    pub job: Pubkey,
    pub state: JobState,
    pub timestamp: i64,
}

#[event]
pub struct JobRefunded {
    pub job: Pubkey,
    pub state: JobState,
    pub timestamp: i64,
}

#[event]
pub struct JobDisputed {
    pub job: Pubkey,
    pub state: JobState,
    pub timestamp: i64,
}

#[event]
pub struct JobResolved {
    pub job: Pubkey,
    pub state: JobState,
    pub timestamp: i64,
}

// ── Contexts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = Config::SPACE,
        seeds = [b"config"],
        bump,
    )]
    pub config: Account<'info, Config>,

    /// The repulink program itself; used to locate its ProgramData account
    /// so init_config can be gated to the upgrade authority (anti front-run).
    pub program: Program<'info, crate::program::Repulink>,

    /// ProgramData of the repulink program. Required when the program is
    /// deployed with the upgradeable loader (devnet); absent under test
    /// runtimes that load programs with the non-upgradeable loader.
    pub program_data: Option<Account<'info, ProgramData>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = admin @ RepulinkError::Unauthorized,
    )]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
#[instruction(job_id: u64)]
pub struct CreateJob<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = client,
        space = Job::SPACE,
        seeds = [b"job", client.key().as_ref(), &job_id.to_le_bytes()],
        bump,
    )]
    pub job: Account<'info, Job>,

    #[account(
        init,
        payer = client,
        associated_token::mint = mint,
        associated_token::authority = job,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundJob<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        mut,
        seeds = [b"job", job.client.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
        has_one = client @ RepulinkError::Unauthorized,
        has_one = mint,
    )]
    pub job: Account<'info, Job>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = job,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = client_token.owner == client.key() @ RepulinkError::Unauthorized,
        constraint = client_token.mint == job.mint,
    )]
    pub client_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MarkDelivered<'info> {
    pub freelancer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"job", job.client.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
        has_one = freelancer @ RepulinkError::Unauthorized,
    )]
    pub job: Account<'info, Job>,
}

/// Shared payout context: releases vault funds as fee → treasury and
/// remainder → freelancer. Used by approve_release and claim_timeout.
#[derive(Accounts)]
pub struct ReleaseJob<'info> {
    pub signer: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"job", job.client.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
        has_one = mint,
    )]
    pub job: Account<'info, Job>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = job,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = freelancer_token.owner == job.freelancer @ RepulinkError::Unauthorized,
        constraint = freelancer_token.mint == job.mint,
    )]
    pub freelancer_token: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = treasury_token.owner == config.treasury @ RepulinkError::Unauthorized,
        constraint = treasury_token.mint == job.mint,
    )]
    pub treasury_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelRefund<'info> {
    pub client: Signer<'info>,

    #[account(
        mut,
        seeds = [b"job", job.client.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
        has_one = client @ RepulinkError::Unauthorized,
        has_one = mint,
    )]
    pub job: Account<'info, Job>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = job,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = client_token.owner == job.client @ RepulinkError::Unauthorized,
        constraint = client_token.mint == job.mint,
    )]
    pub client_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct OpenDispute<'info> {
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"job", job.client.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
    )]
    pub job: Account<'info, Job>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    pub arbiter: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"job", job.client.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
        has_one = arbiter @ RepulinkError::Unauthorized,
        has_one = mint,
    )]
    pub job: Account<'info, Job>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = job,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = freelancer_token.owner == job.freelancer @ RepulinkError::Unauthorized,
        constraint = freelancer_token.mint == job.mint,
    )]
    pub freelancer_token: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = client_token.owner == job.client @ RepulinkError::Unauthorized,
        constraint = client_token.mint == job.mint,
    )]
    pub client_token: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = treasury_token.owner == config.treasury @ RepulinkError::Unauthorized,
        constraint = treasury_token.mint == job.mint,
    )]
    pub treasury_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseJob<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        mut,
        close = client,
        seeds = [b"job", job.client.as_ref(), &job.job_id.to_le_bytes()],
        bump = job.bump,
        has_one = client @ RepulinkError::Unauthorized,
        has_one = mint,
    )]
    pub job: Account<'info, Job>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = job,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Receives any residual vault balance (e.g. tokens sent directly to the
    /// vault by a third party) so closing can never be blocked by dust.
    #[account(
        mut,
        constraint = client_token.owner == job.client @ RepulinkError::Unauthorized,
        constraint = client_token.mint == job.mint,
    )]
    pub client_token: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// fee = amount * fee_bps / 10_000, truncating down; the remainder stays on
/// the freelancer side. Multiply before divide to preserve precision.
pub fn calculate_fee(amount: u64, fee_bps: u16) -> Result<u64> {
    amount
        .checked_mul(u64::from(fee_bps))
        .and_then(|x| x.checked_div(BPS_DENOMINATOR))
        .ok_or_else(|| error!(RepulinkError::MathOverflow))
}

/// Transfers `amount` out of the vault, signed with the Job PDA seeds.
pub fn transfer_from_vault<'info>(
    job: &Account<'info, Job>,
    vault: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    amount: u64,
) -> Result<()> {
    let client = job.client;
    let job_id_bytes = job.job_id.to_le_bytes();
    let seeds: &[&[u8]] = &[b"job", client.as_ref(), &job_id_bytes, &[job.bump]];

    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            token::Transfer {
                from: vault.to_account_info(),
                to: to.to_account_info(),
                authority: job.to_account_info(),
            },
            &[seeds],
        ),
        amount,
    )
}

/// Closes the vault token account (must be empty), rent to the client.
pub fn close_vault<'info>(
    job: &Account<'info, Job>,
    vault: &Account<'info, TokenAccount>,
    client: &Signer<'info>,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let client_key = job.client;
    let job_id_bytes = job.job_id.to_le_bytes();
    let seeds: &[&[u8]] = &[b"job", client_key.as_ref(), &job_id_bytes, &[job.bump]];

    token::close_account(CpiContext::new_with_signer(
        token_program.to_account_info(),
        token::CloseAccount {
            account: vault.to_account_info(),
            destination: client.to_account_info(),
            authority: job.to_account_info(),
        },
        &[seeds],
    ))
}
