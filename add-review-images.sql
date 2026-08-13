-- Migration: Add review_images table
-- Date: 2026-08-12
-- Adds a normalized table to store public URLs for review images uploaded by customers.
-- Note: Create the storage bucket `review-images` in Supabase Storage (or change the bucket name in server code).

-- Ensure pgcrypto extension (for gen_random_uuid) is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table: review_images
CREATE TABLE IF NOT EXISTS review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index to speed lookups by review_id
CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images(review_id);

-- Optional: a small permission note (run in Supabase SQL editor as a migration):
-- Ensure the service role used by server code has INSERT on review_images and that the anon/public role has SELECT if public reads are allowed.

-- End migration
