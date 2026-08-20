-- ============================================================
-- Phase 27: Influencer applications staging table
-- ============================================================
-- Raw submissions land here (no auth required).
-- Admin reviews and approves — copies data to influencer_profiles.
-- ============================================================

-- 1. Create table
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
  status text not null default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2. Add check constraint separately (avoids inline syntax issues)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'influencer_applications_status_check'
  ) then
    alter table public.influencer_applications
      add constraint influencer_applications_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

-- 3. Index
create index if not exists influencer_applications_status_idx
  on public.influencer_applications (status, created_at desc);

-- 4. Grants: anonymous + authenticated can insert (no auth required to apply)
grant insert on table public.influencer_applications to anon;
grant insert on table public.influencer_applications to authenticated;

-- 5. Enable RLS
alter table public.influencer_applications enable row level security;

-- 6. Drop old policy if it exists, then create
drop policy if exists admin_all_influencer_applications on public.influencer_applications;
drop policy if exists "admin_all_influencer_applications" on public.influencer_applications;

-- Admin policy: only service_role can read/update/delete
create policy "admin_all_influencer_applications"
  on public.influencer_applications
  for all
  to service_role
  using (true)
  with check (true);

-- Anonymous read policy (admin panel fetches via service_role, but just in case)
create policy "service_role_all_influencer_applications"
  on public.influencer_applications
  for all
  to service_role
  using (true)
  with check (true);
