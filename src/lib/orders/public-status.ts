import "server-only";

import { hmacHex, timingSafeEqualHex } from "@/lib/crypto";
import { getRequiredServerEnv } from "@/lib/env";
import { unstable_noStore as noStore } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { PublicOrderStatus } from "@/types";

function getStatusSecret(): string {
  // ORDER_STATUS_TOKEN_SECRET must be set explicitly. We intentionally avoid
  // a fallback to SUPABASE_SERVICE_ROLE_KEY because that is a database secret and
  // not appropriate for public token signing.
  return getRequiredServerEnv("ORDER_STATUS_TOKEN_SECRET");
}

export function createOrderStatusToken(
  orderId: string,
  paymentReference: string
): string {
  return hmacHex(getStatusSecret(), `${orderId}|${paymentReference}`, "sha256");
}

export function tokenMatches(expected: string, received: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  return timingSafeEqualHex(expected, received);
}

export async function getPublicOrderStatus(
  orderId: string,
  statusToken: string
): Promise<PublicOrderStatus | null> {
  noStore();

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, payment_status, order_status, total_amount, created_at,
       razorpay_order_id, paytm_order_id, payment_provider, confirmation_method,
       subtotal, shipping_fee, discount_amount, payment_method,
       customer_name, customer_email, customer_phone,
       address_line1, address_line2, city, state, pincode, notes,
       reward_voucher_code, influencer_code,
       order_items ( product_name, size, color, quantity, unit_price, line_total ),
       order_measurements ( chest, waist, full_height, shoulder, unit, personalisation_request )`
    )
    .eq("id", orderId)
    .single();

  if (error || !data) return null;

  // Status tokens are bound to a payment reference (Razorpay or Paytm order id).
  // Phase 1 WhatsApp orders have no payment reference, so their token is bound
  // to an empty reference instead. Either way the token is an HMAC of the order
  // id + reference signed with the secret, so it still proves link ownership.
  const isWhatsApp = data.confirmation_method === "whatsapp";
  const paymentReference = data.paytm_order_id ?? data.razorpay_order_id;
  if (!isWhatsApp && !paymentReference) return null;

  const expectedToken = createOrderStatusToken(data.id, isWhatsApp ? "" : paymentReference);
  if (!tokenMatches(expectedToken, statusToken)) return null;

  // order_measurements has a unique FK on order_id; the API may return it as an
  // object (to-one) or a single-element array, so normalise like getOrderByIdAdmin.
  const rawMeasurements = data.order_measurements;
  const orderMeasurements = Array.isArray(rawMeasurements)
    ? (rawMeasurements[0] ?? null)
    : rawMeasurements;

  return {
    id: data.id,
    order_number: data.order_number,
    payment_status: data.payment_status,
    order_status: data.order_status,
    total_amount: Number(data.total_amount),
    created_at: data.created_at,
    payment_provider: data.payment_provider,
    paytm_order_id: data.paytm_order_id,
    confirmation_method: data.confirmation_method,
    subtotal: data.subtotal != null ? Number(data.subtotal) : undefined,
    shipping_fee: data.shipping_fee != null ? Number(data.shipping_fee) : undefined,
    discount_amount: data.discount_amount != null ? Number(data.discount_amount) : undefined,
    payment_method: data.payment_method,
    customer_name: data.customer_name,
    customer_email: data.customer_email,
    customer_phone: data.customer_phone,
    address_line1: data.address_line1,
    address_line2: data.address_line2,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    notes: data.notes,
    reward_voucher_code: data.reward_voucher_code,
    influencer_code: data.influencer_code,
    order_items: data.order_items,
    order_measurements: orderMeasurements,
  } as PublicOrderStatus;
}
