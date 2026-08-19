# Shiprocket Audit Report

**Audit date:** 2026-08-15 · **Scope:** shipment creation, tracking, cancellation, labels, status mapping, admin UI wiring.

Verdict labels: `PASS` / `FAIL` / `PARTIAL` / `NOT TESTED` / `BLOCKED`.

---

## 1. Provider integration

| Item | Verdict | Notes |
|---|---|---|
| Single provider abstraction | `PASS` | `src/lib/shipping/index.ts` defines `ShippingProvider`; `getShippingProvider()` returns null when `SHIPPING_PROVIDER` unset. Only `shiprocket` implemented. |
| Shiprocket SDK-free REST client | `PASS` | `src/lib/shipping/shiprocket.ts` calls the Shiprocket v1/external endpoints directly (no SDK dependency). |
| Endpoints used (current docs) | `PASS` | `POST /v1/external/orders` (create), `GET /v1/external/courier/track/awb/{awb}`, `POST /v1/external/orders/cancel` `{ids:[…]}` (204 on success), `POST /v1/external/courier/generate/label` `{shipment_id:[…]}` → `label_url`. Reviewed against Shiprocket API docs. |
| Numeric shipment id kept | `PASS` | `createShipment` returns `providerShipmentId` (numeric Shiprocket shipment ID); the admin create-shipment route stores it in `shiprocket_shipment_id`. The AWB lives in `orders.tracking_id`. Cancel/label use the numeric ID, which the API requires. |
| Token cache | `PASS` | Shiprocket auth token cached with a 9-day TTL (docs show ~10-day validity), refreshed on 401. |
| Live credentials | `BLOCKED` | `.env.local` lacks `SHIPPING_PROVIDER` (and login values are not the live pair). Live create/track/cancel/label cannot be verified. |

## 2. Shipment creation

| Item | Verdict | Notes |
|---|---|---|
| Admin-only creation | `PASS` | `src/app/api/admin/orders/create-shipment/route.ts` requires `requireAdmin` + `validateRequest`. |
| Address/items sourced server-side | `PASS` | Route reads the order + order_items from the DB, not from the request body. |
| COD amount passed | `PASS` | `cod_amount` forwarded for COD orders; 0 for prepaid. |
| AWB + tracking URL persisted | `PASS` | `tracking_id` + `tracking_url` written back to the order; `shiprocket_shipment_id` stores the numeric shipment ID. |
| Shipment idempotency | `PARTIAL` | No guard against creating a second shipment for an order that already has one; `orders_shiprocket_shipment_idx` is non-unique. Recommend the admin UI disable the button after creation (UI hides it when `shiprocket_shipment_id` exists). |

## 3. Tracking

| Item | Verdict | Notes |
|---|---|---|
| Live tracking endpoint | `PASS` | `GET /v1/external/courier/track/awb/{awb}` parsed into typed events (`ShipmentTrackEvent`). |
| Customer status endpoint | `PASS` | `src/app/api/orders/status/route.ts` fetches live tracking for shiprocket AWB orders, maps courier status → order status, advances forward-only. |
| Forward-only, idempotent sync | `PASS` | Uses `ORDER_STATUS_RANK`; only advances when mapped rank > current rank, with an optimistic `.eq("order_status", current)` update + history row (`changed_by: "system"`). Never auto-reverts. |
| Provider failures swallowed | `PASS` | Whole tracking block wrapped in try/catch; order lookup never breaks. |
| Track UI timeline | `PASS` | `src/app/(storefront)/track-order/page.tsx` renders live courier events when present. |
| Status mapping | `PASS` | `mapShiprocketStatus`: delivered → `delivered`, out-for-delivery → `out_for_delivery`, in-transit/dispatch → `shipped`, pickup/manifested/created → `ready_to_ship`, cancel → `cancelled`. |

## 4. Cancellation

| Item | Verdict | Notes |
|---|---|---|
| Cancel endpoint | `PASS` | `POST /v1/external/orders/cancel` with `{ids:[numericShipmentId]}`; 204 treated as success. |
| Admin order cancel triggers provider cancel | `PASS` | `src/app/api/admin/orders/update-status/route.ts` best-effort, non-blocking cancel when status → `cancelled`. Provider failure is logged, not fatal. |
| Cancel before dispatch only | `PASS` | Shiprocket rejects cancellation after dispatch; the 204 check surfaces the failure to the admin log. |
| Live verification | `BLOCKED` | Requires configured provider + live shipment. |

## 5. Labels

| Item | Verdict | Notes |
|---|---|---|
| Label endpoint | `PASS` | `POST /v1/external/courier/generate/label` with `{shipment_id:[…]}` → `label_url`. |
| Admin UI | `PASS` | `src/components/admin/GenerateLabelButton.tsx` shown when `shiprocket_shipment_id` exists; calls `src/app/api/admin/orders/generate-label/route.ts` (admin-only). |
| Label URL security | `PASS` | The label URL is returned to the admin client only; never embedded in customer emails. |
| Live verification | `BLOCKED` | Requires configured provider + live shipment. |

## 6. Secrets

| Item | Verdict | Notes |
|---|---|---|
| Credentials server-side only | `PASS` | `SHIPROCKET_EMAIL`/`SHIPROCKET_PASSWORD`/`SHIPROCKET_BASE_URL` are never exposed to the client. |
| No credentials committed | `PASS` | `.env.example` holds placeholders. |

## 7. Open items

- [ ] Provide `SHIPPING_PROVIDER=shiprocket` + live `SHIPROCKET_EMAIL`/`SHIPROCKET_PASSWORD` and run a real end-to-end shipment (create → track → label → cancel).
- [ ] Decide if create-shipment should be blocked when the order already has a shipment (non-unique index kept for now).
