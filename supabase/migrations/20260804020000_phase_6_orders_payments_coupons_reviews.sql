-- ============================================================
-- Phase 6: Order extras, coupons, reviews, notifications
-- ============================================================
-- Adds: order_measurements, order_status_history, coupons,
--       coupon_usage, reviews, order_notifications + policies.
-- ============================================================

begin;

-- ------------------------------------------------------------------
-- order_measurements — custom-fit measurements per order
-- ------------------------------------------------------------------

create table if not exists public.order_measurements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  chest numeric(6, 2) not null check (chest >= 0),
  waist numeric(6, 2) not null check (waist >= 0),
  full_height numeric(6, 2) not null check (full_height >= 0),
  shoulder numeric(6, 2) not null check (shoulder >= 0),
  unit text not null default 'cm' check (unit in ('cm', 'inches')),
  personalisation_request text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists order_measurements_set_updated_at; create trigger order_measurements_set_updated_at
  before update on public.order_measurements
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- order_status_history — audit trail for order status changes
-- ------------------------------------------------------------------

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by text not null default 'admin' check (changed_by in ('admin', 'customer', 'system')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_status_history_order_idx on public.order_status_history (order_id, created_at);

drop trigger if exists order_status_history_set_updated_at on public.order_status_history; drop trigger if exists order_status_history_set_updated_at; create trigger order_status_history_set_updated_at
  before update on public.order_status_history
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- coupons
-- ------------------------------------------------------------------

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  description text,
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  discount_value numeric(10, 2) not null check (discount_value >= 0),
  min_order_amount numeric(10, 2) check (min_order_amount >= 0),
  max_discount_amount numeric(10, 2) check (max_discount_amount >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer check (per_customer_limit is null or per_customer_limit > 0),
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_percentage_check check (
    discount_type <> 'percentage' or discount_value <= 100
  )
);

drop trigger if exists coupons_set_updated_at on public.coupons; drop trigger if exists coupons_set_updated_at; create trigger coupons_set_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

-- Attach coupon FK to orders (table created in Phase 2)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_coupon_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_coupon_id_fkey
      foreign key (coupon_id) references public.coupons(id);
  end if;
end;
$$;

create index if not exists coupons_active_code_idx on public.coupons (code)
  where is_active = true;

create index if not exists coupons_created_at_idx on public.coupons (created_at desc);

-- ------------------------------------------------------------------
-- coupon_usage — redemptions for usage-limit accounting
-- ------------------------------------------------------------------

create table if not exists public.coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  customer_email text,
  discount_amount numeric(10, 2) not null default 0 check (discount_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupon_usage_order_unique unique (coupon_id, order_id)
);

create index if not exists coupon_usage_coupon_created_idx on public.coupon_usage (coupon_id, created_at);

drop trigger if exists coupon_usage_set_updated_at; create trigger coupon_usage_set_updated_at
  before update on public.coupon_usage
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------
-- reviews
-- ------------------------------------------------------------------

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text not null,
  is_verified_purchase boolean not null default false,
  is_approved boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_product_customer_unique unique (product_id, customer_email)
);

drop trigger if exists reviews_set_updated_at on public.reviews; drop trigger if exists reviews_set_updated_at; create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create index if not exists reviews_approved_created_idx on public.reviews (product_id, is_approved, created_at desc);
create index if not exists reviews_featured_idx on public.reviews (is_approved, is_featured, created_at desc);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

-- ------------------------------------------------------------------
-- order_notifications — idempotent outbound notification log
-- ------------------------------------------------------------------

create table if not exists public.order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_phone text,
  type text not null,
  provider text,
  status text not null check (status in ('sent', 'failed')),
  provider_message_id text,
  failure_reason text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists order_notifications_set_updated_at on public.order_notifications; drop trigger if exists order_notifications_set_updated_at; create trigger order_notifications_set_updated_at
  before update on public.order_notifications
  for each row execute function public.set_updated_at();

create unique index order_notifications_sent_unique
  on public.order_notifications (order_id, type)
  where status = 'sent';

create index if not exists order_notifications_created_idx on public.order_notifications (created_at desc);

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------

alter table public.order_measurements enable row level security;
alter table public.order_status_history enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usage enable row level security;
alter table public.reviews enable row level security;
alter table public.order_notifications enable row level security;

-- order_measurements — admin only (measurements are private)
drop policy if exists admin_read_order_measurements; create policy admin_read_order_measurements
  on public.order_measurements for select
  to authenticated
  using ((select public.is_admin()));

-- order_status_history — admin read
drop policy if exists admin_read_order_status_history; create policy admin_read_order_status_history
  on public.order_status_history for select
  to authenticated
  using ((select public.is_admin()));

-- coupons — admin manage only (public validation happens via service role)
drop policy if exists admin_read_coupons; create policy admin_read_coupons
  on public.coupons for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists admin_insert_coupons; create policy admin_insert_coupons
  on public.coupons for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists admin_update_coupons; create policy admin_update_coupons
  on public.coupons for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists admin_delete_coupons; create policy admin_delete_coupons
  on public.coupons for delete
  to authenticated
  using ((select public.is_admin()));

-- coupon_usage — admin read
drop policy if exists admin_read_coupon_usage; create policy admin_read_coupon_usage
  on public.coupon_usage for select
  to authenticated
  using ((select public.is_admin()));

-- reviews — public can read approved reviews; admins manage all
drop policy if exists public_read_approved_reviews; create policy public_read_approved_reviews
  on public.reviews for select
  to anon, authenticated
  using (is_approved = true);

drop policy if exists admin_all_reviews; create policy admin_all_reviews
  on public.reviews for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- order_notifications — admin read
drop policy if exists admin_read_order_notifications; create policy admin_read_order_notifications
  on public.order_notifications for select
  to authenticated
  using ((select public.is_admin()));

-- ------------------------------------------------------------------
-- Privileges (service role bypasses RLS; grants cover anon/auth paths)
-- ------------------------------------------------------------------

revoke all on table
  public.order_measurements,
  public.order_status_history,
  public.coupons,
  public.coupon_usage,
  public.reviews,
  public.order_notifications
from anon, authenticated;

grant select on table
  public.order_measurements,
  public.order_status_history,
  public.coupons,
  public.coupon_usage,
  public.reviews,
  public.order_notifications
to authenticated;

grant insert, update, delete on table
  public.coupons,
  public.reviews
to authenticated;

grant select on table public.reviews to anon;

commit;
