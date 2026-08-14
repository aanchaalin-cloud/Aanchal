-- ============================================================
-- Phase 12: Influencer / creator program
-- ============================================================
-- influencer_profiles (applications + referral codes) and
-- influencer_earnings (commission ledger) plus the
-- get_influencer_by_code lookup used at checkout.
-- ============================================================

begin;

-- ------------------------------------------------------------------
-- influencer_profiles
-- ------------------------------------------------------------------

create table if not exists public.influencer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  referral_code text unique,
  social_handle text not null,
  platform text not null,
  followers text,
  bio text not null,
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists influencer_profiles_set_updated_at; create trigger influencer_profiles_set_updated_at
  before update on public.influencer_profiles
  for each row execute function public.set_updated_at();

create index if not exists influencer_profiles_status_created_idx
  on public.influencer_profiles (status, created_at desc);

create index if not exists influencer_profiles_referral_code_idx
  on public.influencer_profiles (referral_code)
  where referral_code is not null;

-- ------------------------------------------------------------------
-- influencer_earnings — commission ledger
-- ------------------------------------------------------------------

create table if not exists public.influencer_earnings (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references public.influencer_profiles(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  order_amount numeric(10, 2) not null check (order_amount >= 0),
  commission_amount numeric(10, 2) not null check (commission_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists influencer_earnings_influencer_created_idx
  on public.influencer_earnings (influencer_id, created_at desc);

drop trigger if exists influencer_earnings_set_updated_at; create trigger influencer_earnings_set_updated_at
  before update on public.influencer_earnings
  for each row execute function public.set_updated_at();

-- Referential link between orders and influencer profiles.
-- referral_code is a unique column; codes are generated uppercase and never
-- mutated, so UPPER() lookups at checkout stay consistent.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_influencer_code_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_influencer_code_fkey
      foreign key (influencer_code)
      references public.influencer_profiles(referral_code)
      on update cascade
      on delete set null;
  end if;
end;
$$;

-- ------------------------------------------------------------------
-- Referral code lookup (checkout, service role)
-- ------------------------------------------------------------------

create or replace function public.get_influencer_by_code(
  referral_code_input text
)
returns table (
  id uuid,
  referral_code text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select id, referral_code, status
  from public.influencer_profiles
  where upper(referral_code) = upper(referral_code_input)
  limit 1;
$$;

revoke all on function public.get_influencer_by_code from public, anon;
grant execute on function public.get_influencer_by_code to authenticated;

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------

alter table public.influencer_profiles enable row level security;
alter table public.influencer_earnings enable row level security;

-- influencer_profiles — admin manage; owner reads own status
drop policy if exists admin_all_influencer_profiles; create policy admin_all_influencer_profiles
  on public.influencer_profiles for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists customer_read_own_influencer_profile; create policy customer_read_own_influencer_profile
  on public.influencer_profiles for select
  to authenticated
  using (id = (select auth.uid()));

-- influencer_earnings — admin manage; owner reads own earnings
drop policy if exists admin_all_influencer_earnings; create policy admin_all_influencer_earnings
  on public.influencer_earnings for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists customer_read_own_influencer_earnings; create policy customer_read_own_influencer_earnings
  on public.influencer_earnings for select
  to authenticated
  using (influencer_id = (select auth.uid()));

-- ------------------------------------------------------------------
-- Privileges
-- ------------------------------------------------------------------

revoke all on table
  public.influencer_profiles,
  public.influencer_earnings
from anon, authenticated;

grant select on table
  public.influencer_profiles,
  public.influencer_earnings
to authenticated;

commit;
