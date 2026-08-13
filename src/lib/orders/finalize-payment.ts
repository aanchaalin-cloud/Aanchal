import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { createInfluencerEarnings } from "@/lib/orders/influencer-earnings";
import { sendOrderEvent } from "@/lib/notifications/order-events";
import type { PaymentProvider } from "@/types";
import { decrementStockForItems, incrementStockForItems, StockItem } from "@/lib/stock";

type FinalizeResult =
  | { success: true }
  | { success: false; error: string; code?: string };

/**
 * Finalises a paid order: decrements stock atomically, flips payment/order
 * status, records history, credits influencer commission (prepaid only) and
 * fires the order_confirmed notification.
 *
 * Idempotent: safe to call from the browser verify step AND the webhook.
 * Amount verification must happen in the caller (provider-specific).
 */
export async function finalizePaidOrder(
  orderId: string,
  provider: PaymentProvider,
  providerPaymentId: string | null,
  orderData?: {
    id: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    payment_method?: string;
    payment_status?: string;
    order_status?: string;
    order_items?: Array<{ variant_id: string | null; quantity: number }>;
  }
): Promise<FinalizeResult> {
  const supabase = await createServiceClient();

  const order =
    orderData ??
    (
      (await supabase
        .from("orders")
        .select(
          "id, customer_name, customer_email, customer_phone, payment_method, payment_status, order_status, order_items(variant_id, quantity)"
        )
        .eq("id", orderId)
        .single())
      ).data;

  if (!order) return { success: false, error: "Order not found" };

  const targetStatus = order.payment_method === "cod" ? "partially_paid" : "paid";
  if (order.payment_status === targetStatus || order.payment_status === "paid") {
    return { success: true };
  }
  if (order.payment_status !== "pending") {
    return { success: false, error: "Order is not in a payable state" };
  }

  // ── Decrement stock atomically ──
  const orderItems = order.order_items as Array<{ variant_id: string | null; quantity: number }>;
  const stockItems = orderItems.filter((item) => item.variant_id) as StockItem[];

  const stockResults = await decrementStockForItems(supabase, stockItems);

  const failedStock = stockResults.filter((r) => !r.success);
  if (failedStock.length > 0) {
    const succeeded = stockResults.filter((r) => r.success);
    await incrementStockForItems(
      supabase,
      succeeded.map((r) => ({ variantId: r.variantId, quantity: r.quantity }))
    );
    return { success: false, error: "Insufficient stock", code: "INSUFFICIENT_STOCK" };
  }

  // ── Update order (guard on payment_status to keep idempotency) ──
  const updatePayload: Record<string, unknown> = {
    payment_status: targetStatus,
    order_status: "confirmed",
    payment_provider: provider,
  };
  if (providerPaymentId) {
    updatePayload[provider === "paytm" ? "paytm_txn_id" : "razorpay_payment_id"] =
      providerPaymentId;
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId)
    .eq("payment_status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[finalize-payment] Update failed:", updateError.message);
    return { success: false, error: "Order finalization failed" };
  }

  // 0 rows matched — a concurrent request already finalised this order.
  // Undo the extra stock decrement to stay consistent.
  if (!updated) {
    await incrementStockForItems(
      supabase,
      stockItems.map((item) => ({ variantId: item.variant_id!, quantity: item.quantity }))
    );
    return { success: true };
  }

  // ── Non-critical side effects ──
  await Promise.allSettled([
    supabase.from("order_status_history").insert({
      order_id: orderId,
      old_status: order.order_status,
      new_status: "confirmed",
      changed_by: "system",
      notes:
        targetStatus === "partially_paid"
          ? "50% prepaid received — order confirmed"
          : "Payment confirmed",
    }),
  ]);

  if (targetStatus === "paid") {
    await createInfluencerEarnings(orderId);
  }

  await sendOrderEvent({
    type: "order_confirmed",
    orderId,
    customerEmail: order.customer_email,
    customerName: order.customer_name,
  });

  return { success: true };
}
