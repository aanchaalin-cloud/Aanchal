import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { paymentVerificationSchema } from "@/lib/validations";
import { rupeesToPaise } from "@/lib/utils";
import { Messages } from "@/lib/messages";
import { validateRequest } from "@/lib/api-utils";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, paymentVerificationSchema);
  if (data instanceof NextResponse) return data;

  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!razorpaySecret) {
    return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 503 });
  }

  const expectedSignature = crypto.createHmac("sha256", razorpaySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
  if (expectedSignature !== razorpaySignature) {
    console.warn("[verify-payment] Signature mismatch:", orderId);
    return NextResponse.json({ success: false, error: Messages.paymentVerificationFailed }, { status: 400 });
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) {
    return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 503 });
  }

  let razorpayPayment: { status: string; amount: number; currency: string } | null = null;
  try {
    const auth = Buffer.from(`${keyId}:${razorpaySecret}`).toString("base64");
    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (rzpRes.ok) razorpayPayment = await rzpRes.json();
  } catch {
    // Best-effort — signature check is primary verification
  }

  if (razorpayPayment && razorpayPayment.status !== "captured") {
    console.warn("[verify-payment] Not captured:", razorpayPayment.status);
    return NextResponse.json({ success: false, error: Messages.paymentVerificationFailed }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data: order } = await supabase.from("orders").select("id, payment_status, razorpay_order_id, total_amount, order_items(variant_id, quantity)").eq("id", orderId).single();

  if (!order) {
    return NextResponse.json({ success: false, error: Messages.orderNotFound }, { status: 404 });
  }
  if (order.payment_status === "paid") {
    return NextResponse.json({ success: true, data: { message: "Payment already processed" } });
  }
  if (order.razorpay_order_id !== razorpayOrderId) {
    return NextResponse.json({ success: false, error: Messages.paymentVerificationFailed }, { status: 400 });
  }

  if (razorpayPayment) {
    const expectedPaise = rupeesToPaise(Number(order.total_amount));
    if (razorpayPayment.amount !== expectedPaise || razorpayPayment.currency !== "INR") {
      console.warn("[verify-payment] Amount/currency mismatch");
      return NextResponse.json({ success: false, error: Messages.paymentVerificationFailed }, { status: 400 });
    }
  }

  const orderItems = order.order_items as Array<{ variant_id: string | null; quantity: number }>;
  const decrementedVariants: string[] = [];
  let stockDecrementFailed = false;

  for (const item of orderItems) {
    if (!item.variant_id) continue;
    const { data: rpcResult } = await supabase.rpc("decrement_variant_stock", {
      p_variant_id: item.variant_id, p_quantity: item.quantity,
    });
    const result = Array.isArray(rpcResult) && rpcResult.length > 0
      ? (rpcResult[0] as { success: boolean; message: string })
      : null;
    if (!result?.success) {
      stockDecrementFailed = true;
      break;
    }
    decrementedVariants.push(item.variant_id);
  }

  if (stockDecrementFailed) {
    for (const vid of decrementedVariants) {
      const item = orderItems.find((i) => i.variant_id === vid);
      if (item) {
        await supabase.rpc("increment_variant_stock", { p_variant_id: vid, p_quantity: item.quantity });
      }
    }
    return NextResponse.json({ success: false, error: "Insufficient stock", code: "INSUFFICIENT_STOCK" }, { status: 409 });
  }

  const { error: updateError } = await supabase.from("orders").update({
    payment_status: "paid", order_status: "paid", razorpay_payment_id: razorpayPaymentId,
  }).eq("id", orderId).eq("payment_status", "pending");

  if (updateError) {
    console.error("[verify-payment] Update failed:", updateError.message);
    return NextResponse.json({ success: false, error: Messages.orderFinalizeError }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { message: "Payment verified" } });
}
