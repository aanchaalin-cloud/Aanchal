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
      "id, order_number, payment_status, order_status, total_amount, created_at, razorpay_order_id, paytm_order_id, payment_provider"
    )
    .eq("id", orderId)
    .single();

  if (error || !data) return null;

  // Status tokens are bound to a payment reference (Razorpay or Paytm order id).
  const paymentReference = data.paytm_order_id ?? data.razorpay_order_id;
  if (!paymentReference) return null;

  const expectedToken = createOrderStatusToken(data.id, paymentReference);
  if (!tokenMatches(expectedToken, statusToken)) return null;

  return {
    id: data.id,
    order_number: data.order_number,
    payment_status: data.payment_status,
    order_status: data.order_status,
    total_amount: Number(data.total_amount),
    created_at: data.created_at,
    payment_provider: data.payment_provider,
    paytm_order_id: data.paytm_order_id,
  } as PublicOrderStatus;
}
