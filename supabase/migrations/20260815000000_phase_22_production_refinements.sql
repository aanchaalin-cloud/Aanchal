-- ============================================================
-- PHASE 22 — Production refinement (idempotent)
-- 1. customers.username for username sign-in
-- 2. influencer_profiles.niche + desired_promo_code
-- 3. reviews.customer_email becomes optional (nullable)
-- 4. homepage_sections 'hero' content fixes (no "exotic", lowercase video)
-- ============================================================

-- ── 1. Username column for customers ──
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS username text;

COMMENT ON COLUMN customers.username IS 'Optional display/username used for sign-in. Stored lowercased.';

-- Case-insensitive uniqueness; the app always writes/looks up lowercased
-- usernames, so this index keeps lookups safe and fast.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'customers' AND indexname = 'customers_username_lower_idx'
  ) THEN
    CREATE UNIQUE INDEX customers_username_lower_idx ON customers ((lower(username)))
      WHERE username IS NOT NULL;
  END IF;
END $$;

-- ── 2. Influencer extra fields ──
ALTER TABLE influencer_profiles
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS desired_promo_code text;

COMMENT ON COLUMN influencer_profiles.niche IS 'Content niche/category chosen by the influencer during application.';
COMMENT ON COLUMN influencer_profiles.desired_promo_code IS 'Promo/referral code the influencer would like for their first purchase.';

-- ── 3. Reviews: email becomes optional ──
ALTER TABLE reviews
  ALTER COLUMN customer_email DROP NOT NULL;

COMMENT ON COLUMN reviews.customer_email IS 'Optional — reviews may be submitted without an email.';

-- ── 4. Homepage hero content fixes ──
-- Remove the word "exotic" from headline defaults and point the video at the
-- actual tracked file name (lowercase), matching public/video1.mp4.
UPDATE homepage_sections
SET content = jsonb_set(
      content,
      '{headline}',
      '"Premium Anarkali"'
    )
WHERE section_key = 'hero'
  AND COALESCE(content->>'headline', '') ILIKE '%exotic%';

UPDATE homepage_sections
SET content = jsonb_set(
      content,
      '{videoUrl}',
      '"/video1.mp4"'
    )
WHERE section_key = 'hero'
  AND COALESCE(content->>'videoUrl', '/video1.mp4') = '/Video1.mp4';