import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { hmacHex, timingSafeEqualHex } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { finalizePaidOrder } from "@/lib/orders/finalize-payment";
import { rupeesToPaise } from "@/lib/utils";
import { info, warn, error as logError } from "@/lib/logger";

/**
 * Razorpay webhook handler (fallback gateway).
 *
 * Receives payment.captured events from Razorpay and finalises the order
 * (idempotent — safe if browser verify-payment has already processed it).
 *
 * Finalisation runs through the shared finalizePaidOrder() so the payment
 * method model (full prepaid vs 50/50 COD) is honoured exactly like the
 * Paytm path: prepaid orders become "paid", COD orders become
 * "partially_paid" with the COD remainder recorded.
 *
 * Webhook signature is verified using RAZORPAY_WEBHOOK_SECRET.
 * Configure this URL in the Razorpay Dashboard → Settings → Webhooks.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logError("RAZORPAY_WEBHOOK_SECRET not configured", { traceId });
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 }
      );
    }

    // 1. Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      warn("Missing signature header", { traceId });
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // 2. Verify webhook signature
    const expectedSignature = hmacHex(webhookSecret, rawBody, "sha256");
    if (!timingSafeEqualHex(expectedSignature, signature)) {
      warn("Signature mismatch", { traceId });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // 3. Parse event payload
    const event = JSON.parse(rawBody);

    // Only process payment.captured events
    if (event.event !== "payment.captured") {
      return NextResponse.json({ status: "ignored" });
    }

    const payment = event.payload?.payment?.entity;
    if (!payment?.order_id || !payment?.id) {
      warn("Incomplete payment.captured payload", { traceId });
      return NextResponse.json(
        { error: "Incomplete payload" },
        { status: 400 }
      );
    }

    const razorpayOrderId: string = payment.order_id;
    const razorpayPaymentId: string = payment.id;

    // 4. Find the local order by Razorpay order ID
    const supabase = await createServiceClient();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, customer_name, customer_email, customer_phone, payment_method, payment_status, order_status, total_amount, prepaid_amount, order_items(variant_id, quantity)"
      )
      .eq("razorpay_order_id", razorpayOrderId)
      .single();

    if (orderError || !order) {
      warn("No local order found for Razorpay order", { traceId, razorpayOrderId, error: orderError?.message });
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // 5. Idempotency — already processed
    if (order.payment_status === "paid" || order.payment_status === "partially_paid") {
      return NextResponse.json({ status: "already_processed" });
    }

    // 6. Amount + currency verification (server-authoritative)
    const expectedPaise =
      order.payment_method === "cod"
        ? rupeesToPaise(Number(order.prepaid_amount))
        : rupeesToPaise(Number(order.total_amount));

    if (payment.amount != null) {
      if (Number(payment.amount) !== expectedPaise) {
        warn("Amount mismatch", { traceId, orderId: order.id, expectedPaise, paidPaise: Number(payment.amount) });
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }
      if (payment.currency && payment.currency !== "INR") {
        warn("Currency mismatch", { traceId, orderId: order.id, currency: payment.currency });
        return NextResponse.json({ error: "Currency mismatch" }, { status: 400 });
      }
    }

    // 7. Finalise via the shared idempotent path (stock, status, history,
    //    influencer earnings and the order_confirmed email).
    const result = await finalizePaidOrder(
      order.id,
      "razorpay",
      razorpayPaymentId,
      { ...order, order_status: order.order_status ?? undefined }
    );

    if (!result.success) {
      logError("Finalise failed for order", {
        traceId,
        orderId: order.id,
        error: result.error,
        code: result.code,
      });
      return NextResponse.json(
        { error: Messages.genericError },
        { status: result.code === "INSUFFICIENT_STOCK" ? 409 : 500 }
      );
    }

    info("Webhook processed successfully", { traceId, orderId: order.id, razorpayOrderId, razorpayPaymentId });
    return NextResponse.json({ status: "processed" });
  } catch (error) {
    logError("Unexpected webhook error", { traceId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: Messages.genericError },
      { status: 500 }
    );
  }
}
