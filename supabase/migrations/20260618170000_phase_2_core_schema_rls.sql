-- Vastra MVP canonical Supabase schema.
-- Safe to run in a new Supabase project or re-run after the Phase 2 migration.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category text not null,
  price numeric(10, 2) not null check (price >= 0),
  discount_price numeric(10, 2) constraint products_discount_price_valid check (
    discount_price is null
    or (discount_price >= 0 and discount_price < price)
  ),
  fabric text,
  wash_care text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  position integer not null default 0
    constraint product_images_position_nonnegative check (position >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  color text,
  color_hex text,
  sku text unique,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_color_hex_valid check (
    color_hex is null
    or color_hex ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
  )
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  shipping_fee numeric(10, 2) not null default 0 check (shipping_fee >= 0),
  total_amount numeric(10, 2) not null
    constraint orders_total_matches_components check (
    total_amount >= 0
    and total_amount = subtotal + shipping_fee
  ),
  payment_status text not null default 'pending' check (
    payment_status in ('pending', 'paid', 'failed', 'refunded')
  ),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  order_status text not null default 'pending' check (
    order_status in (
      'pending',
      'paid',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    )
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  product_name text not null,
  product_slug text not null,
  image_url text,
  size text,
  color text,
  sku text,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10, 2) not null
    constraint order_items_line_total_matches check (
    line_total >= 0
    and line_total = unit_price * quantity
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Compatibility constraints for databases created from the previous schema.
-- PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_discount_price_valid'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_discount_price_valid
      check (
        discount_price is null
        or (discount_price >= 0 and discount_price < price)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_images_position_nonnegative'
      and conrelid = 'public.product_images'::regclass
  ) then
    alter table public.product_images
      add constraint product_images_position_nonnegative
      check (position >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_variants_color_hex_valid'
      and conrelid = 'public.product_variants'::regclass
  ) then
    alter table public.product_variants
      add constraint product_variants_color_hex_valid
      check (
        color_hex is null
        or color_hex ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_total_matches_components'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_total_matches_components
      check (total_amount = subtotal + shipping_fee);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_line_total_matches'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items
      add constraint order_items_line_total_matches
      check (line_total = unit_price * quantity);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Indexes
-- The products.slug and admin_users.email UNIQUE constraints already provide
-- indexes for those columns.
-- ---------------------------------------------------------------------------

-- Remove redundant index names created by the previous one-file schema.
drop index if exists public.idx_products_slug;
drop index if exists public.idx_products_is_active;
drop index if exists public.idx_products_is_featured;
drop index if exists public.idx_product_images_product_id;
drop index if exists public.idx_product_variants_product_id;
drop index if exists public.idx_orders_customer_email;
drop index if exists public.idx_orders_razorpay_order_id;
drop index if exists public.idx_orders_payment_status;
drop index if exists public.idx_orders_order_status;
drop index if exists public.idx_order_items_order_id;

create index if not exists products_created_at_idx
  on public.products (created_at desc);
create index if not exists products_active_created_at_idx
  on public.products (created_at desc)
  where is_active = true;
create index if not exists products_featured_created_at_idx
  on public.products (created_at desc)
  where is_active = true and is_featured = true;

create index if not exists product_images_product_position_idx
  on public.product_images (product_id, position);
create index if not exists product_images_created_at_idx
  on public.product_images (created_at desc);

create index if not exists product_variants_product_id_idx
  on public.product_variants (product_id);
create index if not exists product_variants_product_stock_idx
  on public.product_variants (product_id, stock);
create index if not exists product_variants_created_at_idx
  on public.product_variants (created_at desc);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);
create index if not exists orders_status_created_at_idx
  on public.orders (order_status, created_at desc);
create index if not exists orders_payment_status_created_at_idx
  on public.orders (payment_status, created_at desc);
create index if not exists orders_customer_email_idx
  on public.orders (customer_email);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);
create index if not exists order_items_product_id_idx
  on public.order_items (product_id);
create index if not exists order_items_variant_id_idx
  on public.order_items (variant_id)
  where variant_id is not null;
create index if not exists order_items_created_at_idx
  on public.order_items (created_at desc);

create index if not exists admin_users_created_at_idx
  on public.admin_users (created_at desc);

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Remove trigger names used by the previous schema, if present.
drop trigger if exists trigger_products_updated_at on public.products;
drop trigger if exists trigger_product_variants_updated_at on public.product_variants;
drop trigger if exists trigger_orders_updated_at on public.orders;
drop function if exists public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Admin authorization helper
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists public_read_active_products on public.products;
drop policy if exists admin_read_all_products on public.products;
drop policy if exists admin_insert_products on public.products;
drop policy if exists admin_update_products on public.products;
drop policy if exists admin_delete_products on public.products;

create policy public_read_active_products
  on public.products for select
  to anon, authenticated
  using (is_active = true);
create policy admin_read_all_products
  on public.products for select
  to authenticated
  using ((select public.is_admin()));
create policy admin_insert_products
  on public.products for insert
  to authenticated
  with check ((select public.is_admin()));
create policy admin_update_products
  on public.products for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy admin_delete_products
  on public.products for delete
  to authenticated
  using ((select public.is_admin()));

drop policy if exists public_read_product_images on public.product_images;
drop policy if exists admin_all_product_images on public.product_images;

create policy public_read_product_images
  on public.product_images for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products
      where products.id = product_images.product_id
        and products.is_active = true
    )
  );
create policy admin_all_product_images
  on public.product_images for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists public_read_product_variants on public.product_variants;
drop policy if exists admin_all_product_variants on public.product_variants;

create policy public_read_product_variants
  on public.product_variants for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.products
      where products.id = product_variants.product_id
        and products.is_active = true
    )
  );
create policy admin_all_product_variants
  on public.product_variants for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists admin_read_orders on public.orders;
drop policy if exists admin_update_orders on public.orders;

create policy admin_read_orders
  on public.orders for select
  to authenticated
  using ((select public.is_admin()));
create policy admin_update_orders
  on public.orders for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists admin_read_order_items on public.order_items;
create policy admin_read_order_items
  on public.order_items for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists admin_read_own_record on public.admin_users;
drop policy if exists admin_read_admin_users on public.admin_users;

create policy admin_read_own_record
  on public.admin_users for select
  to authenticated
  using (id = (select auth.uid()));
create policy admin_read_admin_users
  on public.admin_users for select
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Table privileges
-- RLS still applies after these grants. The service_role retains its existing
-- Supabase privileges and bypasses RLS for trusted server-side operations.
-- ---------------------------------------------------------------------------

revoke all on table public.products from anon, authenticated;
revoke all on table public.product_images from anon, authenticated;
revoke all on table public.product_variants from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.admin_users from anon, authenticated;

grant select on table
  public.products,
  public.product_images,
  public.product_variants
to anon, authenticated;

grant insert, update, delete on table
  public.products,
  public.product_images,
  public.product_variants
to authenticated;

grant select on table
  public.orders,
  public.order_items,
  public.admin_users
to authenticated;

-- Admins may update fulfillment fields, but browser clients cannot alter
-- totals, payment status, Razorpay IDs, or customer details.
grant update (order_status, notes)
  on table public.orders
  to authenticated;

commit;

-- Create an admin after creating the user in Supabase Authentication:
-- insert into public.admin_users (id, email)
-- values ('AUTH_USER_UUID', 'admin@example.com');
