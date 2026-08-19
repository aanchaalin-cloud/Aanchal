import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { paymentVerificationRequestSchema } from "@/lib/validations";
import { rupeesToPaise } from "@/lib/utils";
import { Messages } from "@/lib/messages";
import { validateRequest } from "@/lib/api-utils";
import { finalizePaidOrder } from "@/lib/orders/finalize-payment";
import { getProviderAdapter } from "@/lib/payments";
import { getOrderById } from "@/lib/orders/get-order";
import { info, warn } from "@/lib/logger";

/**
 * POST /api/checkout/verify-payment
 *
 * Re-confirms a payment server-side (never trust the browser).
 * - provider "paytm": calls the Paytm transactionStatus API and verifies the
 *   captured amount before finalising the order.
 * - provider "razorpay" (default): verifies the Razorpay signature + amount.
 *
 * Both paths converge on finalizePaidOrder(), which is idempotent.
 */
type PaymentOrder = {
  id: string;
  payment_status?: string;
  payment_method?: string;
  total_amount?: number | string | null;
  prepaid_amount?: number | string | null;
  paytm_order_id?: string | null;
  razorpay_order_id?: string | null;
  order_status?: string | null;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, paymentVerificationRequestSchema);
  if (data instanceof NextResponse) return data;

  const traceId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  if ("paytmOrderId" in data && data.provider === "paytm") {
    return handlePaytmVerification(data.orderId, data.paytmOrderId, traceId);
  }
  return handleRazorpayVerification(
    data.orderId,
    data.razorpayOrderId,
    data.razorpayPaymentId,
    data.razorpaySignature,
    traceId,
  );
}

async function handlePaytmVerification(
  orderId: string,
  paytmOrderId: string,
  traceId: string,
): Promise<NextResponse> {
  const adapter = await getProviderAdapter("paytm");
  if (!adapter) return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 503 });

  const verify = await adapter.verifyPayment({ orderId, providerOrderId: paytmOrderId });

  const supabase = await createServiceClient();
  const { data, error: orderError } = await getOrderById(orderId, supabase, "id, payment_status, payment_method, total_amount, prepaid_amount, paytm_order_id, order_status");
  const order = data as PaymentOrder | null;

  if (orderError || !order) {
    warn("Order not found during Paytm verify", { traceId, orderId, error: orderError?.message });
    return NextResponse.json({ success: false, error: Messages.orderNotFound }, { status: 404 });
  }
  if (order.payment_status === "paid" || order.payment_status === "partially_paid") {
    info("Payment already processed", { traceId, orderId });
    return NextResponse.json({ success: true, data: { message: "Payment already processed" } });
  }
  if (order.paytm_order_id !== paytmOrderId) {
    warn("Paytm order id mismatch", { traceId, orderId, expected: order.paytm_order_id, got: paytmOrderId });
    return NextResponse.json({ success: false, error: Messages.paymentVerificationFailed }, { status: 400 });
  }

  if (!verify.success) {
    if (verify.code === "PENDING" || verify.code === "STATUS") {
      return NextResponse.json({ success: false, error: Messages.paymentPending, code: "PENDING" }, { status: 202 });
    }
    if (verify.code === "FAILED") {
      await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", orderId)
        .eq("payment_status", "pending");
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        old_status: order.order_status,
        new_status: order.order_status,
        changed_by: "system",
        notes: `Payment failed or declined (${verify.message ?? verify.code})`,
      });
      return NextResponse.json(
        { success: false, error: Messages.paymentError, code: "PAYMENT_FAILED" },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: false, error: Messages.paymentVerificationFailed }, { status: 400 });
  }

  // Amount verification (server-authoritative)
  const expectedPaise =
    order.payment_method === "cod" ? rupeesToPaise(Number(order.prepaid_amount)) : rupeesToPaise(Number(order.total_amount));
  if (verify.amountPaise != null) {
    if (verify.amountPaise !== expectedPaise) {
      warn("[verify-payment] Paytm amount mismatch", { traceId, orderId, expectedPaise, paidPaise: verify.amountPaise });
      return NextResponse.json({ success: false, error: Messages.paymentVerificationFailed }, { status: 400 });
    }
  }

  const result = await finalizePaidOrder(orderId, "paytm", verify.providerPaymentId ?? null, { ...order, order_status: order.order_status ?? undefined });
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: result.code === "INSUFFICIENT_STOCK" ? 409 : 500 },
    );
  }

  return NextResponse.json({ success: true, data: { message: "Payment verified" } });
}

async function handleRazorpayVerification(
  orderId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  traceId: string,
): Promise<NextResponse> {
  const adapter = await getProviderAdapter("razorpay");
  if (!adapter) return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 503 });

  const verify = await adapter.verifyPayment({ orderId, providerOrderId: razorpayOrderId, providerPaymentId: razorpayPaymentId, signature: razorpaySignature });

  if (!verify.success) {
    if (verify.code === "SIG") {
      warn("Signature mismatch", { traceId, orderId });
      return NextResponse.json({ success: false, error: Messages.paymentVerificationFailed }, { status: 400 });
    }
    if (verify.code === "CONFIG") {
      return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 503 });
    }
    if (verify.code === "PENDING") {
      return NextResponse.json({ success: false, error: Messages.paymentPending, code: "PENDING" }, { status: 202 });
    }
    return NextResponse.json({ success: false, error: Messages.paymentVerificationFailed }, { status: 400 });
  }

  const supabase = await createServiceClient();
  const { data, error: orderError } = await getOrderById(orderId, supabase, "id, payment_status, razorpay_order_id, payment_method, total_amount, prepaid_amount");
  const order = data as PaymentOrder | null;

  if (orderError || !order) {
    warn("Order not found during Razorpay verify", { traceId, orderId, error: orderError?.message });
    return NextResponse.json({ success: false, error: Messages.orderNotFound }, { status: 404 });
  }
  if (order.payment_status === "paid" || order.payment_status === "partially_paid") {
    info("Payment already processed", { traceId, orderId });
    return NextResponse.json({ success: true, data: { message: "Payment already processed" } });
  }
  if (order.razorpay_order_id !== razorpayOrderId) {
    warn("Razorpay order id mismatch", { traceId, orderId, expected: order.razorpay_order_id, got: razorpayOrderId });
    return NextResponse.json({ success: false, error: Messages.paymentVerificationFailed }, { status: 400 });
  }

  if (verify.amountPaise != null) {
    const expectedPaise =
      order.payment_method === "cod" ? rupeesToPaise(Number(order.prepaid_amount)) : rupeesToPaise(Number(order.total_amount));
    if (verify.amountPaise !== expectedPaise || (verify.currency && verify.currency !== "INR")) {
      warn("Amount/currency mismatch", { traceId, orderId });
      return NextResponse.json({ success: false, error: Messages.paymentVerificationFailed }, { status: 400 });
    }
  }

  const result = await finalizePaidOrder(orderId, "razorpay", verify.providerPaymentId ?? razorpayPaymentId, { ...order, order_status: order.order_status ?? undefined });
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: result.code === "INSUFFICIENT_STOCK" ? 409 : 500 },
    );
  }

  return NextResponse.json({ success: true, data: { message: "Payment verified" } });
}
