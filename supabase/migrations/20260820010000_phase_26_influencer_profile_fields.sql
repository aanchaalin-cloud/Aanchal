-- ============================================================
-- Phase 26: Add missing influencer_profiles columns + fix grants
-- ============================================================

begin;

alter table public.influencer_profiles
  add column if not exists niche text,
  add column if not exists desired_promo_code text,
  add column if not exists social_link text;

-- Phase 12 revoked all from anon/authenticated but forgot to grant
-- service_role. The service-role key (used by createServiceClient)
-- needs explicit DML grants on these tables.
grant all on table
  public.influencer_profiles,
  public.influencer_earnings
to service_role;

commit;
