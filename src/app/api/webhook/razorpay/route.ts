import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { hmacHex, timingSafeEqualHex } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { createInfluencerEarnings } from "@/lib/orders/influencer-earnings";
import { decrementStockForItems, incrementStockForItems } from "@/lib/stock";
import { info, warn, error as logError } from "@/lib/logger";

/**
 * Razorpay webhook handler.
 *
 * Receives payment.captured events from Razorpay and finalises the order
 * (idempotent — safe if browser verify-payment has already processed it).
 *
 * Webhook signature is verified using RAZORPAY_WEBHOOK_SECRET.
 * Configure this URL in the Razorpay Dashboard → Settings → Webhooks.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();

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
      .select("id, payment_status, order_items(variant_id, quantity)")
      .eq("razorpay_order_id", razorpayOrderId)
      .single();

    if (orderError || !order) {
      warn("No local order found for Razorpay order", { traceId, razorpayOrderId, error: orderError?.message });
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // 5. Idempotency — already paid
    if (order.payment_status === "paid") {
      return NextResponse.json({ status: "already_processed" });
    }

    // 6. Decrement stock atomically (parallelized)
    const orderItems = order.order_items as Array<{
      variant_id: string | null;
      quantity: number;
    }>;

    const stockItems = orderItems.filter((item): item is { variant_id: string; quantity: number } => Boolean(item.variant_id));

    const stockResults = await decrementStockForItems(supabase, stockItems);

    const failedStock = stockResults.filter((r) => !r.success);

    // 7. Roll back on failure
    if (failedStock.length > 0) {
      const succeeded = stockResults.filter((r) => r.success);
      await incrementStockForItems(
        supabase,
        succeeded.map((r) => ({ variantId: r.variantId, quantity: r.quantity }))
      );

      logError("Stock decrement failed for order", {
        traceId,
        orderId: order.id,
        errors: failedStock.map((f) => f.error),
      });

      return NextResponse.json(
        { error: Messages.genericError },
        { status: 409 }
      );
    }

    // 8. Mark order as paid
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        order_status: "confirmed",
        razorpay_payment_id: razorpayPaymentId,
      })
      .eq("id", order.id)
      .eq("payment_status", "pending");

    if (updateError) {
      logError("Failed to update order", { traceId, orderId: order.id, error: updateError.message });
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }

    await createInfluencerEarnings(order.id);

    info("Webhook processed successfully", { traceId, orderId: order.id, razorpayOrderId, razorpayPaymentId });
    return NextResponse.json({ status: "processed" });
  } catch (error) {
    logError("Unexpected webhook error", { traceId: request ? undefined : undefined, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: Messages.genericError },
      { status: 500 }
    );
  }
}
