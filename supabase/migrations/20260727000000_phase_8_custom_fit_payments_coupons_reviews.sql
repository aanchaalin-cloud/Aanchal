-- Phase 8: Custom Fit, Payment Options, Coupons, Reviews, Status History, Notifications
-- This migration adds:
-- 1. order_measurements — Custom fit data for each order
-- 2. order_status_history — Audit trail for order status changes
-- 3. Coupons table — Discount/voucher system
-- 4. coupon_usage — Track coupon redemptions
-- 5. reviews — Product reviews
-- 6. order_notifications — Notification log (WhatsApp, email, etc.)
-- 7. Extended order fields for payment options and shipping
-- ============================================================

-- 1. ORDER MEASUREMENTS
create table if not exists order_measurements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  chest numeric(5,1) not null check (chest > 0 and chest <= 200),
  waist numeric(5,1) not null check (waist > 0 and waist <= 200),
  full_height numeric(5,1) not null check (full_height > 50 and full_height <= 250),
  unit text not null default 'cm' check (unit in ('cm', 'inches')),
  personalisation_request text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_order_measurements_order on order_measurements(order_id);

-- 2. ORDER STATUS HISTORY
create table if not exists order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_order_status_history_order on order_status_history(order_id);

-- 3. COUPONS
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  discount_value integer not null check (discount_value > 0),
  min_order_amount integer check (min_order_amount is null or min_order_amount >= 0),
  max_discount_amount integer check (max_discount_amount is null or max_discount_amount >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer default 1 check (per_customer_limit is null or per_customer_limit > 0),
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_coupons_code on coupons(code);
create index if not exists idx_coupons_active on coupons(is_active);

-- 4. COUPON USAGE
create table if not exists coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  customer_email text not null,
  discount_amount integer not null check (discount_amount >= 0),
  created_at timestamptz default now(),
  unique(coupon_id, order_id)
);

create index if not exists idx_coupon_usage_coupon on coupon_usage(coupon_id);
create index if not exists idx_coupon_usage_customer on coupon_usage(customer_email);

-- 5. PRODUCT REVIEWS
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  title text,
  body text not null,
  image_url text,
  is_verified_purchase boolean default false,
  is_featured boolean default false,
  is_approved boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_reviews_product on reviews(product_id);
create index if not exists idx_reviews_approved on reviews(is_approved);

-- 6. ORDER NOTIFICATIONS
create table if not exists order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  customer_phone text not null,
  type text not null check (type in ('order_confirmed', 'order_shipped', 'tracking_info', 'delivery_day', 'order_delivered')),
  provider text not null default 'whatsapp',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  failure_reason text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_order_notifications_order on order_notifications(order_id);

-- 7. EXTEND ORDERS TABLE
-- Add payment_method, payment split fields, shipping, and coupon fields
alter table orders add column if not exists payment_method text default 'prepaid' check (payment_method in ('prepaid', 'cod'));
alter table orders add column if not exists prepaid_amount integer default 0 check (prepaid_amount >= 0);
alter table orders add column if not exists cod_amount integer default 0 check (cod_amount >= 0);
alter table orders add column if not exists discount_amount integer default 0 check (discount_amount >= 0);
alter table orders add column if not exists coupon_id uuid references coupons(id) on delete set null;
alter table orders add column if not exists shipping_provider text;
alter table orders add column if not exists tracking_id text;
alter table orders add column if not exists tracking_url text;
alter table orders add column if not exists shipping_status text;
alter table orders add column if not exists shipped_at timestamptz;
alter table orders add column if not exists delivered_at timestamptz;
alter table orders add column if not exists estimated_delivery_date date;

-- 8. UPDATED_AT TRIGGERS for new tables
create trigger set_updated_at_order_measurements
  before update on order_measurements
  for each row execute function update_updated_at_column();

create trigger set_updated_at_coupons
  before update on coupons
  for each row execute function update_updated_at_column();

-- 9. RLS POLICIES
-- Order measurements: service role only (private personal data)
alter table order_measurements enable row level security;
drop policy if exists "Service role manages order_measurements" on order_measurements;
create policy "Service role manages order_measurements"
  on order_measurements for all
  using (false)
  with check (false);

-- Order status history: service role only
alter table order_status_history enable row level security;
drop policy if exists "Service role manages order_status_history" on order_status_history;
create policy "Service role manages order_status_history"
  on order_status_history for all
  using (false)
  with check (false);

-- Coupons: anyone can read active coupons, service role manages
alter table coupons enable row level security;
drop policy if exists "Anyone can read active coupons" on coupons;
create policy "Anyone can read active coupons"
  on coupons for select
  using (is_active = true);
drop policy if exists "Service role manages coupons" on coupons;
create policy "Service role manages coupons"
  on coupons for all
  using (false)
  with check (false);

-- Coupon usage: service role only
alter table coupon_usage enable row level security;
drop policy if exists "Service role manages coupon_usage" on coupon_usage;
create policy "Service role manages coupon_usage"
  on coupon_usage for all
  using (false)
  with check (false);

-- Reviews: anyone can read approved reviews, service role manages all
alter table reviews enable row level security;
drop policy if exists "Anyone can read approved reviews" on reviews;
create policy "Anyone can read approved reviews"
  on reviews for select
  using (is_approved = true);
drop policy if exists "Service role manages reviews" on reviews;
create policy "Service role manages reviews"
  on reviews for all
  using (false)
  with check (false);

-- Order notifications: service role only
alter table order_notifications enable row level security;
drop policy if exists "Service role manages order_notifications" on order_notifications;
create policy "Service role manages order_notifications"
  on order_notifications for all
  using (false)
  with check (false);

-- 10. FUNCTION: Apply coupon with usage tracking (atomic)
create or replace function apply_coupon(
  p_coupon_code text,
  p_order_id uuid,
  p_customer_email text,
  p_order_subtotal integer
)
returns table(success boolean, discount_amount integer, message text)
language plpgsql
security definer
as $$
declare
  v_coupon record;
  v_usage_count integer;
  v_customer_usage_count integer;
  v_discount integer;
begin
  -- Find coupon
  select * into v_coupon
  from coupons
  where upper(code) = upper(p_coupon_code)
    and is_active = true;

  if v_coupon is null then
    return query select false, 0, 'Invalid coupon code'::text;
    return;
  end if;

  -- Check expiry
  if v_coupon.start_date is not null and now() < v_coupon.start_date then
    return query select false, 0, 'This coupon is not yet active'::text;
    return;
  end if;

  if v_coupon.end_date is not null and now() > v_coupon.end_date then
    return query select false, 0, 'This coupon has expired'::text;
    return;
  end if;

  -- Check minimum order amount
  if v_coupon.min_order_amount is not null and p_order_subtotal < v_coupon.min_order_amount then
    return query select false, 0, format('Minimum order amount is ₹%s', v_coupon.min_order_amount)::text;
    return;
  end if;

  -- Check total usage limit
  if v_coupon.usage_limit is not null then
    select count(*) into v_usage_count from coupon_usage where coupon_id = v_coupon.id;
    if v_usage_count >= v_coupon.usage_limit then
      return query select false, 0, 'This coupon has reached its usage limit'::text;
      return;
    end if;
  end if;

  -- Check per-customer usage
  if v_coupon.per_customer_limit is not null then
    select count(*) into v_customer_usage_count
    from coupon_usage
    where coupon_id = v_coupon.id and customer_email = p_customer_email;
    if v_customer_usage_count >= v_coupon.per_customer_limit then
      return query select false, 0, 'You have already used this coupon'::text;
      return;
    end if;
  end if;

  -- Calculate discount
  if v_coupon.discount_type = 'fixed' then
    v_discount := v_coupon.discount_value;
  else
    v_discount := round(p_order_subtotal * v_coupon.discount_value / 100)::integer;
  end if;

  -- Cap at max discount
  if v_coupon.max_discount_amount is not null and v_discount > v_coupon.max_discount_amount then
    v_discount := v_coupon.max_discount_amount;
  end if;

  -- Cap at order subtotal (no negative)
  if v_discount > p_order_subtotal then
    v_discount := p_order_subtotal;
  end if;

  -- Record usage
  insert into coupon_usage (coupon_id, order_id, customer_email, discount_amount)
  values (v_coupon.id, p_order_id, p_customer_email, v_discount);

  return query select true, v_discount, 'Coupon applied'::text;
end;
$$;
