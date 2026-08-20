-- ============================================================
-- Phase 26: Add missing influencer_profiles columns + fix grants
-- ============================================================

-- Add columns (idempotent)
alter table public.influencer_profiles
  add column if not exists niche text;
alter table public.influencer_profiles
  add column if not exists desired_promo_code text;
alter table public.influencer_profiles
  add column if not exists social_link text;

-- Grant service_role (Phase 12 revoked all from anon/authenticated but forgot service_role)
grant all on table public.influencer_profiles to service_role;
grant all on table public.influencer_earnings to service_role;
