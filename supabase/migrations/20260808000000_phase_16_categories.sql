-- ============================================================
-- Phase 16: Product categories (admin-managed catalog)
-- ============================================================
-- categories: curated, admin-managed list of store categories.
-- products.category remains a denormalized text column (kept in sync
-- on rename by the admin API) so existing storefront queries keep
-- working without a big refactor.
-- ============================================================

begin;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_active_sort_idx
  on public.categories (is_active, sort_order asc, name asc);

drop trigger if exists categories_set_updated_at; create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Seed from existing product categories so nothing is orphaned.
-- No-op when the table already has rows.
insert into public.categories (name, slug, sort_order)
select
  cat,
  lower(regexp_replace(cat, '[^a-z0-9]+', '-', 'g')),
  row_number() over (order by cat)::int
from (
  select distinct trim(p.category) as cat
  from public.products p
  where p.category is not null and trim(p.category) <> ''
) distinct_cats
on conflict (slug) do nothing;

-- Default curated list for stores that have no products yet.
insert into public.categories (name, slug, sort_order)
select name, slug, sort_order
from (values
  ('Sarees', 'sarees', 1),
  ('Kurtas', 'kurtas', 2),
  ('Anarkali', 'anarkali', 3),
  ('Lehengas', 'lehengas', 4),
  ('Dupattas', 'dupattas', 5),
  ('Salwar Suits', 'salwar-suits', 6)
) as seed(name, slug, sort_order)
where not exists (select 1 from public.categories);

-- ------------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------------
alter table public.categories enable row level security;

-- Anyone can read active categories (catalog data).
drop policy if exists categories_read_active; create policy categories_read_active
  on public.categories for select
  using (is_active = true);

-- Admins can manage categories (API layer also enforces requireAdmin()).
drop policy if exists categories_admin_all; create policy categories_admin_all
  on public.categories for all
  using ((select public.is_admin()));

-- ------------------------------------------------------------------
-- Privileges
-- ------------------------------------------------------------------
revoke all on table public.categories from anon, authenticated;

grant select on table public.categories to anon, authenticated;
grant insert, update, delete on table public.categories to authenticated;

commit;
