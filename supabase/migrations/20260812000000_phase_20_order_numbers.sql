-- ============================================================
-- Phase 20: Human-readable order numbers
-- ============================================================
-- Adds a customer-facing order_number (e.g. ANC-000123) so buyers
-- can reference their order without a raw UUID. New orders get one
-- automatically via the sequence default; existing orders are
-- backfilled in chronological order.
-- ============================================================

begin;

create sequence public.orders_order_number_seq;

alter table public.orders
  add column order_number text;

alter table public.orders
  alter column order_number set default
    ('ANC-' || lpad(nextval('public.orders_order_number_seq')::text, 6, '0'));

-- Backfill existing orders in chronological order.
update public.orders
set order_number = 'ANC-' || lpad(nextval('public.orders_order_number_seq')::text, 6, '0')
where order_number is null;

alter table public.orders
  alter column order_number set not null;

create unique index orders_order_number_idx
  on public.orders (order_number);

-- ------------------------------------------------------------------
-- reward_vouchers: track which order redeemed the voucher
-- (write path in /api/checkout/create-order depends on this column)
-- ------------------------------------------------------------------

alter table public.reward_vouchers
  add column used_by_order_id uuid references public.orders(id) on delete set null;

commit;
