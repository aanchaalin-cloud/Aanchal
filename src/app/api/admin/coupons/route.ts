import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { couponSchema } from "@/lib/validations";
import { Messages } from "@/lib/messages";
import { requireAdmin, validateRequest } from "@/lib/api-utils";

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServiceClient();

  const { data: coupons, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin-list-coupons]", error.message);
    return NextResponse.json({ success: false, error: Messages.genericError }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: coupons });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, couponSchema, true);
  if (data instanceof NextResponse) return data;

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("coupons")
    .select("id")
    .eq("code", data.code.toUpperCase())
    .single();

  if (existing) {
    return NextResponse.json({ success: false, error: "A coupon with this code already exists" }, { status: 409 });
  }

  const { data: coupon, error } = await supabase
    .from("coupons")
    .insert({
      code: data.code.toUpperCase(),
      description: data.description ?? null,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      min_order_amount: data.min_order_amount ?? null,
      max_discount_amount: data.max_discount_amount ?? null,
      usage_limit: data.usage_limit ?? null,
      per_customer_limit: data.per_customer_limit ?? null,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      is_active: data.is_active,
    })
    .select("id")
    .single();

  if (error || !coupon) {
    console.error("[admin-create-coupon]", error?.message);
    return NextResponse.json({ success: false, error: Messages.genericError }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { id: coupon.id } });
}
