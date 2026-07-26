import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createServiceClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validations";
import { rupeesToPaise } from "@/lib/utils";
import { createOrderStatusToken } from "@/lib/orders/public-status";
import { Messages } from "@/lib/messages";
import { validateRequest } from "@/lib/api-utils";

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE = 99;
const PREPAID_DISCOUNT_RATE = 0.05;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, checkoutSchema);
  if (data instanceof NextResponse) return data;

  const {
    customer_name,
    customer_email,
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
    cartItems: submittedCartItems,
  } = data;

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

  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!razorpayKeyId || !razorpayKeySecret) {
    console.error("[create-order] Payment credentials missing");
    return NextResponse.json(
      { success: false, error: Messages.paymentNotConfigured },
      { status: 503 },
    );
  }

  const razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });
  const supabase = await createServiceClient();

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
        {
          success: false,
          error: Messages.productUnavailable,
          code: "PRODUCT_NOT_FOUND",
        },
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
      const variant = activeVariants.find(
        (v: { id: string }) => v.id === cartItem.variantId,
      );
      if (!variant) {
        return NextResponse.json(
          {
            success: false,
            error: "Selected options unavailable",
            code: "VARIANT_NOT_FOUND",
          },
          { status: 400 },
        );
      }
      if (variant.stock < cartItem.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: Messages.outOfStock,
            code: "INSUFFICIENT_STOCK",
          },
          { status: 409 },
        );
      }
      variantId = variant.id;
      size = variant.size;
      color = variant.color;
      sku = variant.sku;
    } else if (activeVariants.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: Messages.variantRequired,
          code: "VARIANT_REQUIRED",
        },
        { status: 400 },
      );
    }

    const sortedImages = [...product.product_images].sort(
      (a: { position: number }, b: { position: number }) =>
        a.position - b.position,
    );
    const lineTotal = unitPrice * cartItem.quantity;
    subtotal += lineTotal;

    orderItemsPayload.push({
      product_id: product.id,
      variant_id: variantId,
      product_name: product.name,
      product_slug: product.slug,
      image_url: sortedImages[0]?.url ?? null,
      size,
      color,
      sku,
      unit_price: unitPrice,
      quantity: cartItem.quantity,
      line_total: lineTotal,
    });
  }

  // ── Shipping ──
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const rawTotal = subtotal + shippingFee;

  // ── Coupon discount ──
  let couponDiscount = 0;
  let couponId: string | null = null;

  if (coupon_code) {
    const { data: coupon } = await supabase
      .from("coupons")
      .select(
        "id, discount_type, discount_value, max_discount_amount, min_order_amount, is_active, start_date, end_date",
      )
      .eq("code", coupon_code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (coupon) {
      const now = new Date();
      const validDates =
        (!coupon.start_date || new Date(coupon.start_date) <= now) &&
        (!coupon.end_date || new Date(coupon.end_date) >= now);
      const validMinOrder =
        !coupon.min_order_amount || rawTotal >= coupon.min_order_amount;

      if (validDates && validMinOrder) {
        if (coupon.discount_type === "fixed") {
          couponDiscount = coupon.discount_value;
        } else {
          couponDiscount = Math.round(
            (rawTotal * coupon.discount_value) / 100,
          );
        }
        if (coupon.max_discount_amount) {
          couponDiscount = Math.min(
            couponDiscount,
            coupon.max_discount_amount,
          );
        }
        couponDiscount = Math.min(couponDiscount, rawTotal);
        couponId = coupon.id;
      }
    }
  }

  const totalAfterCoupon = rawTotal - couponDiscount;

  // ── Payment-method specific calculations ──
  let totalAmount: number;
  let prepaidAmount: number;
  let codAmount: number;
  let prepaidDiscount: number;
  let discountAmount: number;

  if (payment_method === "prepaid") {
    prepaidDiscount = Math.round(totalAfterCoupon * PREPAID_DISCOUNT_RATE);
    totalAmount = totalAfterCoupon - prepaidDiscount;
    discountAmount = couponDiscount + prepaidDiscount;
    prepaidAmount = totalAmount;
    codAmount = 0;
  } else {
    totalAmount = totalAfterCoupon;
    prepaidAmount = Math.ceil(totalAfterCoupon / 2);
    codAmount = Math.floor(totalAfterCoupon / 2);
    prepaidDiscount = 0;
    discountAmount = couponDiscount;
  }

  // ── Razorpay order (for the upfront portion) ──
  const razorpayAmount =
    payment_method === "prepaid" ? totalAmount : prepaidAmount;

  let razorpayOrder: { id: string };
  try {
    razorpayOrder = await razorpay.orders.create({
      amount: rupeesToPaise(razorpayAmount),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { customer_name, customer_email, payment_method },
    });
  } catch (err) {
    console.error("[create-order] Razorpay order creation failed:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json(
      { success: false, error: Messages.paymentNotConfigured },
      { status: 502 },
    );
  }

  // ── Create order row ──
  const { data: order } = await supabase
    .from("orders")
    .insert({
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
      payment_method,
      coupon_id: couponId,
      payment_status: "pending",
      order_status: "pending",
      razorpay_order_id: razorpayOrder.id,
    })
    .select("id")
    .single();

  if (!order) {
    return NextResponse.json(
      { success: false, error: Messages.orderCreateError },
      { status: 500 },
    );
  }

  // ── Insert order items ──
  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(
      orderItemsPayload.map((item) => ({ ...item, order_id: order.id })),
    );

  if (itemsError) {
    console.error("[create-order] Items insert error:", itemsError.message);
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json(
      { success: false, error: Messages.orderCreateError },
      { status: 500 },
    );
  }

  // ── Store measurements (non-critical, don't fail order) ──
  try {
    await supabase.from("order_measurements").insert({
      order_id: order.id,
      chest: measurements.chest,
      waist: measurements.waist,
      full_height: measurements.full_height,
      unit: measurements.unit,
      personalisation_request: measurements.personalisation_request ?? null,
    });
  } catch (e) {
    console.warn("[create-order] Failed to store measurements:", e instanceof Error ? e.message : "unknown");
  }

  // ── Record coupon usage (non-critical) ──
  if (couponId) {
    try {
      await supabase.from("coupon_usage").insert({
        coupon_id: couponId,
        order_id: order.id,
        customer_email: customer_email,
        discount_amount: couponDiscount,
      });
    } catch (e) {
      console.warn("[create-order] Failed to record coupon usage:", e instanceof Error ? e.message : "unknown");
    }
  }

  // ── Seed order status history (non-critical) ──
  try {
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      old_status: null,
      new_status: "pending",
      changed_by: "system",
      notes: "Order placed",
    });
  } catch (e) {
    console.warn("[create-order] Failed to seed status history:", e instanceof Error ? e.message : "unknown");
  }

  return NextResponse.json({
    success: true,
    data: {
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amount: rupeesToPaise(razorpayAmount),
      currency: "INR",
      customerName: customer_name,
      customerEmail: customer_email,
      customerPhone: customer_phone,
      statusToken: createOrderStatusToken(order.id, razorpayOrder.id),
      paymentMethod: payment_method,
      prepaidAmount,
      codAmount,
      discountAmount,
    },
  });
}
