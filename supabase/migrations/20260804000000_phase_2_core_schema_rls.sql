-- ============================================================
-- Phase 2: Core catalog, orders, and Row Level Security
-- ============================================================
-- Fresh consolidated schema for Aanchal.
-- Creates: products, product_images, product_variants, orders,
--          order_items, admin_users + indexes, triggers, is_admin(),
--          RLS policies and grants.
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category text not null,
  price numeric(10, 2) not null check (price >= 0),
  discount_price numeric(10, 2) check (
    discount_price is null or (discount_price >= 0 and discount_price < price)
  ),
  fabric text,
  wash_care text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  color text,
  color_hex text check (
    color_hex is null or color_hex ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
  ),
  sku text unique,
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders carry the full order record. coupon_id FK is attached in Phase 6
-- after the coupons table exists.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  pincode text not null,
  notes text,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  shipping_fee numeric(10, 2) not null default 0 check (shipping_fee >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  total_amount numeric(10, 2) not null check (
    total_amount >= 0
    and total_amount = subtotal + shipping_fee - discount_amount
  ),
  payment_status text not null default 'pending' check (
    payment_status in ('pending', 'partially_paid', 'paid', 'failed', 'refunded', 'partially_refunded')
  ),
  order_status text not null default 'pending' check (
    order_status in (
      'pending', 'confirmed', 'in_production', 'ready_to_ship',
      'shipped', 'out_for_delivery', 'delivered',
      'cancelled', 'return_requested', 'returned', 'refunded'
    )
  ),
  packaging_status text not null default 'pending' check (
    packaging_status in ('pending', 'packed', 'ready_for_pickup')
  ),
  payment_method text not null default 'prepaid' check (
    payment_method in ('prepaid', 'cod')
  ),
  prepaid_amount integer not null default 0 check (prepaid_amount >= 0),
  cod_amount integer not null default 0 check (cod_amount >= 0),
  coupon_id uuid,
  influencer_code text,
  razorpay_order_id text unique,
  razorpay_payment_id text,
  shipping_provider text,
  tracking_id text,
  tracking_url text,
  shipping_status text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancellation_note text,
  estimated_delivery_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
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
  line_total numeric(10, 2) not null check (
    line_total >= 0
    and line_total = unit_price * quantity
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------

create index products_created_at_idx on public.products (created_at desc);
create index products_active_created_at_idx on public.products (created_at desc)
  where is_active = true;
create index products_featured_created_at_idx on public.products (created_at desc)
  where is_active = true and is_featured = true;
create index products_category_active_idx on public.products (category, created_at desc)
  where is_active = true;

create index product_images_product_position_idx on public.product_images (product_id, position);
create index product_images_created_at_idx on public.product_images (created_at desc);

create index product_variants_product_id_idx on public.product_variants (product_id);
create index product_variants_product_stock_idx on public.product_variants (product_id, stock);
create index product_variants_created_at_idx on public.product_variants (created_at desc);
create index product_variants_active_idx on public.product_variants (product_id, is_active)
  where is_active = true;

create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_created_at_idx on public.orders (order_status, created_at desc);
create index orders_payment_status_created_at_idx on public.orders (payment_status, created_at desc);
create index orders_customer_email_created_idx on public.orders (customer_email, created_at desc);
create index orders_influencer_code_idx on public.orders (influencer_code)
  where influencer_code is not null;
create index orders_shipped_at_idx on public.orders (shipped_at)
  where shipped_at is not null;
create index orders_delivered_at_idx on public.orders (delivered_at)
  where delivered_at is not null;
create index orders_estimated_delivery_idx on public.orders (estimated_delivery_date)
  where estimated_delivery_date is not null;

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_variant_id_idx on public.order_items (variant_id)
  where variant_id is not null;
create index order_items_created_at_idx on public.order_items (created_at desc);

create index admin_users_created_at_idx on public.admin_users (created_at desc);

-- ------------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------------

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

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create trigger product_images_set_updated_at
  before update on public.product_images
  for each row execute function public.set_updated_at();

create trigger order_items_set_updated_at
  before update on public.order_items
  for each row execute function public.set_updated_at();

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- Trigger helper must not be callable by clients
revoke all on function public.set_updated_at() from public, anon;

-- ------------------------------------------------------------------
-- Admin authorization helper
-- ------------------------------------------------------------------

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

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------

alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admin_users enable row level security;

-- products
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

-- product_images
create policy public_read_product_images
  on public.product_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products
      where products.id = product_images.product_id
        and products.is_active = true
    )
  );

create policy admin_all_product_images
  on public.product_images for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- product_variants
create policy public_read_product_variants
  on public.product_variants for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products
      where products.id = product_variants.product_id
        and products.is_active = true
    )
  );

create policy admin_all_product_variants
  on public.product_variants for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- orders: admins manage, customers read their own
create policy admin_read_orders
  on public.orders for select
  to authenticated
  using ((select public.is_admin()));

create policy admin_update_orders
  on public.orders for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy customer_read_own_orders
  on public.orders for select
  to authenticated
  using (customer_email = (select (auth.jwt() ->> 'email')));

-- order_items: admins read all, customers read their own order's items
create policy admin_read_order_items
  on public.order_items for select
  to authenticated
  using ((select public.is_admin()));

create policy customer_read_own_order_items
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.customer_email = (select (auth.jwt() ->> 'email'))
    )
  );

-- admin_users: self + admins
create policy admin_read_own_record
  on public.admin_users for select
  to authenticated
  using (id = (select auth.uid()));

create policy admin_read_admin_users
  on public.admin_users for select
  to authenticated
  using ((select public.is_admin()));

-- ------------------------------------------------------------------
-- Table privileges
-- Service role bypasses RLS and grants for server-side operations.
-- ------------------------------------------------------------------

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

-- Fulfillment fields may be updated by admins through anon-key clients.
grant update (order_status, packaging_status, notes, tracking_id, tracking_url,
  shipping_provider, shipped_at, delivered_at)
  on table public.orders
  to authenticated;

commit;
