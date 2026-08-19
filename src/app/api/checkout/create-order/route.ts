import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { createServiceClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validations";
import { rupeesToPaise } from "@/lib/utils";
import { createOrderStatusToken } from "@/lib/orders/public-status";
import { Messages } from "@/lib/messages";
import { validateRequest } from "@/lib/api-utils";
import { getCheckoutMode } from "@/lib/env";
import {
  getPaytmConfig,
  initiateTransaction,
  buildPaytmOrderId,
  getProcessTransactionUrl,
  type PaytmConfig,
} from "@/lib/paytm";
import { getProviderAdapter } from "@/lib/payments";
import { INFLUENCER_COMMISSION_RATE } from "@/lib/orders/influencer-earnings";
import { getPrimaryStorefrontImage } from "@/lib/product-images";
import { buildWhatsAppConfirmationForOrder } from "@/lib/orders/whatsapp-confirmation";

const SHIPPING_FEE = 0;
const PREPAID_DISCOUNT_RATE = 0.05;
const INFLUENCER_DISCOUNT_CAP = 500;

// Idempotency keys arrive as a raw composite string from the checkout page.
// Normalize to a fixed-length hash so the stored value is uniform, bounded and
// safe to match exactly on resume. Re-submitting identical inputs recomputes
// the same hash, so deduplication still works.
function normalizeIdempotencyKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return crypto.createHash("sha256").update(`co:${raw}`).digest("hex");
}

type OrderRow = {
  id: string;
  order_number?: string | null;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  prepaid_amount: number;
  cod_amount: number;
  discount_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  paytm_order_id: string | null;
  razorpay_order_id: string | null;
  confirmation_method?: string | null;
};

function checkoutResponseData(
  order: OrderRow,
  gateway: "paytm" | "razorpay",
  amountPaise: number,
  extra: {
    razorpayOrderId?: string;
    paytm?: { paytmOrderId: string; txnToken: string; redirectUrl: string };
    alreadyPaid?: boolean;
  }
) {
  return {
    orderId: order.id,
    paymentGateway: gateway,
    razorpayOrderId: extra.razorpayOrderId,
    amount: amountPaise,
    currency: "INR",
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    statusToken: createOrderStatusToken(
      order.id,
      order.paytm_order_id ?? order.razorpay_order_id ?? ""
    ),
    paymentMethod: order.payment_method,
    prepaidAmount: Number(order.prepaid_amount),
    codAmount: Number(order.cod_amount),
    discountAmount: Number(order.discount_amount),
    paytm: extra.paytm,
    alreadyPaid: extra.alreadyPaid,
  };
}

/** Amount (in paise) the customer must pay online now. */
function chargeablePaise(order: {
  payment_method: string;
  total_amount: number;
  prepaid_amount: number;
}): number {
  return rupeesToPaise(
    order.payment_method === "cod" ? Number(order.prepaid_amount) : Number(order.total_amount)
  );
}

/**
 * Response for a Phase 1 WhatsApp order. Returns the order id + the prepared
 * WhatsApp link so the client can redirect the customer straight to WhatsApp
 * with the full message pre-filled. The message is always built from the saved
 * order row (single source of truth is the DB, not the browser).
 *
 * Wrapped in try-catch: if the confirmation message building or token signing
 * fails for any reason, the order is still saved — we return the order with a
 * null URL so the client can fall back to the order-success status page.
 */
async function whatsappResponseData(order: { id: string; order_number?: string | null }) {
  try {
    const [confirmation, token] = await Promise.all([
      buildWhatsAppConfirmationForOrder(order.id).catch((err) => {
        console.error("[create-order] WhatsApp confirmation build failed:", err);
        return null;
      }),
      createOrderStatusToken(order.id, ""),
    ]);
    return {
      orderId: order.id,
      orderNumber: order.order_number,
      confirmationMethod: "whatsapp" as const,
      statusToken: token,
      whatsappUrl: confirmation?.whatsappUrl ?? null,
      whatsappMessage: confirmation?.message ?? null,
    };
  } catch (err) {
    console.error("[create-order] whatsappResponseData fatal:", err);
    return {
      orderId: order.id,
      orderNumber: order.order_number,
      confirmationMethod: "whatsapp" as const,
      statusToken: createOrderStatusToken(order.id, ""),
      whatsappUrl: null,
      whatsappMessage: null,
    };
  }
}

/**
 * Re-initiates payment for an existing pending order (idempotency resume /
 * retry). Returns a NextResponse JSON.
 */
async function resumeCheckout(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  order: OrderRow,
  paytmConfig: PaytmConfig | null
): Promise<NextResponse> {
  if (order.payment_status === "paid" || order.payment_status === "partially_paid") {
    return NextResponse.json({
      success: true,
      data: checkoutResponseData(order, (paytmConfig ? "paytm" : "razorpay"), chargeablePaise(order), {
        alreadyPaid: true,
      }),
    });
  }

  // Razorpay fallback — create a fresh Razorpay order for the same charge.
  if (!paytmConfig) {
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 503 });
    }
    const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
    try {
      const razorpayOrder = await razorpay.orders.create({
        amount: chargeablePaise(order),
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
        data: checkoutResponseData({ ...order, razorpay_order_id: razorpayOrder.id }, "razorpay", chargeablePaise(order), {
          razorpayOrderId: razorpayOrder.id,
        }),
      });
    } catch {
      return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 502 });
    }
  }

  // Paytm — a new attempt uses a fresh Paytm order id (single-use per attempt).
  const previous = order.paytm_order_id?.match(/-(\d+)$/);
  const attempt = previous ? Number(previous[1]) + 1 : 2;
  const paytmOrderId = buildPaytmOrderId(order.id, attempt);

  const initiated = await initiateTransaction(paytmConfig, {
    paytmOrderId,
    amountPaise: chargeablePaise(order),
    customerId: order.customer_email,
    mobileNumber: order.customer_phone,
    email: order.customer_email,
  });

  if (!initiated.success || !initiated.txnToken) {
    return NextResponse.json(
      { success: false, error: Messages.paymentNotConfigured, code: initiated.resultCode },
      { status: 502 }
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
    data: checkoutResponseData({ ...order, paytm_order_id: paytmOrderId }, "paytm", chargeablePaise(order), {
      paytm: {
        paytmOrderId,
        txnToken: initiated.txnToken,
        redirectUrl: getProcessTransactionUrl(paytmConfig, paytmOrderId, initiated.txnToken),
      },
    }),
  });
}

/**
 * Atomically claim a reward voucher (AANCHAL-*). Returns null if unusable.
 *
 * NOTE: used_by_order_id is intentionally NOT written here — it references
 * public.orders(id) (phase_20), and the order row does not exist yet at claim
 * time. Setting it here would fail the FK and break every redemption. The
 * caller stamps it on the voucher after the order row is created.
 */
async function claimRewardVoucher(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  code: string
): Promise<{ ok: true; value: number } | { ok: false; error: string }> {
  const { data: claimed } = await supabase
    .from("reward_vouchers")
    .update({ is_used: true })
    .eq("code", code)
    .eq("is_used", false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .select("value")
    .maybeSingle();

  if (!claimed) {
    return { ok: false, error: "This voucher has already been used or has expired." };
  }
  return { ok: true, value: Number(claimed.value) };
}

/**
 * Release a voucher claim when order creation fails (order deleted).
 */
async function releaseRewardVoucher(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  code: string | null
): Promise<void> {
  if (!code) return;
  await supabase
    .from("reward_vouchers")
    .update({ is_used: false, used_by_order_id: null })
    .eq("code", code)
    .eq("is_used", true);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    return await handleCheckout(request);
  } catch (err) {
    console.error("[create-order] Unhandled error:", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

async function handleCheckout(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, checkoutSchema);
  if (data instanceof NextResponse) return data;

  const {
    customer_name,
    customer_email: rawCustomerEmail,
    customer_phone,
    address_line1,
    address_line2,
    city,
    state,
    pincode,
    notes,
    measurements,
    payment_method,
    coupon_code,
    referral_code,
    cartItems: submittedCartItems,
    idempotency_key,
  } = data;

  // Normalise to lowercase — every other email-based flow (track-order, cancel,
  // rewards, coupon per-customer limits) compares lowercase, so storing the
  // customer's raw casing would make orders unfindable.
  const customer_email = rawCustomerEmail.trim().toLowerCase();

  const cartItems = Array.from(
    submittedCartItems
      .reduce((itemsByVariant, item) => {
        const existing = itemsByVariant.get(item.variantId);
        itemsByVariant.set(item.variantId, {
          ...item,
          quantity: (existing?.quantity ?? 0) + item.quantity,
        });
        return itemsByVariant;
      }, new Map<string, (typeof submittedCartItems)[number]>())
      .values(),
  );

  if (cartItems.some((item) => item.quantity > 10)) {
    return NextResponse.json(
      { success: false, error: "Maximum 10 items per variant" },
      { status: 400 },
    );
  }

  const paytmConfig = getPaytmConfig();
  const paymentGateway: "paytm" | "razorpay" = paytmConfig ? "paytm" : "razorpay";

  // Phase 1 launch flag: WhatsApp/manual confirmation instead of online payment.
  // The server decides — the browser cannot opt out of the manual flow.
  const whatsappMode = getCheckoutMode() === "whatsapp";
  const paymentMethod = payment_method ?? "prepaid";

  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!whatsappMode && paymentGateway === "razorpay" && (!razorpayKeyId || !razorpayKeySecret)) {
    console.error("[create-order] Payment credentials missing");
    return NextResponse.json(
      { success: false, error: Messages.paymentNotConfigured },
      { status: 503 },
    );
  }

  const supabase = await createServiceClient();

  // Normalize the raw composite idempotency key once, then use the same value
  // for both the resume lookup and the stored row.
  const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotency_key);

  // ── Idempotency — resume an existing pending order for this key ──
  if (normalizedIdempotencyKey) {
    const { data: existing } = await supabase
      .from("orders")
      .select(
        "id, order_number, payment_status, payment_method, total_amount, prepaid_amount, cod_amount, discount_amount, customer_name, customer_email, customer_phone, paytm_order_id, razorpay_order_id, confirmation_method"
      )
      .eq("idempotency_key", normalizedIdempotencyKey)
      .maybeSingle();

    if (existing) {
      // Bind the resume to the email that created the order: the idempotency
      // key is derived from the customer's own inputs, so a leaked/guessed key
      // must not let someone read another customer's order details.
      if (existing.customer_email?.toLowerCase() !== customer_email) {
        return NextResponse.json(
          { success: false, error: "This checkout session belongs to another customer." },
          { status: 403 },
        );
      }
      // Phase 1 WhatsApp orders never enter a payment gateway — resuming simply
      // returns the same redirect to the order-success page.
      if (existing.confirmation_method === "whatsapp") {
        return NextResponse.json({
          success: true,
          data: await whatsappResponseData(existing as OrderRow),
        });
      }
      return resumeCheckout(supabase, existing as OrderRow, paytmConfig);
    }
  }

  const razorpay = !whatsappMode && paymentGateway === "razorpay"
    ? new Razorpay({ key_id: razorpayKeyId!, key_secret: razorpayKeySecret! })
    : null;

  // ── Fetch products & build order items with server-side prices ──
  const productIds = [...new Set(cartItems.map((i) => i.productId))];
  const { data: products } = await supabase
    .from("products")
    .select(
      `
      id, name, slug, price, discount_price, is_active,
      product_images ( url, position ),
      product_variants ( id, size, color, sku, stock, is_active )
    `,
    )
    .in("id", productIds)
    .eq("is_active", true);

  if (!products) {
    return NextResponse.json(
      { success: false, error: Messages.loadProductInfoError },
      { status: 500 },
    );
  }

  const orderItemsPayload: Array<{
    product_id: string;
    variant_id: string | null;
    product_name: string;
    product_slug: string;
    image_url: string | null;
    size: string | null;
    color: string | null;
    sku: string | null;
    unit_price: number;
    quantity: number;
    line_total: number;
  }> = [];
  let subtotal = 0;

  for (const cartItem of cartItems) {
    const product = products.find((p) => p.id === cartItem.productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: Messages.productUnavailable, code: "PRODUCT_NOT_FOUND" },
        { status: 400 },
      );
    }

    const unitPrice =
      product.discount_price != null && product.discount_price < product.price
        ? product.discount_price
        : product.price;
    const activeVariants = product.product_variants.filter(
      (v: { is_active: boolean }) => v.is_active !== false,
    );

    let variantId: string | null = null;
    let size: string | null = null;
    let color: string | null = null;
    let sku: string | null = null;

    if (cartItem.variantId) {
      const variant = activeVariants.find((v: { id: string }) => v.id === cartItem.variantId);
      if (!variant) {
        return NextResponse.json(
          { success: false, error: "Selected options unavailable", code: "VARIANT_NOT_FOUND" },
          { status: 400 },
        );
      }
      if (variant.stock < cartItem.quantity) {
        return NextResponse.json(
          { success: false, error: Messages.outOfStock, code: "INSUFFICIENT_STOCK" },
          { status: 409 },
        );
      }
      variantId = variant.id;
      size = variant.size;
      color = variant.color;
      sku = variant.sku;
    } else if (activeVariants.length > 0) {
      return NextResponse.json(
        { success: false, error: Messages.variantRequired, code: "VARIANT_REQUIRED" },
        { status: 400 },
      );
    }

    const sortedImages = [...product.product_images].sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position,
    );
    const lineTotal = unitPrice * cartItem.quantity;
    subtotal += lineTotal;

    orderItemsPayload.push({
      product_id: product.id,
      variant_id: variantId,
      product_name: product.name,
      product_slug: product.slug,
      image_url: getPrimaryStorefrontImage(product.product_images) ?? sortedImages[0]?.url ?? null,
      size,
      color,
      sku,
      unit_price: unitPrice,
      quantity: cartItem.quantity,
      line_total: lineTotal,
    });
  }

  // ── Shipping ──
  const shippingFee = SHIPPING_FEE;
  const rawTotal = subtotal + shippingFee;

  // ── Generate the local order id first — needed for atomic voucher claims ──
  const orderId = crypto.randomUUID();

  // ── Discounts ──
  let couponDiscount = 0;
  let couponId: string | null = null;
  let rewardVoucherCode: string | null = null;
  let influencerCode: string | null = null;
  let influencerDiscount = 0;

  const normalizedCoupon = coupon_code?.trim().toUpperCase();

  // Reward voucher (AANCHAL-*) — atomic one-time claim bound to this order
  if (normalizedCoupon?.startsWith("AANCHAL-")) {
    const claimed = await claimRewardVoucher(supabase, normalizedCoupon);
    if (!claimed.ok) {
      return NextResponse.json({ success: false, error: claimed.error }, { status: 400 });
    }
    couponDiscount = Math.min(Math.round(claimed.value), rawTotal);
    rewardVoucherCode = normalizedCoupon;
  } else if (normalizedCoupon) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select("id, discount_type, discount_value, max_discount_amount, min_order_amount, usage_limit, per_customer_limit, is_active, start_date, end_date")
      .eq("code", normalizedCoupon)
      .eq("is_active", true)
      .single();

    if (coupon) {
      const now = new Date();
      const validDates =
        (!coupon.start_date || new Date(coupon.start_date) <= now) &&
        (!coupon.end_date || new Date(coupon.end_date) >= now);
      const validMinOrder = !coupon.min_order_amount || rawTotal >= coupon.min_order_amount;

      if (validDates && validMinOrder) {
        const { count: usageCount } = await supabase
          .from("coupon_usage")
          .select("id", { count: "exact", head: true })
          .eq("coupon_id", coupon.id);
        const { count: customerCount } = await supabase
          .from("coupon_usage")
          .select("id", { count: "exact", head: true })
          .eq("coupon_id", coupon.id)
          .eq("customer_email", customer_email);

        if (coupon.usage_limit && usageCount !== null && usageCount >= coupon.usage_limit) {
          return NextResponse.json({ success: false, error: Messages.couponUsageLimit }, { status: 400 });
        }
        if (coupon.per_customer_limit && customerCount !== null && customerCount >= coupon.per_customer_limit) {
          return NextResponse.json({ success: false, error: Messages.couponAlreadyUsed }, { status: 400 });
        }

        if (coupon.discount_type === "fixed") {
          couponDiscount = coupon.discount_value;
        } else {
          couponDiscount = Math.round((rawTotal * coupon.discount_value) / 100);
        }
        if (coupon.max_discount_amount) {
          couponDiscount = Math.min(couponDiscount, coupon.max_discount_amount);
        }
        couponDiscount = Math.min(Math.round(couponDiscount), rawTotal);
        couponId = coupon.id;
      }
    }
  }

  const totalAfterCoupon = rawTotal - couponDiscount;

  // Influencer referral discount
  if (referral_code && referral_code.trim()) {
    const code = referral_code.trim().toUpperCase();
    const { data: influencer } = await supabase.rpc("get_influencer_by_code", {
      referral_code_input: code,
    });

    if (!influencer || influencer.status !== "approved") {
      await releaseRewardVoucher(supabase, rewardVoucherCode);
      return NextResponse.json(
        { success: false, error: "Invalid or inactive referral code.", code: "INVALID_REFERRAL" },
        { status: 400 },
      );
    }
    influencerDiscount = Math.min(Math.round(totalAfterCoupon * INFLUENCER_COMMISSION_RATE), INFLUENCER_DISCOUNT_CAP);
    influencerDiscount = Math.min(influencerDiscount, totalAfterCoupon);
    influencerCode = code;
  }

  const totalAfterReferral = totalAfterCoupon - influencerDiscount;

  // ── Payment-method specific calculations ──
  // Money is stored in rupees to 2 decimal places (numeric(10,2) columns).
  // discountAmount is always derived so the CHECK
  // total_amount = subtotal + shipping_fee - discount_amount holds exactly.
  const grossTotal = rawTotal;
  const totalAfterReferralRounded = Math.round(totalAfterReferral * 100) / 100;

  let totalAmount: number;
  let prepaidAmount: number;
  let codAmount: number;
  let prepaidDiscount: number;
  let discountAmount: number;

  if (whatsappMode) {
    // Phase 1: no online payment happens on the website, so no prepaid
    // incentive is applied. The amount shown is what the owner confirms
    // manually with the customer.
    totalAmount = totalAfterReferralRounded;
    prepaidAmount = 0;
    codAmount = 0;
    prepaidDiscount = 0;
    discountAmount = Math.round((grossTotal - totalAmount) * 100) / 100;
  } else if (paymentMethod === "prepaid") {
    prepaidDiscount = Math.round(totalAfterReferralRounded * PREPAID_DISCOUNT_RATE * 100) / 100;
    totalAmount = Math.round((totalAfterReferralRounded - prepaidDiscount) * 100) / 100;
    discountAmount = Math.round((grossTotal - totalAmount) * 100) / 100;
    prepaidAmount = totalAmount;
    codAmount = 0;
  } else {
    totalAmount = totalAfterReferralRounded;
    prepaidAmount = Math.ceil((totalAmount * 100) / 2) / 100;
    codAmount = Math.round((totalAmount - prepaidAmount) * 100) / 100;
    prepaidDiscount = 0;
    discountAmount = Math.round((grossTotal - totalAmount) * 100) / 100;
  }

  // ── Generate payment references ──
  let razorpayOrderId: string | null = null;
  let paytmOrderId: string | null = null;

  const adapter = await getProviderAdapter(paymentGateway);
  const amountPaiseToCharge = rupeesToPaise(paymentMethod === "prepaid" ? totalAmount : prepaidAmount);

  if (whatsappMode) {
    // No gateway interaction in Phase 1 — the order is confirmed manually.
  } else if (adapter && adapter.createOrder) {
    const createRes = await adapter.createOrder({ amountPaise: amountPaiseToCharge, currency: "INR", receipt: orderId, notes: { customer_name, customer_email, payment_method: paymentMethod } });
    if (createRes?.error) {
      console.error("[create-order] Provider createOrder failed:", createRes.error);
      await releaseRewardVoucher(supabase, rewardVoucherCode);
      return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 502 });
    }
    if (paymentGateway === "razorpay") {
      razorpayOrderId = createRes.providerOrderId ?? null;
    } else {
      // paytm: prefer provider-supplied id, fall back to legacy build
      paytmOrderId = createRes.providerOrderId ?? buildPaytmOrderId(orderId, 1);
    }
  } else {
    // Fallback to previous inline behavior when adapter doesn't implement createOrder
    if (paymentGateway === "razorpay") {
      try {
        const razorpayOrder = await razorpay!.orders.create({
          amount: amountPaiseToCharge,
          currency: "INR",
          receipt: `rcpt_${Date.now()}`,
          notes: { customer_name, customer_email, payment_method: paymentMethod },
        });
        razorpayOrderId = razorpayOrder.id;
      } catch (err) {
        console.error("[create-order] Razorpay order creation failed:", err instanceof Error ? err.message : "unknown");
        await releaseRewardVoucher(supabase, rewardVoucherCode);
        return NextResponse.json(
          { success: false, error: Messages.paymentNotConfigured },
          { status: 502 },
        );
      }
    } else {
      paytmOrderId = buildPaytmOrderId(orderId, 1);
    }
  }

  // ── Create order row ──
  const { data: order } = await supabase
    .from("orders")
    .insert({
      id: orderId,
      customer_name,
      customer_email,
      customer_phone,
      address_line1,
      address_line2: address_line2 ?? null,
      city,
      state,
      pincode,
      notes: notes ?? null,
      subtotal,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      prepaid_amount: prepaidAmount,
      cod_amount: codAmount,
      payment_method: paymentMethod,
      payment_provider: paymentGateway,
      confirmation_method: whatsappMode ? "whatsapp" : "payment",
      coupon_id: couponId,
      reward_voucher_code: rewardVoucherCode,
      influencer_code: influencerCode,
      payment_status: "pending",
      order_status: "pending",
      idempotency_key: normalizedIdempotencyKey,
      razorpay_order_id: razorpayOrderId,
      paytm_order_id: paytmOrderId,
    })
    .select("id, order_number")
    .single();

  if (!order) {
    await releaseRewardVoucher(supabase, rewardVoucherCode);
    return NextResponse.json(
      { success: false, error: Messages.orderCreateError },
      { status: 500 },
    );
  }

  // ── Stamp the voucher with the order now that the row exists (FK on
  //    used_by_order_id → orders.id). Best-effort: the voucher is already
  //    atomically claimed; this only fills in the audit reference. ──
  if (rewardVoucherCode) {
    await supabase
      .from("reward_vouchers")
      .update({ used_by_order_id: order.id })
      .eq("code", rewardVoucherCode)
      .eq("is_used", true);
  }

  // ── Insert order items ──
  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsPayload.map((item) => ({ ...item, order_id: order.id })));

  if (itemsError) {
    console.error("[create-order] Items insert error:", itemsError.message);
    await supabase.from("orders").delete().eq("id", order.id);
    await releaseRewardVoucher(supabase, rewardVoucherCode);
    return NextResponse.json(
      { success: false, error: Messages.orderCreateError },
      { status: 500 },
    );
  }

  // ── Store measurements, coupon usage & status history (non-critical) ──
  await Promise.allSettled([
    supabase.from("order_measurements").insert({
      order_id: order.id,
      chest: measurements.chest,
      waist: measurements.waist,
      full_height: measurements.full_height,
      shoulder: measurements.shoulder,
      unit: measurements.unit,
      personalisation_request: measurements.personalisation_request ?? null,
    }),
    couponId
      ? supabase.from("coupon_usage").insert({
          coupon_id: couponId,
          order_id: order.id,
          customer_email: customer_email,
          discount_amount: couponDiscount,
        })
      : Promise.resolve(),
    supabase.from("order_status_history").insert({
      order_id: order.id,
      old_status: null,
      new_status: "pending",
      changed_by: "system",
      notes: whatsappMode
        ? "Order request placed — awaiting WhatsApp confirmation"
        : "Order placed",
    }),
  ]);

  // ── Phase 1: WhatsApp confirmation — no payment gateway involved ──
  if (whatsappMode) {
    return NextResponse.json({
      success: true,
      data: await whatsappResponseData({ id: order.id, order_number: order.order_number }),
    });
  }

  // ── Initiate payment after the order exists ──
  if (paymentGateway === "paytm") {
    const initiated = await initiateTransaction(paytmConfig!, {
      paytmOrderId: paytmOrderId!,
      amountPaise: rupeesToPaise(paymentMethod === "prepaid" ? totalAmount : prepaidAmount),
      customerId: customer_email,
      mobileNumber: customer_phone,
      email: customer_email,
    });

    if (!initiated.success || !initiated.txnToken) {
      console.error("[create-order] Paytm initiate failed:", initiated.resultCode, initiated.resultMsg);
      await supabase.from("orders").delete().eq("id", order.id);
      // Clean up the coupon usage row created above so failed orders do not
      // count toward coupon usage limits.
      if (couponId) {
        await supabase.from("coupon_usage").delete().eq("order_id", order.id);
      }
      await releaseRewardVoucher(supabase, rewardVoucherCode);
      return NextResponse.json(
        { success: false, error: Messages.paymentNotConfigured, code: initiated.resultCode },
        { status: 502 },
      );
    }

    const finalOrder: OrderRow = {
      id: order.id,
      payment_status: "pending",
      payment_method: paymentMethod,
      total_amount: totalAmount,
      prepaid_amount: prepaidAmount,
      cod_amount: codAmount,
      discount_amount: discountAmount,
      customer_name,
      customer_email,
      customer_phone,
      paytm_order_id: paytmOrderId,
      razorpay_order_id: null,
    };

    return NextResponse.json({
      success: true,
      data: checkoutResponseData(finalOrder, "paytm", rupeesToPaise(paymentMethod === "prepaid" ? totalAmount : prepaidAmount), {
        paytm: {
          paytmOrderId: paytmOrderId!,
          txnToken: initiated.txnToken,
          redirectUrl: getProcessTransactionUrl(paytmConfig!, paytmOrderId!, initiated.txnToken),
        },
      }),
    });
  }

  const finalOrder: OrderRow = {
    id: order.id,
    payment_status: "pending",
    payment_method: paymentMethod,
    total_amount: totalAmount,
    prepaid_amount: prepaidAmount,
    cod_amount: codAmount,
    discount_amount: discountAmount,
    customer_name,
    customer_email,
    customer_phone,
    paytm_order_id: null,
    razorpay_order_id: razorpayOrderId,
  };

  return NextResponse.json({
    success: true,
    data: checkoutResponseData(finalOrder, "razorpay", rupeesToPaise(paymentMethod === "prepaid" ? totalAmount : prepaidAmount), {
      razorpayOrderId: razorpayOrderId!,
    }),
  });
}
