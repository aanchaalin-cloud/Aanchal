import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { validateRequest } from "@/lib/api-utils";

const couponValidateSchema = z.object({
  code: z.string().min(1, "Coupon code is required").max(50),
  subtotal: z.number().min(0, "Subtotal must be non-negative"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, couponValidateSchema);
  if (data instanceof NextResponse) return data;

  const { code, subtotal } = data;
  const supabase = await createServiceClient();
  const normalizedCode = code.toUpperCase().trim();

  // ── Reward Voucher Check ──
  if (normalizedCode.startsWith("AANCHAL-")) {
    const { data: voucher, error: voucherError } = await supabase
      .from("reward_vouchers")
      .select("id, code, value, expires_at, is_used")
      .eq("code", normalizedCode)
      .single();

    if (voucherError || !voucher) {
      return NextResponse.json({ success: false, error: Messages.couponInvalid }, { status: 400 });
    }

    if (voucher.is_used) {
      return NextResponse.json({ success: false, error: "This voucher has already been used." }, { status: 400 });
    }

    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "This voucher has expired." }, { status: 400 });
    }

    const discountAmount = Math.min(voucher.value, subtotal);

    return NextResponse.json({
      success: true,
      data: { discountAmount, couponCode: voucher.code, isRewardVoucher: true },
    });
  }

  // ── Standard Coupon Check ──
  const { data: coupon, error: couponError } = await supabase
    .from("coupons")
    .select("id, code, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, per_customer_limit, start_date, end_date, is_active")
    .eq("code", normalizedCode)
    .single();

  if (couponError || !coupon) {
    return NextResponse.json({ success: false, error: Messages.couponInvalid }, { status: 400 });
  }

  if (!coupon.is_active) {
    return NextResponse.json({ success: false, error: Messages.couponInvalid }, { status: 400 });
  }

  const now = new Date();
  if (coupon.start_date && new Date(coupon.start_date) > now) {
    return NextResponse.json({ success: false, error: Messages.couponExpired }, { status: 400 });
  }
  if (coupon.end_date && new Date(coupon.end_date) < now) {
    return NextResponse.json({ success: false, error: Messages.couponExpired }, { status: 400 });
  }

  if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
    return NextResponse.json(
      { success: false, error: `${Messages.couponMinOrder} Minimum order: ₹${coupon.min_order_amount}` },
      { status: 400 },
    );
  }

  if (coupon.usage_limit) {
    const { count } = await supabase
      .from("coupon_usage")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id);

    if (count !== null && count >= coupon.usage_limit) {
      return NextResponse.json({ success: false, error: Messages.couponUsageLimit }, { status: 400 });
    }
  }

  let discountAmount: number;
  if (coupon.discount_type === "fixed") {
    discountAmount = coupon.discount_value;
  } else {
    discountAmount = Math.round((subtotal * coupon.discount_value) / 100);
  }

  if (coupon.max_discount_amount && discountAmount > coupon.max_discount_amount) {
    discountAmount = coupon.max_discount_amount;
  }

  discountAmount = Math.min(discountAmount, subtotal);

  return NextResponse.json({
    success: true,
    data: { discountAmount, couponCode: coupon.code, isRewardVoucher: false },
  });
}
