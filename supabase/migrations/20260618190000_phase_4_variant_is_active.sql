-- Add is_active column to product_variants for safe soft-deletion.
-- When a variant is referenced by order_items, set is_active=false
-- instead of deleting, so old orders retain referential integrity.

alter table public.product_variants
  add column if not exists is_active boolean not null default true;

create index if not exists product_variants_active_idx
  on public.product_variants (product_id, is_active)
  where is_active = true;
