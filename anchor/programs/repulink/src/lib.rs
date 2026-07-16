use anchor_lang::prelude::*;

pub mod escrow;
pub use escrow::*;

declare_id!("EQEWMBEtLZE7L2WS3iWo88rk8tQ4o8P9djmEJkG8gTFw");

// ── Constants ──────────────────────────────────────────────────────────────────
const MAX_USERNAME_LEN: usize = 32;
const MAX_TITLE_LEN: usize = 64;
const MAX_DESCRIPTION_LEN: usize = 256;
const MAX_CLIENT_NAME_LEN: usize = 64;
const MAX_CLIENT_EMAIL_LEN: usize = 128;
const MAX_CLIENT_LINKEDIN_LEN: usize = 128;
const MAX_CLIENT_TWITTER_LEN: usize = 64;
const MAX_CLIENT_EMAIL_REVIEWER_LEN: usize = 128;

// ── Program ───────────────────────────────────────────────────────────────────
#[program]
pub mod repulink {
    use super::*;

    /// Creates a FreelancerProfile PDA for the signer (one per wallet).
    pub fn initialize_profile(ctx: Context<InitializeProfile>, username: String) -> Result<()> {
        require!(
            !username.is_empty() && username.len() <= MAX_USERNAME_LEN,
            RepulinkError::InvalidUsername
        );

        let profile = &mut ctx.accounts.profile;
        profile.owner = ctx.accounts.owner.key();
        profile.username = username;
        profile.badge_count = 0;
        profile.bump = ctx.bumps.profile;

        Ok(())
    }

    /// Creates a Badge PDA for the freelancer representing a completed project.
    pub fn create_badge(
        ctx: Context<CreateBadge>,
        title: String,
        description: String,
        client_name: String,
        client_email: String,
    ) -> Result<()> {
        require!(
            !title.is_empty() && title.len() <= MAX_TITLE_LEN,
            RepulinkError::InvalidTitle
        );
        require!(
            !description.is_empty() && description.len() <= MAX_DESCRIPTION_LEN,
            RepulinkError::InvalidDescription
        );
        require!(
            !client_name.is_empty() && client_name.len() <= MAX_CLIENT_NAME_LEN,
            RepulinkError::InvalidClientName
        );
        require!(
            !client_email.is_empty() && client_email.len() <= MAX_CLIENT_EMAIL_LEN,
            RepulinkError::InvalidClientEmail
        );

        let profile = &mut ctx.accounts.profile;
        let badge_index = profile.badge_count;

        profile.badge_count = profile
            .badge_count
            .checked_add(1)
            .ok_or(RepulinkError::BadgeCountOverflow)?;

        let badge = &mut ctx.accounts.badge;
        badge.freelancer = ctx.accounts.owner.key();
        badge.title = title;
        badge.description = description;
        badge.client_name = client_name;
        badge.client_email = client_email;
        badge.client_wallet = None;
        badge.client_linkedin = None;
        badge.client_twitter = None;
        badge.client_email_reviewer = None;
        badge.status = BadgeStatus::Pending;
        badge.created_at = Clock::get()?.unix_timestamp;
        badge.approved_at = None;
        badge.badge_index = badge_index;
        badge.bump = ctx.bumps.badge;

        Ok(())
    }

    /// Client approves a Pending badge and signs with their identity on-chain.
    pub fn approve_badge(
        ctx: Context<ReviewBadge>,
        _badge_index: u32,
        client_linkedin: Option<String>,
        client_twitter: Option<String>,
        client_email_reviewer: Option<String>,
    ) -> Result<()> {
        if let Some(ref linkedin) = client_linkedin {
            require!(
                linkedin.len() <= MAX_CLIENT_LINKEDIN_LEN,
                RepulinkError::InvalidClientLinkedin
            );
        }
        if let Some(ref twitter) = client_twitter {
            require!(
                twitter.len() <= MAX_CLIENT_TWITTER_LEN,
                RepulinkError::InvalidClientTwitter
            );
        }
        if let Some(ref email) = client_email_reviewer {
            require!(
                email.len() <= MAX_CLIENT_EMAIL_REVIEWER_LEN,
                RepulinkError::InvalidClientEmailReviewer
            );
        }

        let badge = &mut ctx.accounts.badge;
        require!(
            badge.status == BadgeStatus::Pending,
            RepulinkError::BadgeNotPending
        );

        badge.status = BadgeStatus::Approved;
        badge.approved_at = Some(Clock::get()?.unix_timestamp);
        badge.client_wallet = Some(ctx.accounts.reviewer.key());
        badge.client_linkedin = client_linkedin;
        badge.client_twitter = client_twitter;

        badge.client_email_reviewer = client_email_reviewer;

        Ok(())
    }

    /// Allows any signer (the client) to reject a Pending badge.
    pub fn reject_badge(ctx: Context<ReviewBadge>, _badge_index: u32) -> Result<()> {
        let badge = &mut ctx.accounts.badge;
        require!(
            badge.status == BadgeStatus::Pending,
            RepulinkError::BadgeNotPending
        );

        badge.status = BadgeStatus::Rejected;

        Ok(())
    }

    /// Updates the username of an existing FreelancerProfile.
    pub fn update_profile(ctx: Context<UpdateProfile>, username: String) -> Result<()> {
        require!(
            !username.is_empty() && username.len() <= MAX_USERNAME_LEN,
            RepulinkError::InvalidUsername
        );

        ctx.accounts.profile.username = username;
        Ok(())
    }

    /// Closes the FreelancerProfile PDA and returns rent to the owner.
    /// Closing with badges would reset badge_count and make new badges
    /// collide with the old badge PDAs, bricking badge creation.
    pub fn close_profile(ctx: Context<CloseProfile>) -> Result<()> {
        require!(
            ctx.accounts.profile.badge_count == 0,
            RepulinkError::ProfileHasBadges
        );
        Ok(())
    }

    // ── Escrow ────────────────────────────────────────────────────────────────

    /// One-time escrow configuration. Admin = signer, and when the program
    /// is deployed with the upgradeable loader the signer must be the
    /// program's upgrade authority — otherwise anyone could front-run
    /// init_config and seize the global Config.
    pub fn init_config(
        ctx: Context<InitConfig>,
        arbiter: Pubkey,
        treasury: Pubkey,
        fee_bps: u16,
    ) -> Result<()> {
        require!(fee_bps <= MAX_FEE_BPS, RepulinkError::FeeTooHigh);

        if let Some(programdata_address) = ctx.accounts.program.programdata_address()? {
            let program_data = ctx
                .accounts
                .program_data
                .as_ref()
                .ok_or(RepulinkError::Unauthorized)?;
            require_keys_eq!(
                program_data.key(),
                programdata_address,
                RepulinkError::Unauthorized
            );
            require!(
                program_data.upgrade_authority_address == Some(ctx.accounts.admin.key()),
                RepulinkError::Unauthorized
            );
        }

        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.arbiter = arbiter;
        config.treasury = treasury;
        config.fee_bps = fee_bps;
        config.bump = ctx.bumps.config;

        Ok(())
    }

    /// Updates the escrow configuration. Admin only.
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        arbiter: Pubkey,
        treasury: Pubkey,
        fee_bps: u16,
    ) -> Result<()> {
        require!(fee_bps <= MAX_FEE_BPS, RepulinkError::FeeTooHigh);

        let config = &mut ctx.accounts.config;
        config.arbiter = arbiter;
        config.treasury = treasury;
        config.fee_bps = fee_bps;

        Ok(())
    }

    /// Client creates a Job in escrow. Arbiter and fee_bps are copied from
    /// Config; fee_bps_snapshot must match so the client never signs for a
    /// different fee than the one shown off-chain.
    pub fn create_job(
        ctx: Context<CreateJob>,
        job_id: u64,
        freelancer: Pubkey,
        amount: u64,
        fee_bps_snapshot: u16,
        terms_hash: [u8; 32],
        review_window_secs: u32,
    ) -> Result<()> {
        require!(
            freelancer != ctx.accounts.client.key(),
            RepulinkError::SelfDealingNotAllowed
        );
        require!(amount > 0, RepulinkError::InvalidAmount);
        require!(
            (MIN_REVIEW_WINDOW_SECS..=MAX_REVIEW_WINDOW_SECS).contains(&review_window_secs),
            RepulinkError::InvalidReviewWindow
        );
        require!(
            fee_bps_snapshot == ctx.accounts.config.fee_bps,
            RepulinkError::FeeTooHigh
        );

        let now = Clock::get()?.unix_timestamp;
        let job = &mut ctx.accounts.job;
        job.job_id = job_id;
        job.client = ctx.accounts.client.key();
        job.freelancer = freelancer;
        job.arbiter = ctx.accounts.config.arbiter;
        job.mint = ctx.accounts.mint.key();
        job.amount = amount;
        job.fee_bps = ctx.accounts.config.fee_bps;
        job.state = JobState::Created;
        job.created_at = now;
        job.funded_at = 0;
        job.delivered_at = 0;
        job.review_window_secs = review_window_secs;
        job.terms_hash = terms_hash;
        job.delivery_hash = [0; 32];
        job.bump = ctx.bumps.job;

        emit!(JobCreated {
            job: job.key(),
            client: job.client,
            freelancer: job.freelancer,
            state: job.state,
            timestamp: now,
        });

        Ok(())
    }

    /// Client deposits the exact Job amount into the vault.
    pub fn fund_job(ctx: Context<FundJob>) -> Result<()> {
        require!(
            ctx.accounts.job.state == JobState::Created,
            RepulinkError::InvalidState
        );

        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.client_token.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.client.to_account_info(),
                },
            ),
            ctx.accounts.job.amount,
        )?;

        let now = Clock::get()?.unix_timestamp;
        let job = &mut ctx.accounts.job;
        job.state = JobState::Funded;
        job.funded_at = now;

        emit!(JobFunded {
            job: job.key(),
            state: job.state,
            timestamp: now,
        });

        Ok(())
    }

    /// Freelancer marks the work as delivered, recording the delivery hash.
    /// Starts the client's review window.
    pub fn mark_delivered(ctx: Context<MarkDelivered>, delivery_hash: [u8; 32]) -> Result<()> {
        require!(
            ctx.accounts.job.state == JobState::Funded,
            RepulinkError::InvalidState
        );

        let now = Clock::get()?.unix_timestamp;
        let job = &mut ctx.accounts.job;
        job.state = JobState::Delivered;
        job.delivered_at = now;
        job.delivery_hash = delivery_hash;

        emit!(JobDelivered {
            job: job.key(),
            state: job.state,
            timestamp: now,
        });

        Ok(())
    }

    /// Client approves the delivery: fee → treasury, remainder → freelancer.
    pub fn approve_release(ctx: Context<ReleaseJob>) -> Result<()> {
        require!(
            ctx.accounts.signer.key() == ctx.accounts.job.client,
            RepulinkError::Unauthorized
        );
        require!(
            ctx.accounts.job.state == JobState::Delivered,
            RepulinkError::InvalidState
        );

        release_payout(&ctx)?;

        let now = Clock::get()?.unix_timestamp;
        let job = &mut ctx.accounts.job;
        job.state = JobState::Released;

        emit!(JobReleased {
            job: job.key(),
            state: job.state,
            timestamp: now,
        });

        Ok(())
    }

    /// Freelancer claims the payout after the review window elapsed without
    /// client action. Same payout as approve_release.
    pub fn claim_timeout(ctx: Context<ReleaseJob>) -> Result<()> {
        require!(
            ctx.accounts.signer.key() == ctx.accounts.job.freelancer,
            RepulinkError::Unauthorized
        );
        require!(
            ctx.accounts.job.state == JobState::Delivered,
            RepulinkError::InvalidState
        );

        let deadline = ctx
            .accounts
            .job
            .delivered_at
            .checked_add(i64::from(ctx.accounts.job.review_window_secs))
            .ok_or(RepulinkError::MathOverflow)?;
        require!(
            Clock::get()?.unix_timestamp >= deadline,
            RepulinkError::ReviewWindowNotElapsed
        );

        release_payout(&ctx)?;

        let now = Clock::get()?.unix_timestamp;
        let job = &mut ctx.accounts.job;
        job.state = JobState::Released;

        emit!(JobReleased {
            job: job.key(),
            state: job.state,
            timestamp: now,
        });

        Ok(())
    }

    /// Client cancels before delivery. If already funded, the full amount is
    /// returned to the client with no fee.
    pub fn cancel_refund(ctx: Context<CancelRefund>) -> Result<()> {
        let state = ctx.accounts.job.state;
        require!(
            state == JobState::Created || state == JobState::Funded,
            RepulinkError::InvalidState
        );

        if state == JobState::Funded {
            transfer_from_vault(
                &ctx.accounts.job,
                &ctx.accounts.vault,
                &ctx.accounts.client_token,
                &ctx.accounts.token_program,
                ctx.accounts.job.amount,
            )?;
        }

        let now = Clock::get()?.unix_timestamp;
        let job = &mut ctx.accounts.job;
        job.state = JobState::Refunded;

        emit!(JobRefunded {
            job: job.key(),
            state: job.state,
            timestamp: now,
        });

        Ok(())
    }

    /// Client or freelancer opens a dispute while funds are in escrow.
    pub fn open_dispute(ctx: Context<OpenDispute>) -> Result<()> {
        let signer = ctx.accounts.signer.key();
        require!(
            signer == ctx.accounts.job.client || signer == ctx.accounts.job.freelancer,
            RepulinkError::Unauthorized
        );
        let state = ctx.accounts.job.state;
        require!(
            state == JobState::Funded || state == JobState::Delivered,
            RepulinkError::InvalidState
        );

        let now = Clock::get()?.unix_timestamp;
        let job = &mut ctx.accounts.job;
        job.state = JobState::Disputed;

        emit!(JobDisputed {
            job: job.key(),
            state: job.state,
            timestamp: now,
        });

        Ok(())
    }

    /// Arbiter splits the vault: fee on freelancer_amount → treasury,
    /// freelancer_amount - fee → freelancer, remainder → client.
    pub fn resolve_dispute(ctx: Context<ResolveDispute>, freelancer_amount: u64) -> Result<()> {
        require!(
            ctx.accounts.job.state == JobState::Disputed,
            RepulinkError::InvalidState
        );
        require!(
            freelancer_amount <= ctx.accounts.job.amount,
            RepulinkError::InvalidAmount
        );

        let fee = calculate_fee(freelancer_amount, ctx.accounts.job.fee_bps)?;
        let to_freelancer = freelancer_amount
            .checked_sub(fee)
            .ok_or(RepulinkError::MathOverflow)?;
        let to_client = ctx
            .accounts
            .job
            .amount
            .checked_sub(freelancer_amount)
            .ok_or(RepulinkError::MathOverflow)?;

        transfer_from_vault(
            &ctx.accounts.job,
            &ctx.accounts.vault,
            &ctx.accounts.treasury_token,
            &ctx.accounts.token_program,
            fee,
        )?;
        transfer_from_vault(
            &ctx.accounts.job,
            &ctx.accounts.vault,
            &ctx.accounts.freelancer_token,
            &ctx.accounts.token_program,
            to_freelancer,
        )?;
        transfer_from_vault(
            &ctx.accounts.job,
            &ctx.accounts.vault,
            &ctx.accounts.client_token,
            &ctx.accounts.token_program,
            to_client,
        )?;

        let now = Clock::get()?.unix_timestamp;
        let job = &mut ctx.accounts.job;
        job.state = JobState::Resolved;

        emit!(JobResolved {
            job: job.key(),
            state: job.state,
            timestamp: now,
        });

        Ok(())
    }

    /// Client closes a settled Job and its vault; rent back to client. Any
    /// residual vault balance (dust sent by third parties) is swept to the
    /// client first so closing can never be blocked.
    pub fn close_job(ctx: Context<CloseJob>) -> Result<()> {
        let state = ctx.accounts.job.state;
        require!(
            state == JobState::Released
                || state == JobState::Refunded
                || state == JobState::Resolved,
            RepulinkError::InvalidState
        );

        if ctx.accounts.vault.amount > 0 {
            transfer_from_vault(
                &ctx.accounts.job,
                &ctx.accounts.vault,
                &ctx.accounts.client_token,
                &ctx.accounts.token_program,
                ctx.accounts.vault.amount,
            )?;
        }

        close_vault(
            &ctx.accounts.job,
            &ctx.accounts.vault,
            &ctx.accounts.client,
            &ctx.accounts.token_program,
        )
    }
}

/// fee → treasury, remainder → freelancer, out of the vault.
fn release_payout(ctx: &Context<ReleaseJob>) -> Result<()> {
    let fee = calculate_fee(ctx.accounts.job.amount, ctx.accounts.job.fee_bps)?;
    let to_freelancer = ctx
        .accounts
        .job
        .amount
        .checked_sub(fee)
        .ok_or(RepulinkError::MathOverflow)?;

    transfer_from_vault(
        &ctx.accounts.job,
        &ctx.accounts.vault,
        &ctx.accounts.treasury_token,
        &ctx.accounts.token_program,
        fee,
    )?;
    transfer_from_vault(
        &ctx.accounts.job,
        &ctx.accounts.vault,
        &ctx.accounts.freelancer_token,
        &ctx.accounts.token_program,
        to_freelancer,
    )
}

// ── Accounts ──────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = FreelancerProfile::SPACE,
        seeds = [b"profile", owner.key().as_ref()],
        bump,
    )]
    pub profile: Account<'info, FreelancerProfile>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateBadge<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"profile", owner.key().as_ref()],
        bump = profile.bump,
        has_one = owner,
    )]
    pub profile: Account<'info, FreelancerProfile>,

    #[account(
        init,
        payer = owner,
        space = Badge::SPACE,
        seeds = [b"badge", owner.key().as_ref(), &profile.badge_count.to_le_bytes()],
        bump,
    )]
    pub badge: Account<'info, Badge>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(badge_index: u32)]
pub struct ReviewBadge<'info> {
    #[account(mut)]
    pub reviewer: Signer<'info>,

    /// CHECK: The freelancer's public key is only used to derive the badge PDA seeds
    pub freelancer: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"badge", freelancer.key().as_ref(), &badge_index.to_le_bytes()],
        bump = badge.bump,
    )]
    pub badge: Account<'info, Badge>,
}

#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"profile", owner.key().as_ref()],
        bump = profile.bump,
        has_one = owner,
    )]
    pub profile: Account<'info, FreelancerProfile>,
}

#[derive(Accounts)]
pub struct CloseProfile<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        close = owner,
        seeds = [b"profile", owner.key().as_ref()],
        bump = profile.bump,
        has_one = owner,
    )]
    pub profile: Account<'info, FreelancerProfile>,
}
// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct FreelancerProfile {
    pub owner: Pubkey,
    pub username: String,
    pub badge_count: u32,
    pub bump: u8,
}

impl FreelancerProfile {
    /// Discriminator(8) + Pubkey(32) + String prefix(4) + MAX_USERNAME(32) + u32(4) + u8(1)
    pub const SPACE: usize = 8 + 32 + 4 + MAX_USERNAME_LEN + 4 + 1;
}

#[account]
pub struct Badge {
    pub freelancer: Pubkey,
    pub badge_index: u32,
    pub title: String,
    pub description: String,
    pub client_name: String,
    pub client_email: String,
    pub client_wallet: Option<Pubkey>,
    pub client_linkedin: Option<String>,
    pub client_twitter: Option<String>,
    pub client_email_reviewer: Option<String>,
    pub status: BadgeStatus,
    pub created_at: i64,
    pub approved_at: Option<i64>,
    pub bump: u8,
}

impl Badge {
    /// Discriminator(8) + Pubkey(32) + u32(4)
    /// + String(4+64) + String(4+256) + String(4+64) + String(4+128)
    /// + Option<Pubkey>(1+32)
    /// + Option<String>(1+4+128) + Option<String>(1+4+64)
    /// + BadgeStatus(1) + i64(8) + Option<i64>(1+8) + u8(1)
    pub const SPACE: usize = 8
        + 32
        + 4
        + (4 + MAX_TITLE_LEN)
        + (4 + MAX_DESCRIPTION_LEN)
        + (4 + MAX_CLIENT_NAME_LEN)
        + (4 + MAX_CLIENT_EMAIL_LEN)
        + (1 + 32)
        + (1 + 4 + MAX_CLIENT_LINKEDIN_LEN)
        + (1 + 4 + MAX_CLIENT_TWITTER_LEN)
        + (1 + 4 + MAX_CLIENT_EMAIL_REVIEWER_LEN)
        + 1
        + 8
        + (1 + 8)
        + 1;
}

// ── Enums ─────────────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BadgeStatus {
    Pending,
    Approved,
    Rejected,
}

impl Default for BadgeStatus {
    fn default() -> Self {
        BadgeStatus::Pending
    }
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum RepulinkError {
    #[msg("Username must be between 1 and 32 characters")]
    InvalidUsername,

    #[msg("Title must be between 1 and 64 characters")]
    InvalidTitle,

    #[msg("Description must be between 1 and 256 characters")]
    InvalidDescription,

    #[msg("Client name must be between 1 and 64 characters")]
    InvalidClientName,

    #[msg("LinkedIn URL must be 128 characters or less")]
    InvalidClientLinkedin,

    #[msg("Twitter handle must be 64 characters or less")]
    InvalidClientTwitter,

    #[msg("Reviewer email must be 128 characters or less")]
    InvalidClientEmailReviewer,

    #[msg("Badge is not in Pending status")]
    BadgeNotPending,

    #[msg("Badge count overflow: maximum number of badges reached")]
    BadgeCountOverflow,

    #[msg("Client email must be between 1 and 128 characters")]
    InvalidClientEmail,

    #[msg("Profile still has badges and cannot be closed")]
    ProfileHasBadges,

    #[msg("Instruction not allowed in the current job state")]
    InvalidState,

    #[msg("Signer is not authorized for this instruction")]
    Unauthorized,

    #[msg("The review window has not elapsed yet")]
    ReviewWindowNotElapsed,

    #[msg("Amount is invalid")]
    InvalidAmount,

    #[msg("Review window must be between 1 and 30 days")]
    InvalidReviewWindow,

    #[msg("Client and freelancer must be different wallets")]
    SelfDealingNotAllowed,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Fee exceeds the allowed maximum or does not match config")]
    FeeTooHigh,
}
