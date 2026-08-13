-- ============================================================
-- Phase 15: Customer addresses + admin roles
-- ============================================================
-- customer_addresses (Amazon-style address book, self-service RLS)
-- and admin_users.role ('admin' | 'superadmin') for the admin panel.
-- ============================================================

begin;

-- ------------------------------------------------------------------
-- customer_addresses
-- ------------------------------------------------------------------

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  country text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customer_addresses_customer_created_idx
  on public.customer_addresses (customer_id, created_at desc);

-- At most one default address per customer
create unique index customer_addresses_one_default_idx
  on public.customer_addresses (customer_id)
  where is_default = true;

create trigger customer_addresses_set_updated_at
  before update on public.customer_addresses
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- admin_users.role
-- ------------------------------------------------------------------

alter table public.admin_users
  add column role text not null default 'admin'
  check (role in ('admin', 'superadmin'));

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------

alter table public.customer_addresses enable row level security;

create policy customer_select_own_addresses
  on public.customer_addresses for select
  to authenticated
  using (customer_id = (select auth.uid()));

create policy customer_insert_own_addresses
  on public.customer_addresses for insert
  to authenticated
  with check (customer_id = (select auth.uid()));

create policy customer_update_own_addresses
  on public.customer_addresses for update
  to authenticated
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));

create policy customer_delete_own_addresses
  on public.customer_addresses for delete
  to authenticated
  using (customer_id = (select auth.uid()));

create policy admin_read_customer_addresses
  on public.customer_addresses for select
  to authenticated
  using ((select public.is_admin()));

-- ------------------------------------------------------------------
-- Privileges (service role bypasses RLS; these cover the anon client)
-- ------------------------------------------------------------------

revoke all on table public.customer_addresses from anon, authenticated;

grant select, insert, update, delete on table public.customer_addresses to authenticated;

commit;
