-- =============================================================
-- ⚠️ DEPRECATED — DO NOT USE
-- This file is STALE and superseded by migrations in supabase/migrations/.
-- It contains outdated column types and missing tables.
-- Use migrations for all database changes.
-- =============================================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- =============================================================
-- 1. TABLES
-- =============================================================

-- 1a. Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category text not null,
  price integer not null check (price >= 0),
  discount_price integer check (discount_price is null or discount_price >= 0),
  fabric text,
  wash_care text,
  is_featured boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1b. Product images
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt_text text,
  position integer default 0,
  created_at timestamptz default now()
);

-- 1c. Product variants
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size text,
  color text,
  color_hex text,
  sku text,
  stock integer default 0 check (stock >= 0),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1d. Orders
create table if not exists orders (
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
  subtotal integer not null check (subtotal >= 0),
  shipping_fee integer not null default 0 check (shipping_fee >= 0),
  total_amount integer not null check (total_amount >= 0),
  payment_status text not null default 'pending',
  order_status text not null default 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 1e. Order items
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null,
  variant_id uuid,
  product_name text not null,
  product_slug text not null,
  image_url text,
  size text,
  color text,
  sku text,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total integer not null check (line_total >= 0)
);

-- 1f. Admin users (linked to Supabase Auth users)
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- =============================================================
-- 2. INDEXES
-- =============================================================

-- Products
create index if not exists idx_products_slug on products(slug);
create index if not exists idx_products_category on products(category);
create index if not exists idx_products_is_active on products(is_active);
create index if not exists idx_products_is_featured on products(is_featured);

-- Product images
create index if not exists idx_product_images_product on product_images(product_id);
create index if not exists idx_product_images_position on product_images(position);

-- Product variants
create index if not exists idx_product_variants_product on product_variants(product_id);
create index if not exists idx_product_variants_sku on product_variants(sku);
create index if not exists idx_product_variants_stock on product_variants(stock);

-- Orders
create index if not exists idx_orders_payment_status on orders(payment_status);
create index if not exists idx_orders_order_status on orders(order_status);
create index if not exists idx_orders_customer_email on orders(customer_email);
create index if not exists idx_orders_created_at on orders(created_at);
create index if not exists idx_orders_razorpay_order on orders(razorpay_order_id);

-- Order items
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_order_items_product on order_items(product_id);
create index if not exists idx_order_items_variant on order_items(variant_id);

-- =============================================================
-- 3. UPDATED_AT TRIGGER
-- =============================================================

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_products
  before update on products
  for each row execute function update_updated_at_column();

create trigger set_updated_at_product_variants
  before update on product_variants
  for each row execute function update_updated_at_column();

create trigger set_updated_at_orders
  before update on orders
  for each row execute function update_updated_at_column();

-- =============================================================
-- 4. STOCK RPC FUNCTIONS
-- =============================================================

create or replace function decrement_variant_stock(
  p_variant_id uuid,
  p_quantity integer
)
returns table(success boolean, message text)
language plpgsql
security definer
as $$
declare
  current_stock integer;
begin
  select stock into current_stock
  from product_variants
  where id = p_variant_id;

  if current_stock is null then
    return query select false, 'Variant not found'::text;
    return;
  end if;

  if current_stock < p_quantity then
    return query select false, 'Insufficient stock'::text;
    return;
  end if;

  update product_variants
  set stock = stock - p_quantity, updated_at = now()
  where id = p_variant_id;

  return query select true, 'Stock decremented'::text;
end;
$$;

create or replace function increment_variant_stock(
  p_variant_id uuid,
  p_quantity integer
)
returns void
language plpgsql
security definer
as $$
begin
  update product_variants
  set stock = stock + p_quantity, updated_at = now()
  where id = p_variant_id;
end;
$$;

create or replace function cancel_order_stock_restore(
  p_order_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  item record;
begin
  for item in
    select variant_id, quantity
    from order_items
    where order_id = p_order_id and variant_id is not null
  loop
    update product_variants
    set stock = stock + item.quantity, updated_at = now()
    where id = item.variant_id;
  end loop;
end;
$$;

-- =============================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================

-- Enable RLS on all tables
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table admin_users enable row level security;

-- Products: anyone can read active products
drop policy if exists "Anyone can read products" on products;
create policy "Anyone can read products"
  on products for select
  using (true);

-- Product images: anyone can read
drop policy if exists "Anyone can read product images" on product_images;
create policy "Anyone can read product images"
  on product_images for select
  using (true);

-- Product variants: anyone can read
drop policy if exists "Anyone can read product variants" on product_variants;
create policy "Anyone can read product variants"
  on product_variants for select
  using (true);

-- Orders: no public access (service role only)
drop policy if exists "Service role manages orders" on orders;
create policy "Service role manages orders"
  on orders for all
  using (false)
  with check (false);

-- Order items: no public access (service role only)
drop policy if exists "Service role manages order_items" on order_items;
create policy "Service role manages order_items"
  on order_items for all
  using (false)
  with check (false);

-- Admin users: no public access
drop policy if exists "Service role manages admin_users" on admin_users;
create policy "Service role manages admin_users"
  on admin_users for all
  using (false)
  with check (false);

-- =============================================================
-- 6. STORAGE BUCKET (run separately in Supabase Dashboard UI)
-- =============================================================
-- Go to: Storage → Create bucket
-- Name: product-images
-- Public: ON
--
-- Then run this storage policy SQL in the SQL Editor:
--
--   insert into storage.buckets (id, name, public)
--   values ('product-images', 'product-images', true)
--   on conflict (id) do nothing;
--
--   create policy "Anyone can read product images"
--   on storage.objects for select
--   using (bucket_id = 'product-images');
--
--   create policy "Authenticated users can upload product images"
--   on storage.objects for insert
--   with check (
--     bucket_id = 'product-images'
--     and auth.role() = 'authenticated'
--   );
--
--   create policy "Users can delete own product images"
--   on storage.objects for delete
--   using (
--     bucket_id = 'product-images'
--     and auth.role() = 'authenticated'
--   );

-- =============================================================
-- 7. HELPER: Create an admin user (replace UUID with actual auth user id)
-- =============================================================
-- After creating the user in Authentication → Add User, run:
--
--   insert into admin_users (id)
--   values ('<USER_UUID_FROM_AUTH>');
--
-- =============================================================
-- END OF SCHEMA
-- =============================================================
