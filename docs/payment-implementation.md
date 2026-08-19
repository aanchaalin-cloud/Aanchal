# Payment Implementation — Internal Working Report

Status: INTERNAL DRAFT for the Paytm audit (Phase 1/2 of the current task).
Audience: developer working on hardening. Not customer-facing.

## 1. Architecture summary

Aanchal uses a provider-adapter pattern for payments:

- `src/lib/payments.ts` — `getProviderAdapter(name)` returns the Razorpay or Paytm adapter.
- `src/lib/payments-types.ts` — `PaymentProviderAdapter`, `VerifyResult`, `CreateOrderResult`.
- `src/lib/payments-paytm.ts` — Paytm adapter (status re-confirmation via Paytm transactionStatus API).
- `src/lib/payments-razorpay.ts` — Razorpay adapter (HMAC signature + live payment fetch).
- `src/lib/paytm/index.ts` — low-level Paytm: config, checksum signature, initiateTransaction, transactionStatus, redirect URL, order-id builder.
- `src/app/api/checkout/create-order/route.ts` — builds order server-side, applies discounts, creates provider intent.
- `src/app/api/checkout/initiate-payment/route.ts` — re-initiate intent for an existing pending order (retry).
- `src/app/api/checkout/verify-payment/route.ts` — browser-side server re-confirmation (never trusts the client).
- `src/app/api/webhook/paytm/route.ts` — Paytm server-to-server callback.
- `src/app/api/webhook/razorpay/route.ts` — Razorpay `payment.captured` webhook (legacy/fallback).
- `src/lib/orders/finalize-payment.ts` — idempotent finalisation (stock decrement, status flip, history, influencer, notification).
- `src/lib/orders/public-status.ts` — HMAC status tokens for the order-success link / cancel.
- `src/lib/orders/get-order.ts` — order lookup helpers.
- `src/lib/orders/influencer-earnings.ts` — influencer commission lifecycle.

## 2. Provider selection

- Gateway = `paytm` when `getPaytmConfig()` returns a config (PAYTM_MID + PAYTM_MERCHANT_KEY + NEXT_PUBLIC_APP_URL).
- Otherwise gateway = `razorpay` (fallback). Razorpay is labelled "default" in a few comments but Paytm is the actual primary when configured.
- `.env.local` currently has NO Paytm keys and NO `ORDER_STATUS_TOKEN_SECRET` → locally Paytm is off and Razorpay is used. This is expected for local dev; production requires the Paytm keys.

## 3. Payment methods & server-side amounts (all recomputed server-side)

Constants in `create-order/route.ts`:
- `SHIPPING_FEE = 0` (free shipping everywhere).
- `PREPAID_DISCOUNT_RATE = 0.05` (5% prepaid discount).
- `INFLUENCER_DISCOUNT_CAP = 500` (₹500 cap), `INFLUENCER_COMMISSION_RATE = 0.1`.

Calculation order (all from DB prices, never from the browser):
1. subtotal = Σ unit_price (discount_price when lower) × qty — server reads products.
2. rawTotal = subtotal + shippingFee.
3. couponDiscount (fixed/percent, capped, min-order, usage/per-customer limits) or reward voucher (atomic claim).
4. totalAfterCoupon = rawTotal − couponDiscount.
5. influencerDiscount = min(10% of totalAfterCoupon, ₹500); totalAfterReferral = totalAfterCoupon − influencerDiscount.
6. If `prepaid`: prepaidDiscount = round(5% of totalAfterReferral); totalAmount = totalAfterReferral − prepaidDiscount; prepaidAmount = totalAmount; codAmount = 0.
7. If `cod` (50/50): totalAmount = totalAfterReferral; prepaidAmount = ceil(half); codAmount = floor(half).

Chargeable online amount = prepaidAmount (for cod) else totalAmount (for prepaid). All in paise via `rupeesToPaise`.

## 4. DB columns relevant to payments (orders)

From `phase_2`, `phase_19`, `phase_20` migrations:
- `payment_method` ('prepaid' | 'cod')
- `payment_provider` ('razorpay' | 'paytm') — default 'razorpay'
- `payment_status` ('pending','partially_paid','paid','failed','refunded','partially_refunded')
- `order_status` ('pending','confirmed','in_production','ready_to_ship','shipped','out_for_delivery','delivered','cancelled','return_requested','returned','refunded')
- `prepaid_amount`, `cod_amount`, `total_amount`, `discount_amount`, `subtotal`, `shipping_fee`
- `paytm_order_id` (unique partial index), `paytm_txn_id`
- `razorpay_order_id`, `razorpay_payment_id`
- `idempotency_key` (unique partial index) — duplicate-order guard
- `reward_voucher_code`, `used_by_order_id` (reward_vouchers)
- `order_number` (ANC-###### via sequence, unique)
- `shiprocket_shipment_id`, `tracking_id`, `tracking_url`, `shipping_provider`, `shipped_at`, `delivered_at`, `cancelled_at`, `cancellation_note`, `packaging_status`

Supporting tables: `order_items`, `order_measurements`, `order_status_history`, `order_notifications` (idempotent send log, unique partial index on (order_id,type) WHERE status='sent'), `coupon_usage`, `reviews`, `influencer_earnings`.

## 5. Paytm flow (current implementation)

1. `create-order` builds `paytm_order_id` (`AANCHAL-<orderid-hex>-<attempt>`), calls `initiateTransaction` → txnToken.
2. Browser redirected to `processTransaction?orderId=..&token=..`.
3. Paytm POSTs back to `${NEXT_PUBLIC_APP_URL}/api/webhook/paytm` (form with CHECKSUMHASH, or S2S JSON).
4. Webhook verifies checksum/signature, looks up order by `paytm_order_id`, amount-matches against `prepaid_amount`/`total_amount`, calls `finalizePaidOrder` (idempotent), then returns an HTML redirect to `/order-success?orderId=..&statusToken=..&refresh=1`.
5. Order-success page shows `PaymentStatusRefresher` which polls `verify-payment` while status is pending.

Signature algorithm: `base64(sha256(data + merchantKey))` where data is the exact JSON stringify(body) (S2S) or sorted `KEY=value&...` form params (excluding CHECKSUMHASH, empty values).

## 6. Verify-payment routes

- `provider:"paytm"` + `paytmOrderId` → `getTransactionStatus` re-confirm; checks order's current `paytm_order_id` matches; amount-compare `txnAmount` vs expected (prepaid_amount or total_amount); FAILED → mark payment failed + history; PENDING → 202; else finalize.
- Razorpay (default when no provider/`paytmOrderId`): verifies HMAC `order_id|payment_id`, fetches live payment amount/currency, amount+currency match, then finalize.

## 7. Idempotency & safety

- `finalizePaidOrder`: guards update with `.eq("payment_status","pending")`, re-selects nothing on concurrent; decrement stock atomically (RPC `decrement_variant_stock`), rolls back decremented stock if another request already finalised (increment back).
- Webhook: skips finalise if already paid/partially_paid; amount mismatch → 400; order not found → 404; returns HTML redirect regardless.
- Create-order: `idempotency_key` resumes existing pending order; reward voucher atomic claim + release on failure; Paytm initiate failure deletes order + cleans coupon usage.
- Status token: HMAC-SHA256 over `${orderId}|${paymentReference}` using `ORDER_STATUS_TOKEN_SECRET` (required env). Used for order-success and cancel.

## 8. Failure / retry UX

- Payment failure → order-success shows "Payment Failed" + `OrderRetryButton` → `initiate-payment` with fresh Paytm order id (attempt increments) → new redirect.
- Order status page `CancelOrderButton` with 15% deduction when dispatched.
- `PaymentStatusRefresher` polls up to 6×5s while pending.

## 9. Env vars required

- Paytm primary: `PAYTM_MID`, `PAYTM_MERCHANT_KEY`, `NEXT_PUBLIC_APP_URL`, optional `PAYTM_ENV`/`PAYTM_GATEWAY_BASE_URL`/`PAYTM_WEBSITE_NAME`.
- Razorpay fallback: `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
- `ORDER_STATUS_TOKEN_SECRET` (required for order-success/cancel tokens).
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Email: `RESEND_API_KEY`, `EMAIL_FROM`.
- Shipping: `SHIPPING_PROVIDER`, `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, optional `SHIPROCKET_BASE_URL`.

## 10. Known issues / audit candidates (Phase 2)

- `.env.example` documents `ORDER_STATUS_TOKEN_SECRET` but `.env.local` does not set it → `getRequiredServerEnv` would throw on first order-status use in local dev. Must be present in all non-local envs; flag in reports.
- Razorpay webhook marks `payment_status='paid'` (not `partially_paid`) even for COD orders — inconsistent with the 50/50 model used elsewhere. Verify whether Razorpay webhook should handle prepaid_amount for COD.
- Razorpay webhook does NOT set `order_status='confirmed'` history via `order_status_history`, and does not amount-verify (relies on signature only). Paytm path is stronger. Consider aligning.
- `create-order` uses `checkoutResponseData` with `statusToken` bound to `paytm_order_id ?? razorpay_order_id ?? ""` — empty reference yields token over empty string; acceptable but verify.
- Paytm webhook redirect always points to order-success even for TXN_FAILURE; acceptable (page shows failed state).
- Potential stock double-decrement race is mitigated by re-read + rollback, but the concurrent finalise path returns success while a second decrement was rolled back — OK.
- `verify-payment` paytm branch fetches adapter verify, then re-fetches order and compares `paytm_order_id` — good ownership check.
- No refund initiation against Paytm (refunds are manual). Document as manual step; note in audit.
