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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, checkoutSchema);
  if (data instanceof NextResponse) return data;

  const { customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, notes, cartItems: submittedCartItems } = data;

  const cartItems = Array.from(
    submittedCartItems.reduce((itemsByVariant, item) => {
      const existing = itemsByVariant.get(item.variantId);
      itemsByVariant.set(item.variantId, { ...item, quantity: (existing?.quantity ?? 0) + item.quantity });
      return itemsByVariant;
    }, new Map<string, (typeof submittedCartItems)[number]>()).values()
  );

  if (cartItems.some((item) => item.quantity > 10)) {
    return NextResponse.json({ success: false, error: "Maximum 10 items per variant" }, { status: 400 });
  }

  const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!razorpayKeyId || !razorpayKeySecret) {
    console.error("[create-order] Payment credentials missing");
    return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 503 });
  }

  const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
  const supabase = await createServiceClient();

  const productIds = [...new Set(cartItems.map((i) => i.productId))];
  const { data: products } = await supabase.from("products").select(`
    id, name, slug, price, discount_price, is_active,
    product_images ( url, position ),
    product_variants ( id, size, color, sku, stock, is_active )
  `).in("id", productIds).eq("is_active", true);

  if (!products) {
    return NextResponse.json({ success: false, error: Messages.loadProductInfoError }, { status: 500 });
  }

  const orderItemsPayload: Array<{
    product_id: string; variant_id: string | null; product_name: string; product_slug: string;
    image_url: string | null; size: string | null; color: string | null; sku: string | null;
    unit_price: number; quantity: number; line_total: number;
  }> = [];
  let subtotal = 0;

  for (const cartItem of cartItems) {
    const product = products.find((p) => p.id === cartItem.productId);
    if (!product) {
      return NextResponse.json({ success: false, error: Messages.productUnavailable, code: "PRODUCT_NOT_FOUND" }, { status: 400 });
    }

    const unitPrice = product.discount_price != null && product.discount_price < product.price ? product.discount_price : product.price;
    const activeVariants = product.product_variants.filter((v: { is_active: boolean }) => v.is_active !== false);

    let variantId: string | null = null;
    let size: string | null = null;
    let color: string | null = null;
    let sku: string | null = null;

    if (cartItem.variantId) {
      const variant = activeVariants.find((v: { id: string }) => v.id === cartItem.variantId);
      if (!variant) {
        return NextResponse.json({ success: false, error: "Selected options unavailable", code: "VARIANT_NOT_FOUND" }, { status: 400 });
      }
      if (variant.stock < cartItem.quantity) {
        return NextResponse.json({ success: false, error: Messages.outOfStock, code: "INSUFFICIENT_STOCK" }, { status: 409 });
      }
      variantId = variant.id;
      size = variant.size;
      color = variant.color;
      sku = variant.sku;
    } else if (activeVariants.length > 0) {
      return NextResponse.json({ success: false, error: Messages.variantRequired, code: "VARIANT_REQUIRED" }, { status: 400 });
    }

    const sortedImages = [...product.product_images].sort((a: { position: number }, b: { position: number }) => a.position - b.position);
    const lineTotal = unitPrice * cartItem.quantity;
    subtotal += lineTotal;

    orderItemsPayload.push({
      product_id: product.id, variant_id: variantId, product_name: product.name, product_slug: product.slug,
      image_url: sortedImages[0]?.url ?? null, size, color, sku, unit_price: unitPrice, quantity: cartItem.quantity, line_total: lineTotal,
    });
  }

  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const totalAmount = subtotal + shippingFee;

  let razorpayOrder: { id: string };
  try {
    razorpayOrder = await razorpay.orders.create({
      amount: rupeesToPaise(totalAmount), currency: "INR", receipt: `rcpt_${Date.now()}`,
      notes: { customer_name, customer_email },
    });
  } catch (err) {
    console.error("[create-order] Razorpay order creation failed:", err);
    return NextResponse.json({ success: false, error: Messages.paymentNotConfigured }, { status: 502 });
  }

  const { data: order } = await supabase.from("orders").insert({
    customer_name, customer_email, customer_phone, address_line1, address_line2: address_line2 ?? null,
    city, state, pincode, notes: notes ?? null, subtotal, shipping_fee: shippingFee, total_amount: totalAmount,
    payment_status: "pending", order_status: "pending", razorpay_order_id: razorpayOrder.id,
  }).select("id").single();

  if (!order) {
    return NextResponse.json({ success: false, error: Messages.orderCreateError }, { status: 500 });
  }

  const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload.map((item) => ({ ...item, order_id: order.id })));
  if (itemsError) {
    console.error("[create-order] Items insert error:", itemsError.message);
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ success: false, error: Messages.orderCreateError }, { status: 500 });
  }

  return NextResponse.json({
    success: true, data: {
      orderId: order.id, razorpayOrderId: razorpayOrder.id, amount: rupeesToPaise(totalAmount),
      currency: "INR", customerName: customer_name, customerEmail: customer_email,
      customerPhone: customer_phone, statusToken: createOrderStatusToken(order.id, razorpayOrder.id),
    },
  });
}
