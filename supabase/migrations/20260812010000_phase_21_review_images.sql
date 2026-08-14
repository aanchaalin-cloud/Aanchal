-- ============================================================
-- Phase 21: Review images storage support
-- ============================================================
-- Adds review_images metadata and a dedicated Supabase storage bucket
-- for customer-uploaded review photos.
-- ============================================================

begin;

-- ------------------------------------------------------------------
-- Storage bucket for review images
-- ------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-images',
  'review-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

-- Public read access for review images
-- These URLs are intended to be public once a review is approved.

drop policy if exists "Public read review-images" on storage.objects;
create policy "Public read review-images"
  on storage.objects for select
  to public
  using (bucket_id = 'review-images');

-- Admin-only write access for review image objects

drop policy if exists "Admin insert review-images" on storage.objects;
create policy "Admin insert review-images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-images'
    and (select public.is_admin())
  );

drop policy if exists "Admin update review-images" on storage.objects;
create policy "Admin update review-images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'review-images'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'review-images'
    and (select public.is_admin())
  );

drop policy if exists "Admin delete review-images" on storage.objects;
create policy "Admin delete review-images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'review-images'
    and (select public.is_admin())
  );

-- ------------------------------------------------------------------
-- review_images table
-- ------------------------------------------------------------------

create table if not exists public.review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists review_images_review_id_idx on public.review_images (review_id);

drop trigger if exists review_images_set_updated_at; create trigger review_images_set_updated_at
  before update on public.review_images
  for each row execute function public.set_updated_at();

alter table public.review_images enable row level security;

drop policy if exists public_read_review_images; create policy public_read_review_images
  on public.review_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.reviews
      where reviews.id = review_images.review_id
        and reviews.is_approved = true
    )
  );

drop policy if exists admin_all_review_images; create policy admin_all_review_images
  on public.review_images for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on table public.review_images from anon, authenticated;
grant select on table public.review_images to anon, authenticated;
grant insert, update, delete on table public.review_images to authenticated;

commit;
