-- Phase 7: Supabase Storage bucket for product images
-- ============================================================
-- NOTE: The bucket must also exist. Run this SQL in the Supabase
-- SQL Editor AFTER applying the migration:
--
--   insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
--   values (
--     'product-images',
--     'product-images',
--     true,
--     5242880,
--     array['image/jpeg', 'image/png', 'image/webp']
--   )
--   on conflict (id) do nothing;
--
-- Or create it manually via Dashboard → Storage → Create bucket:
--   Name: product-images
--   Public: true
--   File size limit: 5 MB
--   Allowed MIME types: image/jpeg, image/png, image/webp

-- ============================================================
-- Storage policies
-- ============================================================

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

-- 3. Admin update — only authenticated admin_users can update
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

-- 4. Admin delete — only authenticated admin_users can delete
drop policy if exists "Admin delete product-images" on storage.objects;
create policy "Admin delete product-images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select public.is_admin())
  );
