# Email Audit Report — Resend transactional emails

**Audit date:** 2026-08-15 · **Scope:** send path, idempotency, failure handling, templates, event coverage, order-number usage.

Verdict labels: `PASS` / `FAIL` / `PARTIAL` / `NOT TESTED` / `BLOCKED`.

---

## 1. Transport

| Item | Verdict | Notes |
|---|---|---|
| Resend only | `PASS` | `src/lib/email/index.ts` posts to `https://api.resend.com/emails` via fetch (no SDK dependency). No other email provider in code. |
| Key server-side only | `PASS` | `RESEND_API_KEY` read in `src/lib/email/index.ts` (server-only file); never exposed to client. |
| Live send | `BLOCKED` | `RESEND_API_KEY` is present in `.env.local` but no live send has been executed from a running server in this audit. |

## 2. Idempotency & deduplication

| Item | Verdict | Notes |
|---|---|---|
| Unique partial index | `PASS` | `order_notifications_sent_unique` on `(order_id, type) WHERE status='sent'` (phase_6). |
| Pre-send check | `PASS` | `sendOrderEmail` checks `order_notifications` for an existing `sent` row before sending (`src/lib/email/index.ts:137`). |
| Failed sends retried | `PASS` | Only `status = 'sent'` rows suppress re-sends; `failed` rows allow retry. |
| Event-tracked | `PASS` | Every send writes `order_notifications` (`provider='email'`) with `sent_at` / `provider_message_id` or `failure_reason`. |
| Race window | `PARTIAL` | Two concurrent sends could both pass the pre-check before the unique index rejects the second insert; the duplicate email would already be in flight. Impact is negligible for sequential status changes. |

## 3. Failure handling — must never fail an order

| Item | Verdict | Notes |
|---|---|---|
| Email failure cannot fail the order | `PASS` | `sendOrderEmail` never throws: fetch/JSON errors are caught and logged (`index.ts:192`). Callers (`sendOrderEvent`, status route, finalize-payment) all `await` without propagating. |
| Finalize still completes on email error | `PASS` | `finalize-payment.ts` sends `order_confirmed` after stock/status changes; email failure is non-fatal. |

## 4. Templates & coverage

| Item | Verdict | Notes |
|---|---|---|
| Template set | `PASS` | `order_confirmed`, `order_shipped`, `tracking_info`, `delivery_day`, `order_delivered`, `order_cancelled`, `order_refunded`. |
| Customer-facing order number | `PASS` | Emails render `order_number` when available, falling back to a short order-id prefix (never a raw full UUID). |
| Branded HTML | `PASS` | Single `brandHtml` wrapper (AANCHAL header/footer). |
| No admin/reset emails | `PASS` | Per scope, admin/auth emails are out of scope and not present. |
| Injection risk | `PASS` | HTML is built with escaped/parameterised template values; no user-controlled HTML is interpolated raw. |

## 5. Wiring summary

| Trigger | Email type | Where |
|---|---|---|
| Payment confirmed | `order_confirmed` | `src/lib/orders/finalize-payment.ts` |
| Admin ships order | `order_shipped` | `src/app/api/admin/orders/update-status/route.ts` + `create-shipment` |
| Live tracking → shipped | `order_shipped` | `src/app/api/orders/status/route.ts` (system advance) |
| Live tracking → out for delivery | `delivery_day` | `src/app/api/orders/status/route.ts` |
| Live tracking → delivered | `order_delivered` | `src/app/api/orders/status/route.ts` |
| Order cancelled | `order_cancelled` | `src/app/api/admin/orders/update-status/route.ts` |
| Order refunded | `order_refunded` | `src/app/api/admin/orders/update-status/route.ts` |

## 6. Open items

- [ ] Execute one live send from the running server with a valid `RESEND_API_KEY` + verified `EMAIL_FROM` sender to confirm deliverability.
