-- ============================================================
-- Phase 24: WhatsApp manual confirmation (Phase 1 launch)
-- ============================================================
-- Marks orders placed through the temporary manual WhatsApp flow so the UI
-- and admin can treat them correctly WITHOUT touching the payment/shipping
-- architecture. order_status 'pending' already means "awaiting confirmation",
-- so no new status value is invented: confirmation_method only records HOW the
-- order is being confirmed (manually via WhatsApp vs online payment gateway).
-- Phase 2+ payment/shipping flows are unaffected (default 'payment').
-- ============================================================

begin;

alter table public.orders
  add column confirmation_method text not null default 'payment'
  check (confirmation_method in ('payment', 'whatsapp'));

comment on column public.orders.confirmation_method is
  'How the order is confirmed: ''payment'' (online gateway, Phase 2+) or ''whatsapp'' (manual owner confirmation, Phase 1).';

create index if not exists orders_confirmation_method_idx
  on public.orders (confirmation_method, created_at desc)
  where confirmation_method = 'whatsapp';

commit;
