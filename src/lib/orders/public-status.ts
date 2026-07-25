import "server-only";

import crypto from "node:crypto";
import { unstable_noStore as noStore } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import type { PublicOrderStatus } from "@/types";

function getStatusSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Service configuration is unavailable");
  }
  return secret;
}

export function createOrderStatusToken(
  orderId: string,
  razorpayOrderId: string
): string {
  return crypto
    .createHmac("sha256", getStatusSecret())
    .update(`${orderId}|${razorpayOrderId}`)
    .digest("hex");
}

function tokenMatches(expected: string, received: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(received, "hex")
  );
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
      "id, payment_status, order_status, total_amount, created_at, razorpay_order_id"
    )
    .eq("id", orderId)
    .single();

  if (error || !data?.razorpay_order_id) return null;

  const expectedToken = createOrderStatusToken(data.id, data.razorpay_order_id);
  if (!tokenMatches(expectedToken, statusToken)) return null;

  return {
    id: data.id,
    payment_status: data.payment_status,
    order_status: data.order_status,
    total_amount: Number(data.total_amount),
    created_at: data.created_at,
  } as PublicOrderStatus;
}
