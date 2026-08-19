# Performance Audit Report

**Audit date:** 2026-08-15 · **Format:** CURRENT → PROBLEM → CHANGE → EXPECTED BENEFIT (findings, not a changelog).

Verdict labels: `PASS` / `FAIL` / `PARTIAL` / `NOT TESTED` / `BLOCKED`.

---

## 1. Storefront caching

**CURRENT:** Product detail, shop, and homepage pages are static/ISR with `export const revalidate = 60` (`products/[slug]/page.tsx:85`, `shop/page.tsx:20`, `page.tsx:18`). Account and influencer pages use `force-dynamic`.

**PROBLEM:** None for the storefront. Public catalog pages are the highest-traffic surface; 60s ISR is a reasonable freshness/cost balance.

**CHANGE:** None required.

**EXPECTED BENEFIT:** Catalog pages served from the edge/ISR cache instead of hitting Supabase per request.

## 2. Image optimization

**CURRENT:** `next/image` used in `ProductCard.tsx` (first + hover images) and `ProductDetail.tsx` with explicit `sizes` attributes. `next.config.ts` enables `formats: ["image/avif", "image/webp"]` and restricts remote patterns to Supabase storage.

**PROBLEM:** None. Unoptimized `<img>` or missing `sizes` would cause layout shift and oversized downloads.

**CHANGE:** None required.

**EXPECTED BENEFIT:** AVIF/WebP delivery + responsive sizing keeps product-grid payloads small.

## 3. Database query patterns

**CURRENT:** Server components query Supabase via typed helpers (`src/lib/queries/products.ts`, `customers.ts`). Admin + checkout routes use the service client. Order lookups use embedded selects (`order_status_history`, `order_items`).

**PROBLEM:** None observed at read level. Some routes (`getRelatedProducts`, recently-viewed) perform per-page queries but are bounded.

**CHANGE:** None required.

**EXPECTED BENEFIT:** No N+1 loops in the audited hot paths (product list, product detail, order status).

## 4. Index coverage

**CURRENT:** Indexes exist on the hot paths: `orders(order_status, created_at)`, `orders(customer_email, created_at)`, `orders(payment_status, created_at)`, `order_items(order_id/product_id/variant_id)`, `order_status_history(order_id, created_at)`, `reviews(product_id, is_approved, created_at)`, `product_variants(product_id, stock)`, `coupons(code)`, `order_notifications(order_id,type) WHERE status='sent'`, `orders(idempotency_key)` unique, `orders(paytm_order_id)` unique, `orders(order_number)` unique.

**PROBLEM:** `order_measurements(order_id)` has no index — every admin order-detail lookup scans the table. Table is small (one row per order) and reads are admin-only.

**CHANGE:** None required now (low impact). Add `create index order_measurements_order_idx on order_measurements(order_id)` if the table grows.

**EXPECTED BENEFIT:** Admin order-detail queries stay on index seeks rather than scans.

## 5. Rate limiting

**CURRENT:** In-memory per-IP limiter in `src/lib/api-utils.ts` (`validateRequest`): 10 req/min public, 30 req/min admin.

**PROBLEM:** In-memory map is per-instance; on Vercel serverless each cold start gets a fresh map, so it is best-effort only. An attacker can spread requests across instances.

**CHANGE:** None (no caching library wanted unless clearly needed). Document that `UPSTASH_REDIS_*` + `@upstash/ratelimit` is the path if abuse appears.

**EXPECTED BENEFIT:** Reasonable throttle for cheap abuse today; a documented upgrade path.

## 6. Security headers

**CURRENT:** `next.config.ts` sets HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, CSP (with Razorpay checkout allowed), Referrer-Policy, Permissions-Policy.

**PROBLEM:** None. CSP has `'unsafe-inline'` for script (required for the inline `dangerouslySetInnerHTML` JSON-LD and Paytm/Razorpay SDK snippets) and `'unsafe-inline'` styles.

**CHANGE:** None required.

**EXPECTED BENEFIT:** Hardened against clickjacking, MIME sniffing, and mixed content; Razorpay flow kept functional.

## 7. Admin route auth

**CURRENT:** All `src/app/api/admin/**` routes call `requireAdmin`/`requireSuperAdmin` + `validateRequest`.

**PROBLEM:** None.

**CHANGE:** None required.

**EXPECTED BENEFIT:** Admin-only writes; no anonymous catalog mutation.

## 8. Webhook / callback payloads

**CURRENT:** Paytm callback verifies checksum/signature + amount; Razorpay webhook verifies HMAC + amount; both idempotent; both log via `src/lib/logger`.

**PROBLEM:** Webhooks are unauthenticated by design (signed payloads instead); no explicit IP allowlist/rate limit on the two webhook routes.

**CHANGE:** None (signature verification is the correct control). Optional: add per-IP limiting on webhook routes.

**EXPECTED BENEFIT:** Signed, replay-safe payment callbacks without breaking Paytm/Razorpay delivery.

## 9. Unnecessary work

**CURRENT:** `getPublicOrderStatus` calls `noStore()` — correct (status must be fresh). `order_confirmed` email is sent inside `finalizePaidOrder` after DB commit, non-fatal.

**PROBLEM:** None blocking.

**CHANGE:** None.

**EXPECTED BENEFIT:** Status and payment paths are always fresh; email latency cannot delay order finalization.

## 10. Overall verdict

Storefront performance posture is `PASS` (ISR + `next/image` + index coverage). Distributed rate limiting and the `order_measurements` index are the only noted improvements, neither blocking. No Redis/caching library introduced — none is clearly needed.
