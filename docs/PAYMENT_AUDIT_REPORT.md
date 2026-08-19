# Payment Audit Report — Paytm (primary) + Razorpay (fallback)

**Audit date:** 2026-08-15 · **Scope:** checkout, payment initiation, verification, callbacks, webhooks, idempotency, provider selection, secrets handling.

Verdict labels: `PASS` / `FAIL` / `PARTIAL` / `NOT TESTED` / `BLOCKED`.

---

## 1. Provider selection

| Item | Verdict | Notes |
|---|---|---|
| Paytm primary when configured | `PASS` | `src/app/api/checkout/create-order/route.ts:257` selects Paytm whenever `PAYTM_MID` + `PAYTM_MERCHANT_KEY` are present, else Razorpay. |
| Razorpay fallback retained | `PASS` | Fallback path creates Razorpay order + SDK-free webhook in `src/app/api/webhook/razorpay/route.ts`. No code removed. |
| Provider-adapter pattern reused | `PASS` | `src/lib/payments/index.ts` `getProviderAdapter` used by create-order and verify-payment; no duplicate inline logic except the legacy Razorpay fallback branch that pre-dates the adapter. |
| Both gateways never active simultaneously | `PASS` | Single `payment_provider` per order (`orders.payment_provider` column with CHECK constraint, phase_19). |
| Production credentials validated | `BLOCKED` | `.env.local` lacks `PAYTM_MID`, `PAYTM_MERCHANT_KEY`, `PAYTM_ENV`, `PAYTM_WEBSITE_NAME`. Live Paytm calls cannot be tested locally. |

## 2. Amounts are server-authoritative

| Item | Verdict | Notes |
|---|---|---|
| Browser amount ignored | `PASS` | create-order recomputes subtotal from DB prices (line 336), never trusts cart totals; unit price = discount price when valid. |
| Prepaid 5% discount | `PASS` | `PREPAID_DISCOUNT_RATE = 0.05` applied server-side after coupon + influencer discounts (`route.ts:497`). |
| 50/50 split | `PASS` | `prepaidAmount = ceil(total/2)`, `codAmount = floor(total/2)` (`route.ts:504`). |
| COD remainder recorded | `PASS` | `cod_amount` persisted; COD orders remain `payment_status = pending` until prepaid leg verified. |
| Payment amount re-checked at verify | `PASS` | verify-payment compares provider-reported paise against server expected (Paytm `route.ts:105`, Razorpay `route.ts:168`); currency must be INR for Razorpay. |
| Paytm webhook amount re-checked | `PASS` | `src/app/api/webhook/paytm/route.ts:122` compares `txnAmount` to expected paise before finalize. |

## 3. Signature verification (fail closed)

| Item | Verdict | Notes |
|---|---|---|
| Paytm response signature verification | `PASS` | `src/lib/paytm/index.ts` `verifyResponseSignature(rawText, merchantKey)` re-serialises the exact `body` and compares `head.signature`. `initiateTransaction` and `getTransactionStatus` fail closed on an invalid present signature. |
| Paytm callback checksum | `PASS` | Webhook verifies JSON `head.signature` or form `CHECKSUMHASH` before any state change (`webhook/paytm/route.ts:70,82`). |
| Razorpay webhook HMAC | `PASS` | `webhook/razorpay/route.ts` verifies the `x-razorpay-signature` HMAC with `RAZORPAY_WEBHOOK_SECRET` using timing-safe comparison. |
| Razorpay payment signature | `PASS` | verify-payment uses the adapter's `verifyPayment`; `src/lib/payments-razorpay.ts` compares with `timingSafeEqualUtf8`. |
| No-signature responses | `PARTIAL` | Responses without a signature are HTTPS-trusted with a warning log. Acceptable on the Paytm S2S path, but ideally Paytm would always sign. |

## 4. Idempotency / duplicate order protection

| Item | Verdict | Notes |
|---|---|---|
| Idempotency key on create-order | `PASS` | Unique partial index `orders_idempotency_key_idx`; resume path returns the existing pending order instead of creating a duplicate (create-order `route.ts:273`). |
| Paytm order id unique | `PASS` | `orders_paytm_order_idx` unique partial index; retry uses `buildPaytmOrderId(orderId, attempt+1)`. |
| Verify-payment idempotent | `PASS` | `paid`/`partially_paid` short-circuit (`route.ts:70,159`). |
| Webhook/callback idempotent | `PASS` | Both paytm callback and razorpay webhook no-op when already processed. |
| `finalizePaidOrder` idempotent | `PASS` | `src/lib/orders/finalize-payment.ts` guards against double stock decrement / double confirmation email. |
| Duplicate order via back button / refresh | `PASS` | Client uses the idempotency key + status token; server-side checks covered above. |

## 5. Stock safety

| Item | Verdict | Notes |
|---|---|---|
| Stock decremented atomically | `PASS` | `decrement_variant_stock` RPC (security definer, service-role only — phase_17 revoked `authenticated`/`anon` execute and granted `service_role`). |
| Rollback on finalize failure | `PASS` | `incrementStockForItems` restores stock when finalization fails mid-way. |
| Stock check at create | `PASS` | create-order rejects `INSUFFICIENT_STOCK` (409) before order creation. |
| Stock RPC escalation surface | `PASS` | No `authenticated`/`anon` execute on stock RPCs; all callers use the service client (`src/lib/stock.ts`, admin update-status, orders/cancel). |

## 6. Secrets handling

| Item | Verdict | Notes |
|---|---|---|
| Server secrets server-side only | `PASS` | `PAYTM_MERCHANT_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `ORDER_STATUS_TOKEN_SECRET` are never exported to the client. Only `NEXT_PUBLIC_RAZORPAY_KEY_ID` is public. |
| Order status token secret | `PASS` | `src/lib/orders/public-status.ts` requires `ORDER_STATUS_TOKEN_SECRET` explicitly — no fallback to the service role key. |
| No secrets committed | `PASS` | `.env.local` is git-ignored; `.env.example` contains placeholders only. |

## 7. Failure handling

| Item | Verdict | Notes |
|---|---|---|
| Payment failed marked | `PASS` | `TXN_FAILURE`/`FAILED` paths set `payment_status = failed` + status-history note. |
| Pending treated distinctly | `PASS` | `PENDING`/`STATUS` return 202 with `code: "PENDING"` so the client can poll rather than error. |
| Payment never fully configured | `PASS` | Returns 503 `Messages.paymentNotConfigured`; order is rolled back (deleted) with voucher/coupon-usage cleanup. |
| Refund flow (Paytm) | `NOT TESTED` | No refund API call exists; refunds are processed manually in the Paytm dashboard. Flagged for the merchant. |

## 8. Payment option calculation (regression summary)

- Prepaid (100%): `total = base − 5%`; `prepaid = total`, `cod = 0`.
- Half-half (50/50): `total = base`; `prepaid = ceil(base/2)`, `cod = floor(base/2)`.
- Discounts order: coupon → influencer → (prepaid only) 5% discount, applied to the running total.

All reproduced in `create-order/route.ts:489-508`. No change needed.

## 9. Open items

- [ ] Provide Paytm production credentials (`PAYTM_MID`, `PAYTM_MERCHANT_KEY`, `PAYTM_ENV=production`, `PAYTM_WEBSITE_NAME`, and set `NEXT_PUBLIC_APP_URL` for the callback) and re-run the live flow.
- [ ] Decide whether to automate Paytm refunds (currently manual).
- [ ] Add rate limiting for the callback/webhook endpoints beyond `validateRequest` (webhooks are currently unauthenticated by design but should be limited by IP).
