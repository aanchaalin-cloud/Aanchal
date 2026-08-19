import "server-only";

/**
 * Shiprocket shipping provider (v1/external API).
 *
 * Config:
 * - SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD — API login credentials
 * - SHIPROCKET_BASE_URL — optional override (defaults to https://apiv2.shiprocket.in)
 *
 * All requests are server-side only; credentials never reach the browser.
 */

import {
  type ShippingProvider,
  type ShipmentCreateRequest,
  type ShipmentCreateResponse,
  type ShipmentTrackingInfo,
  type ShipmentTrackEvent,
  type ShipmentCancelResult,
} from "@/lib/shipping";

const DEFAULT_BASE_URL = "https://apiv2.shiprocket.in";

type CachedToken = { token: string; expiresAt: number };

let tokenCache: CachedToken | null = null;
// Tokens are valid for ~10 days (240 hours); cache for 9 days to avoid
// needless re-authentication while staying safely inside the window.
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

/**
 * Map a Shiprocket tracking status to the store's customer-facing order
 * lifecycle: PLACED → CONFIRMED → PROCESSING → SHIPPED → OUT FOR DELIVERY →
 * DELIVERED. Returns null when the status is unknown/not mappable so callers
 * can leave the order untouched.
 */
export function mapShiprocketStatus(status: string): string | null {
  const s = (status ?? "").toLowerCase();
  if (!s) return null;

  if (s.includes("delivered")) return "delivered";
  if (s.includes("out for delivery") || s.includes("out_for_delivery")) return "out_for_delivery";
  if (
    s.includes("in transit") ||
    s.includes("in_transit") ||
    s.includes("shipped") ||
    s.includes("dispatch")
  ) {
    return "shipped";
  }
  if (
    s.includes("pickup") ||
    s.includes("manifested") ||
    s.includes("processing") ||
    s.includes("created") ||
    s.includes("booked")
  ) {
    return "ready_to_ship";
  }
  if (s.includes("cancel")) return "cancelled";
  // RTO / undelivered / NDR — do not auto-transition to a paid state.
  return null;
}

function getConfig(): { baseUrl: string; email: string; password: string } | null {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) return null;
  return {
    baseUrl: (process.env.SHIPROCKET_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
    email,
    password,
  };
}

async function fetchJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
  authToken?: string
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data: body };
}

async function getToken(config: { baseUrl: string; email: string; password: string }): Promise<string | null> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;

  const { ok, status, data } = await fetchJson<{ token?: string; message?: string }>(
    config.baseUrl,
    "/v1/external/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email: config.email, password: config.password }),
    }
  );

  if (!ok || !data.token) {
    console.error("[shiprocket] auth failed:", status, data.message ?? "no token");
    return null;
  }

  tokenCache = { token: data.token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return data.token;
}

export class ShiprocketProvider implements ShippingProvider {
  readonly name = "shiprocket";

  async createShipment(request: ShipmentCreateRequest): Promise<ShipmentCreateResponse> {
    const config = getConfig();
    if (!config) {
      throw new Error("SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD are not configured");
    }

    const token = await getToken(config);
    if (!token) {
      throw new Error("Shiprocket authentication failed");
    }

    const paymentMethod = request.codAmount > 0 ? "COD" : "Prepaid";
    const weightKg = Math.max(0.5, Math.ceil(request.weightGrams) / 1000);

    const payload = {
      order_id: request.orderNumber,
      order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
      pickup_location: "Primary",
      billing_customer_name: request.recipientName,
      billing_address: request.addressLine1,
      billing_address_2: request.addressLine2 ?? "",
      billing_city: request.city,
      billing_pincode: request.pincode,
      billing_state: request.state,
      billing_country: "India",
      billing_email: "",
      billing_phone: request.recipientPhone.replace(/\D/g, "").slice(-10),
      shipping_is_billing: true,
      shipping_customer_name: request.recipientName,
      shipping_address: request.addressLine1,
      shipping_address_2: request.addressLine2 ?? "",
      shipping_city: request.city,
      shipping_pincode: request.pincode,
      shipping_state: request.state,
      shipping_country: "India",
      shipping_email: "",
      shipping_phone: Number(request.recipientPhone.replace(/\D/g, "").slice(-10)),
      order_items: request.items.map((item) => ({
        name: item.name.slice(0, 150),
        sku: item.sku ?? "",
        units: item.quantity,
        selling_price: "0",
        discount: "0",
      })),
      payment_method: paymentMethod,
      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total: 0,
      length: Math.max(10, request.lengthCm ?? 20),
      breadth: Math.max(10, request.widthCm ?? 20),
      height: Math.max(5, request.heightCm ?? 5),
      weight: weightKg,
      cod_amount: request.codAmount > 0 ? request.codAmount : 0,
    };

    const created = await fetchJson<{
      shipment_id?: string;
      order_id?: string;
      awb_code?: string;
      status?: string;
      message?: string;
    }>(config.baseUrl, "/v1/external/orders/create/adhoc", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token);

    if (!created.ok || !created.data.shipment_id) {
      console.error("[shiprocket] create failed:", created.status, created.data.message ?? created.data.status);
      throw new Error("Shiprocket could not create the shipment");
    }

    const shipmentId = String(created.data.shipment_id);

    // Best-effort: fetch the AWB code (some accounts auto-generate it on create).
    let awbCode = created.data.awb_code ?? null;
    if (!awbCode) {
      const awbRes = await fetchJson<{ awb_code?: string; status?: number; message?: string }>(
        config.baseUrl,
        `/v1/external/courier/generate/awb?shipment_id=${encodeURIComponent(shipmentId)}`,
        { method: "POST" },
        token
      );
      if (awbRes.ok && awbRes.data.awb_code) {
        awbCode = awbRes.data.awb_code;
      }
    }

    const trackingId = awbCode ?? shipmentId;
    return {
      trackingId,
      trackingUrl: awbCode ? `https://shiprocket.co/tracking/awb/${awbCode}` : undefined,
      provider: "shiprocket",
      awbNumber: awbCode ?? undefined,
      providerShipmentId: shipmentId,
      labelUrl: undefined,
    };
  }

  async trackShipment(awbCode: string): Promise<ShipmentTrackingInfo | null> {
    const config = getConfig();
    if (!config) throw new Error("Shiprocket is not configured");

    const token = await getToken(config);
    if (!token) throw new Error("Shiprocket authentication failed");

    const { ok, data } = await fetchJson<{
      tracking_data?: { tracking_status?: string; created_at?: string };
      shipment_track?: Array<{
        status?: string;
        current_status?: string;
        location?: string;
        datetime?: string;
      }>;
      etd?: string;
      awb_code?: string;
      shipment_id?: string;
      message?: string;
    }>(
      config.baseUrl,
      `/v1/external/courier/track/awb/${encodeURIComponent(awbCode)}`,
      { method: "GET" },
      token
    );

    if (!ok || !data.tracking_data) {
      console.error("[shiprocket] track failed:", data.message ?? "no tracking data");
      return null;
    }

    const events: ShipmentTrackEvent[] = (data.shipment_track ?? []).map((e) => ({
      status: e.status ?? "",
      currentStatus: e.current_status ?? "",
      location: e.location ?? null,
      datetime: e.datetime ?? null,
    }));

    return {
      awbCode: data.awb_code ?? awbCode,
      shipmentId: data.shipment_id ?? null,
      trackingStatus: data.tracking_data.tracking_status ?? null,
      etd: data.etd ?? null,
      events,
      mappedOrderStatus: mapShiprocketStatus(data.tracking_data.tracking_status ?? ""),
    };
  }

  async cancelShipment(shipmentId: string): Promise<ShipmentCancelResult> {
    const config = getConfig();
    if (!config) throw new Error("Shiprocket is not configured");

    const token = await getToken(config);
    if (!token) throw new Error("Shiprocket authentication failed");

    const { ok, status } = await fetchJson<{ message?: string }>(
      config.baseUrl,
      "/v1/external/orders/cancel",
      {
        method: "POST",
        body: JSON.stringify({ ids: [Number(shipmentId)] }),
      },
      token
    );

    // Cancel returns 204 No Content on success.
    if (ok) return { success: true };
    return { success: false, error: `Shiprocket cancel failed (${status})` };
  }

  async generateLabel(shipmentId: string): Promise<string | null> {
    const config = getConfig();
    if (!config) throw new Error("Shiprocket is not configured");

    const token = await getToken(config);
    if (!token) throw new Error("Shiprocket authentication failed");

    const { ok, data } = await fetchJson<{
      label_url?: string;
      message?: string;
    }>(
      config.baseUrl,
      "/v1/external/courier/generate/label",
      {
        method: "POST",
        body: JSON.stringify({ shipment_id: [shipmentId] }),
      },
      token
    );

    if (!ok || !data.label_url) {
      console.error("[shiprocket] label failed:", data.message ?? "no label_url");
      return null;
    }
    return data.label_url;
  }
}
