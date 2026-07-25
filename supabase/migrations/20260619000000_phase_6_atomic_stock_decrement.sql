-- Phase 6: Atomic inventory operations
-- ============================================================
-- 1. atomic_stock_decrement: lock row, check stock, decrement (for payment finalization)
-- 2. atomic_stock_increment: lock row, increment stock (for rollback on partial failure)

create or replace function public.decrement_variant_stock(
  p_variant_id uuid,
  p_quantity int
)
returns table (
  success boolean,
  message text,
  remaining_stock int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_stock int;
begin
  select stock into v_current_stock
  from public.product_variants
  where id = p_variant_id
  for update;

  if not found then
    return query select false, 'Variant not found'::text, 0::int;
    return;
  end if;

  if v_current_stock < p_quantity then
    return query select false, format('Insufficient stock. Available: %s, Requested: %s', v_current_stock, p_quantity), v_current_stock;
    return;
  end if;

  update public.product_variants
  set stock = stock - p_quantity
  where id = p_variant_id;

  return query select true, 'Stock decremented'::text, (v_current_stock - p_quantity)::int;
end;
$$;

create or replace function public.increment_variant_stock(
  p_variant_id uuid,
  p_quantity int
)
returns table (
  success boolean,
  message text,
  remaining_stock int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_stock int;
begin
  select stock into v_current_stock
  from public.product_variants
  where id = p_variant_id
  for update;

  if not found then
    return query select false, 'Variant not found'::text, 0::int;
    return;
  end if;

  update public.product_variants
  set stock = stock + p_quantity
  where id = p_variant_id;

  return query select true, 'Stock incremented'::text, (v_current_stock + p_quantity)::int;
end;
$$;

revoke all on function public.decrement_variant_stock from public, anon;
grant execute on function public.decrement_variant_stock to authenticated;

revoke all on function public.increment_variant_stock from public, anon;
grant execute on function public.increment_variant_stock to authenticated;
