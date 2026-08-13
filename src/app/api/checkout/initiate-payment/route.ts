import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { validateRequest } from "@/lib/api-utils";
import { createOrderStatusToken } from "@/lib/orders/public-status";
import { Messages } from "@/lib/messages";
import {
  getPaytmConfig,
  initiateTransaction,
  buildPaytmOrderId,
  getProcessTransactionUrl,
} from "@/lib/paytm";
import { rupeesToPaise } from "@/lib/utils";

const initiatePaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  statusToken: z.string().min(1, "Missing status token"),
});

/**
 * POST /api/checkout/initiate-payment
 *
 * Re-initiates payment for an existing pending order (retry after a failed or
 * abandoned attempt). Ownership is proven with the status token. Always
 * returns a fresh payment intent — Paytm order ids are single-use.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, initiatePaymentSchema);
  if (data instanceof NextResponse) return data;

  const supabase = await createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, payment_status, payment_method, total_amount, prepaid_amount, cod_amount, discount_amount, customer_name, customer_email, customer_phone, paytm_order_id, razorpay_order_id, payment_provider"
    )
    .eq("id", data.orderId)
    .single();

  if (!order) {
    return NextResponse.json({ success: false, error: Messages.orderNotFound }, { status: 404 });
  }

  const paymentReference = order.paytm_order_id ?? order.razorpay_order_id;
  if (!paymentReference) {
    return NextResponse.json({ success: false, error: Messages.orderNotFound }, { status: 400 });
  }

  const expectedToken = createOrderStatusToken(order.id, paymentReference);
  const provided = data.statusToken;
  if (
    !/^[a-f0-9]{64}$/i.test(provided) ||
    !crypto.timingSafeEqual(Buffer.from(expectedToken, "hex"), Buffer.from(provided, "hex"))
  ) {
    return NextResponse.json({ success: false, error: "Invalid status token" }, { status: 403 });
  }

  if (order.payment_status === "paid" || order.payment_status === "partially_paid") {
    return NextResponse.json({
      success: true,
      data: {
        alreadyPaid: true,
        statusToken: data.statusToken,
        paymentGateway: order.payment_provider ?? "razorpay",
      },
    });
  }
  if (order.payment_status !== "pending") {
    return NextResponse.json(
      { success: false, error: Messages.paymentError, code: "NOT_PENDING" },
      { status: 400 },
    );
  }

  const chargeablePaise = rupeesToPaise(
    order.payment_method === "cod" ? Number(order.prepaid_amount) : Number(order.total_amount)
  );

  // ── Paytm: fresh attempt with a new Paytm order id ──
  const paytmConfig = getPaytmConfig();
  if (paytmConfig) {
    const previous = order.paytm_order_id?.match(/-(\d+)$/);
    const attempt = previous ? Number(previous[1]) + 1 : 2;
    const paytmOrderId = buildPaytmOrderId(order.id, attempt);

    const initiated = await initiateTransaction(paytmConfig, {
      paytmOrderId,
      amountPaise: chargeablePaise,
      customerId: order.customer_email,
      mobileNumber: order.customer_phone,
      email: order.customer_email,
    });

    if (!initiated.success || !initiated.txnToken) {
      return NextResponse.json(
        { success: false, error: Messages.paymentNotConfigured, code: initiated.resultCode },
        { status: 502 },
      );
    }

    const { error } = await supabase
      .from("orders")
      .update({ paytm_order_id: paytmOrderId })
      .eq("id", order.id);
    if (error) {
      return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentGateway: "paytm",
        statusToken: createOrderStatusToken(order.id, paytmOrderId),
        paytm: {
          paytmOrderId,
          txnToken: initiated.txnToken,
          redirectUrl: getProcessTransactionUrl(paytmConfig, paytmOrderId, initiated.txnToken),
        },
      },
    });
  }

  // ── Razorpay fallback ──
  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!razorpayKeyId || !razorpayKeySecret) {
    return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 503 });
  }

  try {
    const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
    const razorpayOrder = await razorpay.orders.create({
      amount: chargeablePaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { customer_name: order.customer_name, customer_email: order.customer_email, payment_method: order.payment_method },
    });

    const { error } = await supabase
      .from("orders")
      .update({ razorpay_order_id: razorpayOrder.id })
      .eq("id", order.id);
    if (error) {
      return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentGateway: "razorpay",
        razorpayOrderId: razorpayOrder.id,
        amount: chargeablePaise,
        currency: "INR",
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        paymentMethod: order.payment_method,
        prepaidAmount: Number(order.prepaid_amount),
        codAmount: Number(order.cod_amount),
        discountAmount: Number(order.discount_amount),
        statusToken: createOrderStatusToken(order.id, razorpayOrder.id),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 502 });
  }
}
