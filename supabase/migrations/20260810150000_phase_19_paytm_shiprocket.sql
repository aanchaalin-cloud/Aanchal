-- ============================================================
-- Phase 19: Paytm payment gateway + order integrity fields
-- ============================================================
-- Adds: payment_provider, Paytm transaction references,
--       idempotency_key (duplicate-order guard),
--       reward_voucher_code (audit + one-time redemption),
--       shiprocket shipment references.
-- ============================================================

begin;

-- ------------------------------------------------------------------
-- orders: payment provider + Paytm refs
-- ------------------------------------------------------------------

alter table public.orders
  add column payment_provider text not null default 'razorpay'
  check (payment_provider in ('razorpay', 'paytm'));

alter table public.orders
  add column paytm_order_id text;

alter table public.orders
  add column paytm_txn_id text;

-- ------------------------------------------------------------------
-- orders: idempotency key (client-generated; guards duplicate orders)
-- ------------------------------------------------------------------

alter table public.orders
  add column idempotency_key text;

create unique index orders_idempotency_key_idx
  on public.orders (idempotency_key)
  where idempotency_key is not null;

-- ------------------------------------------------------------------
-- orders: reward voucher redemption audit
-- ------------------------------------------------------------------

alter table public.orders
  add column reward_voucher_code text;

-- ------------------------------------------------------------------
-- orders: Shiprocket shipment reference
-- ------------------------------------------------------------------

alter table public.orders
  add column shiprocket_shipment_id text;

create unique index orders_paytm_order_idx
  on public.orders (paytm_order_id)
  where paytm_order_id is not null;

create index if not exists orders_shiprocket_shipment_idx
  on public.orders (shiprocket_shipment_id)
  where shiprocket_shipment_id is not null;

commit;
