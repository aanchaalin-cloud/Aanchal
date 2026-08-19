-- ============================================================
-- Phase 23: Money precision (numeric(10,2) money columns)
-- ============================================================
-- The orders money columns were integer rupees, but totals are computed in
-- paise/rupees-with-2-decimals (products/coupons are numeric(10,2)). Any order
-- whose total has paise (fractional product price, fixed coupon, 5% prepaid
-- discount, 50/50 split) could not be stored consistently: the integer columns
-- rounded the stored prepaid_amount away from the charged paise amount, so
-- verify-payment would reject a genuinely paid order ("amount mismatch"), and
-- the CHECK total_amount = subtotal + shipping_fee - discount_amount could fail.
--
-- Widening discount_amount / prepaid_amount / cod_amount to numeric(10,2)
-- makes storage equal to the charged amount and keeps the CHECK exact.
-- Existing rows are integers, so the cast is lossless.
-- ============================================================

begin;

alter table public.orders
  alter column discount_amount type numeric(10, 2),
  alter column prepaid_amount type numeric(10, 2),
  alter column cod_amount type numeric(10, 2);

commit;
