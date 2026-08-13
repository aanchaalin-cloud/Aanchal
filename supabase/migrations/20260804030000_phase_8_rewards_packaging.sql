-- ============================================================
-- Phase 8: Reward program submissions and vouchers
-- ============================================================
-- reward_submissions (video/unboxing review submissions for free
-- outfits) + reward_vouchers (cash vouchers granted on approval).
-- ============================================================

begin;

-- ------------------------------------------------------------------
-- reward_submissions
-- ------------------------------------------------------------------

create table public.reward_submissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  social_url text not null,
  platform text not null check (platform in ('instagram', 'youtube', 'facebook', 'other')),
  review_title text,
  review_body text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reward_submissions_status_created_idx
  on public.reward_submissions (status, created_at desc);

create trigger reward_submissions_set_updated_at
  before update on public.reward_submissions
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- reward_vouchers — cash vouchers issued after approval
-- ------------------------------------------------------------------

create table public.reward_vouchers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.reward_submissions(id) on delete cascade,
  code text not null unique,
  customer_email text not null,
  value numeric(10, 2) not null check (value > 0),
  is_used boolean not null default false,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reward_vouchers_email_idx on public.reward_vouchers (customer_email);
create index reward_vouchers_active_idx on public.reward_vouchers (code)
  where is_used = false;

create trigger reward_vouchers_set_updated_at
  before update on public.reward_vouchers
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------

alter table public.reward_submissions enable row level security;
alter table public.reward_vouchers enable row level security;

-- reward_submissions — admin manage; the owner can check their own status
create policy admin_all_reward_submissions
  on public.reward_submissions for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy customer_read_own_reward_submissions
  on public.reward_submissions for select
  to authenticated
  using (customer_email = (select (auth.jwt() ->> 'email')));

-- reward_vouchers — admin read; owner can read own voucher
create policy admin_read_reward_vouchers
  on public.reward_vouchers for select
  to authenticated
  using ((select public.is_admin()));

create policy customer_read_own_reward_vouchers
  on public.reward_vouchers for select
  to authenticated
  using (customer_email = (select (auth.jwt() ->> 'email')));

-- ------------------------------------------------------------------
-- Privileges
-- ------------------------------------------------------------------

revoke all on table
  public.reward_submissions,
  public.reward_vouchers
from anon, authenticated;

grant select on table
  public.reward_submissions,
  public.reward_vouchers
to authenticated;

commit;
