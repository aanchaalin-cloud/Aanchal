import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";
import { cancelInfluencerEarnings } from "@/lib/orders/influencer-earnings";
import { sendOrderEvent } from "@/lib/notifications/order-events";
import { createOrderStatusToken, tokenMatches } from "@/lib/orders/public-status";

const cancelSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  // Email is required for the session-based flow; the token-based flow
  // (order-success link) proves ownership instead.
  email: z.string().email("Invalid email address").max(200).optional(),
  statusToken: z.string().max(128).optional(),
});

const DISPATCHED_BUT_CANCELLABLE = ["shipped", "out_for_delivery"];
const NON_CANCELLABLE = ["delivered", "cancelled", "return_requested", "returned", "refunded"];

const ORDER_COLUMNS =
  "id, customer_email, customer_name, customer_phone, order_status, payment_status, total_amount, prepaid_amount, influencer_code, paytm_order_id, razorpay_order_id";

type OrderRow = {
  id: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  order_status: string;
  payment_status: string;
  total_amount: number;
  prepaid_amount: number;
  influencer_code: string | null;
  paytm_order_id: string | null;
  razorpay_order_id: string | null;
};

/**
 * Cancelling an order is destructive, so ownership must be proven by either:
 * 1. A valid checkout status token (the order-success link), OR
 * 2. An authenticated session whose email matches the order.
 * Email + order ID alone is never sufficient.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, cancelSchema);
  if (data instanceof NextResponse) return data;

  const supabase = await createServiceClient();

  // ── Load the order ──
  const orderQuery = supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", data.orderId);

  let order: OrderRow | null = null;

  if (data.statusToken) {
    const { data: found } = await orderQuery.maybeSingle();
    order = (found as OrderRow | null) ?? null;
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }
    const paymentReference = order.paytm_order_id ?? order.razorpay_order_id;
    if (
      !paymentReference ||
      !tokenMatches(createOrderStatusToken(order.id, paymentReference), data.statusToken)
    ) {
      return NextResponse.json(
        { success: false, error: "You are not authorized to cancel this order." },
        { status: 403 }
      );
    }
  } else {
    if (!data.email) {
      return NextResponse.json(
        { success: false, error: "Email is required to cancel this order." },
        { status: 400 }
      );
    }
    const { data: found } = await orderQuery
      .eq("customer_email", data.email.toLowerCase())
      .maybeSingle();
    order = (found as OrderRow | null) ?? null;
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found. Please check the order ID and email." },
        { status: 404 }
      );
    }
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (user?.email?.toLowerCase() !== order.customer_email) {
      return NextResponse.json(
        {
          success: false,
          error: "Sign in with the email used at checkout, or use your order confirmation link to cancel.",
          code: "AUTH_REQUIRED",
        },
        { status: 403 }
      );
    }
  }

  if (NON_CANCELLABLE.includes(order.order_status)) {
    return NextResponse.json(
      { success: false, error: `This order cannot be cancelled (status: ${order.order_status}).` },
      { status: 400 }
    );
  }

  const oldStatus = order.order_status;
  const dispatched = DISPATCHED_BUT_CANCELLABLE.includes(oldStatus);
  const deductionRate = dispatched ? 0.15 : 0;

  // ── Update order ──
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      order_status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_note: dispatched
        ? "Cancelled after dispatch — 15% deduction applied."
        : "Cancelled before dispatch — no charge.",
    })
    .eq("id", order.id);

  if (updateError) {
    console.error("[cancel-order] Update failed:", updateError.message);
    return NextResponse.json(
      { success: false, error: "Unable to cancel the order. Please contact hello@aanchal.in." },
      { status: 500 }
    );
  }

  // ── Status history ──
  await supabase.from("order_status_history").insert({
    order_id: order.id,
    old_status: oldStatus,
    new_status: "cancelled",
    changed_by: "customer",
    notes: dispatched ? "Cancelled by customer (after dispatch, 15% deduction)" : "Cancelled by customer",
  });

  // ── Void influencer commission ──
  await cancelInfluencerEarnings(order.id);

  // ── Restore stock only if it was decremented at finalisation ──
  if (order.payment_status === "paid" || order.payment_status === "partially_paid") {
    const { error: stockError } = await supabase.rpc("cancel_order_stock_restore", {
      p_order_id: order.id,
    });
    if (stockError) {
      console.error("[cancel-order] Stock restore failed:", stockError.message);
    }
  }

  // ── Notify the customer ──
  await sendOrderEvent({
    type: "order_cancelled",
    orderId: order.id,
    customerEmail: order.customer_email,
    customerName: order.customer_name,
  });

  // ── Refund estimate ──
  let refundAmount: number | null = null;
  if (order.payment_status === "paid") {
    const deduction = Math.round(order.total_amount * deductionRate);
    refundAmount = Math.max(0, order.prepaid_amount - deduction);
  }

  return NextResponse.json({
    success: true,
    data: {
      message: dispatched
        ? "Your order has been cancelled. A 15% deduction applies since the order was already dispatched."
        : "Your order has been cancelled — no charges apply.",
      refundAmount,
      refundNote:
        refundAmount != null
          ? `Refund of ₹${refundAmount.toLocaleString("en-IN")} will be processed within 5-7 business days.`
          : "No refund applicable for this order.",
    },
  });
}
