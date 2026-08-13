-- ============================================================
-- Phase 17: Auth hardening — restrict stock RPC execution
-- ============================================================
-- decrement_variant_stock / increment_variant_stock /
-- cancel_order_stock_restore are SECURITY DEFINER helpers used
-- ONLY by server-side routes (Razorpay webhook + payment
-- verification) through the service-role client. They were
-- granted EXECUTE to `authenticated`, which let any signed-in
-- user mutate product stock directly via the browser client.
-- Fix: restrict execution to service_role (postgres superuser
-- bypasses permission checks). Idempotent.
-- ============================================================

revoke execute on function public.decrement_variant_stock from authenticated;
revoke execute on function public.increment_variant_stock from authenticated;
revoke execute on function public.cancel_order_stock_restore from authenticated;

grant execute on function public.decrement_variant_stock to service_role;
grant execute on function public.increment_variant_stock to service_role;
grant execute on function public.cancel_order_stock_restore to service_role;
