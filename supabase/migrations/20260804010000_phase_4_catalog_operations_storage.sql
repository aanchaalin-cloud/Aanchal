-- ============================================================
-- Phase 4: Catalog operations and storage
-- ============================================================
-- 1. Atomic stock decrement / increment for payment finalization
-- 2. Stock restore on cancellation
-- 3. Public product-images storage bucket + policies
-- ============================================================

-- ------------------------------------------------------------------
-- Atomic stock operations
-- ------------------------------------------------------------------

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
    return query select false,
      format('Insufficient stock. Available: %s, Requested: %s', v_current_stock, p_quantity),
      v_current_stock;
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

-- ------------------------------------------------------------------
-- Stock restore on cancellation
-- ------------------------------------------------------------------

create or replace function public.cancel_order_stock_restore(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
begin
  for v_item in
    select variant_id, quantity
    from public.order_items
    where order_id = p_order_id and variant_id is not null
  loop
    update public.product_variants
    set stock = stock + v_item.quantity
    where id = v_item.variant_id;
  end loop;
end;
$$;

revoke all on function public.cancel_order_stock_restore from public, anon;
grant execute on function public.cancel_order_stock_restore to authenticated;

-- ------------------------------------------------------------------
-- Storage bucket for product images
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- 1. Public read — anyone can view product images
drop policy if exists "Public read product-images" on storage.objects;
create policy "Public read product-images"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

-- 2. Admin insert — only authenticated admin_users can upload
drop policy if exists "Admin insert product-images" on storage.objects;
create policy "Admin insert product-images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (select public.is_admin())
  );

-- 3. Admin update
drop policy if exists "Admin update product-images" on storage.objects;
create policy "Admin update product-images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'product-images'
    and (select public.is_admin())
  );

-- 4. Admin delete
drop policy if exists "Admin delete product-images" on storage.objects;
create policy "Admin delete product-images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_admin())
  );
