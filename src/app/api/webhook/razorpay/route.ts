import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";

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
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[webhook] RAZORPAY_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 }
      );
    }

    // 1. Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      console.warn("[webhook] Missing signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // 2. Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "hex");
    const providedBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      console.warn("[webhook] Signature mismatch");
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
      console.warn("[webhook] Incomplete payment.captured payload");
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
      console.warn(
        "[webhook] No local order found for Razorpay order: %s",
        razorpayOrderId
      );
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // 5. Idempotency — already paid
    if (order.payment_status === "paid") {
      return NextResponse.json({ status: "already_processed" });
    }

    // 6. Decrement stock atomically
    const orderItems = order.order_items as Array<{
      variant_id: string | null;
      quantity: number;
    }>;

    const decrementedVariants: string[] = [];
    let stockFailed = false;
    let stockErrorMsg = "";

    for (const item of orderItems) {
      if (!item.variant_id) continue;

      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "decrement_variant_stock",
        {
          p_variant_id: item.variant_id,
          p_quantity: item.quantity,
        }
      );

      const result = Array.isArray(rpcResult) && rpcResult.length > 0
        ? (rpcResult[0] as { success: boolean; message: string })
        : null;

      if (rpcError || !result?.success) {
        stockFailed = true;
        stockErrorMsg = result?.message ?? rpcError?.message ?? "Stock update failed";
        break;
      }

      decrementedVariants.push(item.variant_id);
    }

    // 7. Roll back on failure
    if (stockFailed) {
      for (const vid of decrementedVariants) {
        const item = orderItems.find((i) => i.variant_id === vid);
        if (item) {
          await supabase.rpc("increment_variant_stock", {
            p_variant_id: vid,
            p_quantity: item.quantity,
          });
        }
      }

      console.error(
        "[webhook] Stock decrement failed for order %s: %s",
        order.id,
        stockErrorMsg
      );

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
        order_status: "paid",
        razorpay_payment_id: razorpayPaymentId,
      })
      .eq("id", order.id)
      .eq("payment_status", "pending");

    if (updateError) {
      console.error(
        "[webhook] Failed to update order %s: %s",
        order.id,
        updateError.message
      );
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "processed" });
  } catch (error) {
    console.error("[webhook] Unexpected error:", error);
    return NextResponse.json(
      { error: Messages.genericError },
      { status: 500 }
    );
  }
}
