-- ============================================================
-- Phase 27: Influencer applications staging table
-- ============================================================
-- Raw submissions land here (no auth required).
-- Admin reviews and approve copies data to influencer_profiles.
-- ============================================================

begin;

create table if not exists public.influencer_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  social_handle text not null,
  social_link text not null,
  platform text not null,
  followers text,
  niche text not null,
  desired_promo_code text,
  bio text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists influencer_applications_status_idx
  on public.influencer_applications (status, created_at desc);

-- Anyone can insert (anonymous or authenticated)
grant insert on table public.influencer_applications to anon, authenticated;

-- Admins can read/update
alter table public.influencer_applications enable row level security;

drop policy if exists admin_all_influencer_applications;
create policy admin_all_influencer_applications
  on public.influencer_applications for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

commit;
