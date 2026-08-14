-- ============================================================
-- Phase 10: Customer accounts and wishlist
-- ============================================================
-- customers (profile mirror of auth.users) and wishlist_items,
-- with self-service RLS so the anon-key client can serve the
-- account dashboard safely.
-- ============================================================

begin;

-- ------------------------------------------------------------------
-- customers
-- ------------------------------------------------------------------

create table if not exists public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists customers_set_updated_at; create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create index if not exists customers_email_idx on public.customers (email);

-- ------------------------------------------------------------------
-- wishlist_items
-- ------------------------------------------------------------------

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wishlist_customer_product_unique unique (customer_id, product_id)
);

create index if not exists wishlist_items_customer_created_idx
  on public.wishlist_items (customer_id, created_at desc);

drop trigger if exists wishlist_items_set_updated_at; create trigger wishlist_items_set_updated_at
  before update on public.wishlist_items
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.wishlist_items enable row level security;

-- customers — self-service: read/update own profile only
drop policy if exists customer_read_own_profile; create policy customer_read_own_profile
  on public.customers for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists customer_insert_own_profile; create policy customer_insert_own_profile
  on public.customers for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists customer_update_own_profile; create policy customer_update_own_profile
  on public.customers for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists admin_read_customers; create policy admin_read_customers
  on public.customers for select
  to authenticated
  using ((select public.is_admin()));

-- wishlist_items — self-service: full CRUD on own rows via anon client
drop policy if exists customer_select_own_wishlist; create policy customer_select_own_wishlist
  on public.wishlist_items for select
  to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists customer_insert_own_wishlist; create policy customer_insert_own_wishlist
  on public.wishlist_items for insert
  to authenticated
  with check (customer_id = (select auth.uid()));

drop policy if exists customer_update_own_wishlist; create policy customer_update_own_wishlist
  on public.wishlist_items for update
  to authenticated
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));

drop policy if exists customer_delete_own_wishlist; create policy customer_delete_own_wishlist
  on public.wishlist_items for delete
  to authenticated
  using (customer_id = (select auth.uid()));

-- ------------------------------------------------------------------
-- Privileges (service role bypasses RLS; these cover the anon client)
-- ------------------------------------------------------------------

revoke all on table
  public.customers,
  public.wishlist_items
from anon, authenticated;

grant select, insert, update on table public.customers to authenticated;

grant select, insert, update, delete on table public.wishlist_items to authenticated;

commit;
