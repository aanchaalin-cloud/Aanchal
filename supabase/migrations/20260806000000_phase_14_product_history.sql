-- ============================================================
-- Phase 14: Product history (recently viewed)
-- ============================================================
-- product_history records each product a signed-in customer has
-- viewed, for "recently viewed" browsing history. Guest views are
-- tracked client-side via localStorage (see src/lib/recent-views.ts).
-- ============================================================

begin;

-- ------------------------------------------------------------------
-- product_history
-- ------------------------------------------------------------------

create table if not exists public.product_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_history_customer_product_unique unique (customer_id, product_id)
);

create index if not exists product_history_customer_viewed_idx
  on public.product_history (customer_id, viewed_at desc);

create index if not exists product_history_product_idx
  on public.product_history (product_id);

drop trigger if exists product_history_set_updated_at; create trigger product_history_set_updated_at
  before update on public.product_history
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------

alter table public.product_history enable row level security;

-- customer — self-service: select/insert/update own history (upsert path)
drop policy if exists customer_select_own_product_history; create policy customer_select_own_product_history
  on public.product_history for select
  to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists customer_insert_own_product_history; create policy customer_insert_own_product_history
  on public.product_history for insert
  to authenticated
  with check (customer_id = (select auth.uid()));

drop policy if exists customer_update_own_product_history; create policy customer_update_own_product_history
  on public.product_history for update
  to authenticated
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));

-- admin — read all history
drop policy if exists admin_read_product_history; create policy admin_read_product_history
  on public.product_history for select
  to authenticated
  using ((select public.is_admin()));

-- ------------------------------------------------------------------
-- Privileges (service role bypasses RLS; these cover the anon client)
-- ------------------------------------------------------------------

revoke all on table public.product_history from anon, authenticated;

grant select, insert, update on table public.product_history to authenticated;

commit;
