use anchor_lang::prelude::*;

declare_id!("EQEWMBEtLZE7L2WS3iWo88rk8tQ4o8P9djmEJkG8gTFw");

// ── Constants ──────────────────────────────────────────────────────────────────
const MAX_USERNAME_LEN: usize = 32;
const MAX_TITLE_LEN: usize = 64;
const MAX_DESCRIPTION_LEN: usize = 256;
const MAX_CLIENT_NAME_LEN: usize = 64;
const MAX_CLIENT_EMAIL_LEN: usize = 128;

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
        badge.status = BadgeStatus::Pending;
        badge.created_at = Clock::get()?.unix_timestamp;
        badge.approved_at = None;
        badge.badge_index = badge_index;
        badge.bump = ctx.bumps.badge;

        Ok(())
    }

    /// Allows any signer (the client) to approve a Pending badge. Soulbound once approved.
    pub fn approve_badge(ctx: Context<ReviewBadge>, _badge_index: u32) -> Result<()> {
        let badge = &mut ctx.accounts.badge;
        require!(
            badge.status == BadgeStatus::Pending,
            RepulinkError::BadgeNotPending
        );

        badge.status = BadgeStatus::Approved;
        badge.approved_at = Some(Clock::get()?.unix_timestamp);

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
    pub status: BadgeStatus,
    pub created_at: i64,
    pub approved_at: Option<i64>,
    pub bump: u8,
}

impl Badge {
    /// Discriminator(8) + Pubkey(32) + u32(4)
    /// + String(4+64) + String(4+256) + String(4+64) + String(4+128)
    /// + BadgeStatus(1) + i64(8) + Option<i64>(1+8) + u8(1)
    pub const SPACE: usize = 8
        + 32
        + 4
        + (4 + MAX_TITLE_LEN)
        + (4 + MAX_DESCRIPTION_LEN)
        + (4 + MAX_CLIENT_NAME_LEN)
        + (4 + MAX_CLIENT_EMAIL_LEN)
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

    #[msg("Badge is not in Pending status")]
    BadgeNotPending,

    #[msg("Badge count overflow: maximum number of badges reached")]
    BadgeCountOverflow,
}
