-- ============================================================
-- Phase 9: Schema fixes, packaging, rewards, and order history
-- ============================================================

-- 1. Fix order_status CHECK constraint to match expanded TypeScript types
--    Drop the old constraint and add a new comprehensive one.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN (
    'pending', 'confirmed', 'in_production', 'ready_to_ship',
    'shipped', 'out_for_delivery', 'delivered',
    'cancelled', 'return_requested', 'returned', 'refunded'
  ));

-- 2. Fix payment_status CHECK constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN (
    'pending', 'partially_paid', 'paid', 'failed',
    'refunded', 'partially_refunded'
  ));

-- 3. Add packaging_status to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS packaging_status text
  NOT NULL DEFAULT 'pending'
  CHECK (packaging_status IN ('pending', 'packed', 'ready_for_pickup'));

-- 4. Fix the trigger functions on order_measurements and coupons
--    The Phase 8 migration referenced update_updated_at_column() which may not exist.
--    Drop and recreate using the canonical set_updated_at() from Phase 2.
DROP TRIGGER IF EXISTS set_updated_at_order_measurements ON public.order_measurements;
CREATE TRIGGER set_updated_at_order_measurements
  BEFORE UPDATE ON public.order_measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_coupons ON public.coupons;
CREATE TRIGGER set_updated_at_coupons
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Add set_updated_at trigger to order_status_history
CREATE TRIGGER set_updated_at_order_status_history
  BEFORE UPDATE ON public.order_status_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- CUSTOMER REWARD SYSTEM
-- ============================================================

-- reward_submissions: customers submit social posts + reviews for voucher approval
CREATE TABLE IF NOT EXISTS public.reward_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  social_url text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('instagram', 'youtube', 'facebook', 'other')),
  review_title text,
  review_body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_submissions_status ON public.reward_submissions(status);
CREATE INDEX IF NOT EXISTS idx_reward_submissions_order ON public.reward_submissions(order_id);
CREATE INDEX IF NOT EXISTS idx_reward_submissions_email ON public.reward_submissions(customer_email);

-- reward_vouchers: unique voucher codes issued on approval
CREATE TABLE IF NOT EXISTS public.reward_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.reward_submissions(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  customer_email text NOT NULL,
  value integer NOT NULL CHECK (value > 0 AND value <= 10000),
  is_used boolean NOT NULL DEFAULT false,
  used_by_order_id uuid REFERENCES public.orders(id) ON DELETE set null,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_vouchers_code ON public.reward_vouchers(code);
CREATE INDEX IF NOT EXISTS idx_reward_vouchers_email ON public.reward_vouchers(customer_email);

-- RLS for reward tables: service-role only
ALTER TABLE public.reward_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages reward_submissions" ON public.reward_submissions;
CREATE POLICY "Service role manages reward_submissions" ON public.reward_submissions
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Service role manages reward_vouchers" ON public.reward_vouchers;
CREATE POLICY "Service role manages reward_vouchers" ON public.reward_vouchers
  USING (false) WITH CHECK (false);

-- Grants
GRANT SELECT ON public.reward_submissions TO authenticated;
GRANT SELECT ON public.reward_vouchers TO authenticated;

-- ============================================================
-- PRODUCT REVIEWS: Add CHECK for image_url if needed
-- Reviews table already exists from Phase 8, but ensure proper indexing
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reviews_product_rating ON public.reviews(product_id, rating);
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON public.reviews(is_featured, is_approved) WHERE is_featured = true AND is_approved = true;

-- ============================================================
-- ORDER STATUS HISTORY: Ensure proper indexing for timeline queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_order_status_history_created ON public.order_status_history(order_id, created_at);
