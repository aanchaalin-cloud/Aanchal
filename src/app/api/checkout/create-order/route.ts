import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validations";
import { rupeesToPaise } from "@/lib/utils";
import { createOrderStatusToken } from "@/lib/orders/public-status";
import { Messages } from "@/lib/messages";
import { validateRequest } from "@/lib/api-utils";
import { getCheckoutMode } from "@/lib/env";
import { getPrimaryStorefrontImage } from "@/lib/product-images";
import { buildWhatsAppConfirmationForOrder } from "@/lib/orders/whatsapp-confirmation";

const SHIPPING_FEE = 0;
const PREPAID_DISCOUNT_RATE = 0.05;
const INFLUENCER_DISCOUNT_CAP = 500;

/** Round to 2 decimal places using toFixed to avoid JS floating-point drift. */
function round2(n: number): number {
  return Number(n.toFixed(2));
}

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

function chargeablePaise(order: {
  payment_method: string;
  total_amount: number;
  prepaid_amount: number;
}): number {
  return rupeesToPaise(
    order.payment_method === "cod" ? Number(order.prepaid_amount) : Number(order.total_amount)
  );
}

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
 * Phase 2: Re-initiates payment for an existing pending order.
 * Only called in non-WhatsApp mode, so payment module imports are safe here.
 */
async function resumeCheckout(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  order: OrderRow
): Promise<NextResponse> {
  if (order.payment_status === "paid" || order.payment_status === "partially_paid") {
    const { getPaytmConfig } = await import("@/lib/paytm");
    const paytmConfig = getPaytmConfig();
    return NextResponse.json({
      success: true,
      data: checkoutResponseData(order, (paytmConfig ? "paytm" : "razorpay"), chargeablePaise(order), {
        alreadyPaid: true,
      }),
    });
  }

  const { getPaytmConfig } = await import("@/lib/paytm");
  const paytmConfig = getPaytmConfig();

  if (!paytmConfig) {
    const Razorpay = (await import("razorpay")).default;
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

  const { buildPaytmOrderId, initiateTransaction, getProcessTransactionUrl } = await import("@/lib/paytm");
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

async function claimRewardVoucher(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  code: string
): Promise<{ ok: true; value: number } | { ok: false; error: string }> {
  try {
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
  } catch (err) {
    console.error("[create-order] claimRewardVoucher error:", err);
    return { ok: false, error: "Unable to apply voucher. Please try again." };
  }
}

async function releaseRewardVoucher(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  code: string | null
): Promise<void> {
  if (!code) return;
  try {
    await supabase
      .from("reward_vouchers")
      .update({ is_used: false, used_by_order_id: null })
      .eq("code", code)
      .eq("is_used", true);
  } catch (err) {
    console.error("[create-order] releaseRewardVoucher error:", err);
  }
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

  const whatsappMode = getCheckoutMode() === "whatsapp";
  const paymentMethod = payment_method ?? (whatsappMode ? "cod" : "prepaid");

  if (!whatsappMode) {
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error("[create-order] Payment credentials missing");
      return NextResponse.json(
        { success: false, error: Messages.paymentNotConfigured },
        { status: 503 },
      );
    }
  }

  let supabase;
  try {
    supabase = await createServiceClient();
  } catch (err) {
    console.error("[create-order] Failed to create Supabase client:", err);
    return NextResponse.json(
      { success: false, error: "Database connection unavailable. Please try again." },
      { status: 503 },
    );
  }

  const normalizedIdempotencyKey = normalizeIdempotencyKey(idempotency_key);

  // ── Idempotency — resume an existing pending order for this key ──
  if (normalizedIdempotencyKey) {
    try {
      const { data: existing, error: existingErr } = await supabase
        .from("orders")
        .select(
          "id, order_number, payment_status, payment_method, total_amount, prepaid_amount, cod_amount, discount_amount, customer_name, customer_email, customer_phone, paytm_order_id, razorpay_order_id, confirmation_method"
        )
        .eq("idempotency_key", normalizedIdempotencyKey)
        .maybeSingle();

      if (existingErr) {
        console.error("[create-order] Idempotency lookup error:", existingErr.message);
      }

      if (existing) {
        if (existing.customer_email?.toLowerCase() !== customer_email) {
          return NextResponse.json(
            { success: false, error: "This checkout session belongs to another customer." },
            { status: 403 },
          );
        }
        if (existing.confirmation_method === "whatsapp") {
          return NextResponse.json({
            success: true,
            data: await whatsappResponseData(existing as OrderRow),
          });
        }
        return resumeCheckout(supabase, existing as OrderRow);
      }
    } catch (err) {
      console.error("[create-order] Idempotency check failed:", err);
    }
  }

  // ── Fetch products & build order items with server-side prices ──
  const productIds = [...new Set(cartItems.map((i) => i.productId))];
  let products: Array<{
    id: string;
    name: string;
    slug: string;
    price: number;
    discount_price: number | null;
    is_active: boolean;
    product_images: Array<{ url: string; position: number }>;
    product_variants: Array<{ id: string; size: string | null; color: string | null; sku: string | null; stock: number; is_active: boolean }>;
  }> | null = null;

  try {
    const result = await supabase
      .from("products")
      .select(
        `id, name, slug, price, discount_price, is_active,
        product_images ( url, position ),
        product_variants ( id, size, color, sku, stock, is_active )`,
      )
      .in("id", productIds)
      .eq("is_active", true);
    products = result.data;
    if (result.error) {
      console.error("[create-order] Product fetch error:", result.error.message);
    }
  } catch (err) {
    console.error("[create-order] Product fetch exception:", err);
  }

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
  let subtotalRaw = 0;

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
      (v) => v.is_active !== false,
    );

    let variantId: string | null = null;
    let size: string | null = null;
    let color: string | null = null;
    let sku: string | null = null;

    if (cartItem.variantId) {
      const variant = activeVariants.find((v) => v.id === cartItem.variantId);
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
      (a, b) => a.position - b.position,
    );
    const lineTotal = round2(unitPrice * cartItem.quantity);
    subtotalRaw += lineTotal;

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

  const shippingFee = SHIPPING_FEE;
  const subtotal = round2(subtotalRaw);
  const rawTotal = round2(subtotal + shippingFee);
  const orderId = crypto.randomUUID();

  // ── Discounts ──
  let couponDiscount = 0;
  let couponId: string | null = null;
  let rewardVoucherCode: string | null = null;
  let influencerCode: string | null = null;
  let influencerDiscount = 0;

  const normalizedCoupon = coupon_code?.trim().toUpperCase();

  if (normalizedCoupon?.startsWith("AANCHAL-")) {
    const claimed = await claimRewardVoucher(supabase, normalizedCoupon);
    if (!claimed.ok) {
      return NextResponse.json({ success: false, error: claimed.error }, { status: 400 });
    }
    couponDiscount = Math.min(round2(claimed.value), rawTotal);
    rewardVoucherCode = normalizedCoupon;
  } else if (normalizedCoupon) {
    try {
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
            couponDiscount = round2((rawTotal * coupon.discount_value) / 100);
          }
          if (coupon.max_discount_amount) {
            couponDiscount = Math.min(couponDiscount, coupon.max_discount_amount);
          }
          couponDiscount = Math.min(round2(couponDiscount), rawTotal);
          couponId = coupon.id;
        }
      }
    } catch (err) {
      console.error("[create-order] Coupon validation error:", err);
    }
  }

  const totalAfterCoupon = round2(rawTotal - couponDiscount);

  // Influencer referral discount
  if (referral_code && referral_code.trim()) {
    const code = referral_code.trim().toUpperCase();
    try {
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

      const INFLUENCER_COMMISSION_RATE = 0.1;
      influencerDiscount = Math.min(round2(totalAfterCoupon * INFLUENCER_COMMISSION_RATE), INFLUENCER_DISCOUNT_CAP);
      influencerDiscount = Math.min(influencerDiscount, totalAfterCoupon);
      influencerCode = code;
    } catch (err) {
      console.error("[create-order] Influencer referral error:", err);
    }
  }

  const totalAfterReferral = round2(totalAfterCoupon - influencerDiscount);

  const grossTotal = rawTotal;
  const totalAfterReferralRounded = round2(totalAfterReferral);

  let totalAmount: number;
  let prepaidAmount: number;
  let codAmount: number;
  let prepaidDiscount: number;
  let discountAmount: number;

  if (whatsappMode) {
    totalAmount = totalAfterReferralRounded;
    prepaidDiscount = 0;
    discountAmount = round2(grossTotal - totalAmount);
    if (paymentMethod === "cod") {
      prepaidAmount = 0;
      codAmount = totalAmount;
    } else {
      prepaidAmount = totalAmount;
      codAmount = 0;
    }
  } else if (paymentMethod === "prepaid") {
    prepaidDiscount = round2(totalAfterReferralRounded * PREPAID_DISCOUNT_RATE);
    totalAmount = round2(totalAfterReferralRounded - prepaidDiscount);
    discountAmount = round2(grossTotal - totalAmount);
    prepaidAmount = totalAmount;
    codAmount = 0;
  } else {
    totalAmount = totalAfterReferralRounded;
    prepaidAmount = round2(Math.ceil((totalAmount * 100) / 2) / 100);
    codAmount = round2(totalAmount - prepaidAmount);
    prepaidDiscount = 0;
    discountAmount = round2(grossTotal - totalAmount);
  }

  // ── Phase 2: Payment references (only in non-WhatsApp mode) ──
  let razorpayOrderId: string | null = null;
  let paytmOrderId: string | null = null;

  if (!whatsappMode) {
    try {
      const { getPaytmConfig } = await import("@/lib/paytm");
      const paytmConfig = getPaytmConfig();
      const { getProviderAdapter } = await import("@/lib/payments");
      const paymentGateway: "paytm" | "razorpay" = paytmConfig ? "paytm" : "razorpay";
      const adapter = await getProviderAdapter(paymentGateway);
      const amountPaiseToCharge = rupeesToPaise(paymentMethod === "prepaid" ? totalAmount : prepaidAmount);

      if (adapter && adapter.createOrder) {
        const createRes = await adapter.createOrder({ amountPaise: amountPaiseToCharge, currency: "INR", receipt: orderId, notes: { customer_name, customer_email, payment_method: paymentMethod } });
        if (createRes?.error) {
          console.error("[create-order] Provider createOrder failed:", createRes.error);
          await releaseRewardVoucher(supabase, rewardVoucherCode);
          return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 502 });
        }
        if (paymentGateway === "razorpay") {
          razorpayOrderId = createRes.providerOrderId ?? null;
        } else {
          const { buildPaytmOrderId } = await import("@/lib/paytm");
          paytmOrderId = createRes.providerOrderId ?? buildPaytmOrderId(orderId, 1);
        }
      } else {
        if (paymentGateway === "razorpay") {
          const Razorpay = (await import("razorpay")).default;
          const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
          const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
          if (razorpayKeyId && razorpayKeySecret) {
            const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
            const razorpayOrder = await razorpay.orders.create({
              amount: amountPaiseToCharge,
              currency: "INR",
              receipt: `rcpt_${Date.now()}`,
              notes: { customer_name, customer_email, payment_method: paymentMethod },
            });
            razorpayOrderId = razorpayOrder.id;
          }
        } else {
          const { buildPaytmOrderId } = await import("@/lib/paytm");
          paytmOrderId = buildPaytmOrderId(orderId, 1);
        }
      }
    } catch (err) {
      console.error("[create-order] Payment provider error:", err);
      await releaseRewardVoucher(supabase, rewardVoucherCode);
      return NextResponse.json(
        { success: false, error: Messages.paymentNotConfigured },
        { status: 502 },
      );
    }
  }

  // ── Create order row ──
  // NOTE: payment_provider must be a real gateway ("razorpay" | "paytm") — the
  // orders table CHECK constraint rejects values like "whatsapp". In WhatsApp
  // mode we use "razorpay" as the default since no actual payment is processed.
  const { data: order, error: orderError } = await supabase
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
      payment_provider: "razorpay",
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

  if (orderError || !order) {
    console.error("[create-order] Order insert error:", orderError?.message ?? "unknown");
    await releaseRewardVoucher(supabase, rewardVoucherCode);
    return NextResponse.json(
      { success: false, error: Messages.orderCreateError },
      { status: 500 },
    );
  }

  // ── Stamp the voucher ──
  if (rewardVoucherCode) {
    try {
      await supabase
        .from("reward_vouchers")
        .update({ used_by_order_id: order.id })
        .eq("code", rewardVoucherCode)
        .eq("is_used", true);
    } catch (err) {
      console.error("[create-order] Voucher stamp error:", err);
    }
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

  // ── Phase 2: Initiate payment after the order exists ──
  const { getPaytmConfig } = await import("@/lib/paytm");
  const paytmConfig = getPaytmConfig();

  if (paytmConfig) {
    const { initiateTransaction, getProcessTransactionUrl } = await import("@/lib/paytm");
    const initiated = await initiateTransaction(paytmConfig, {
      paytmOrderId: paytmOrderId!,
      amountPaise: rupeesToPaise(paymentMethod === "prepaid" ? totalAmount : prepaidAmount),
      customerId: customer_email,
      mobileNumber: customer_phone,
      email: customer_email,
    });

    if (!initiated.success || !initiated.txnToken) {
      console.error("[create-order] Paytm initiate failed:", initiated.resultCode, initiated.resultMsg);
      await supabase.from("orders").delete().eq("id", order.id);
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
          redirectUrl: getProcessTransactionUrl(paytmConfig, paytmOrderId!, initiated.txnToken),
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
