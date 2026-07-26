import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/validations";
import { Messages } from "@/lib/messages";
import { validateRequest } from "@/lib/api-utils";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, reviewSchema);
  if (data instanceof NextResponse) return data;

  const supabase = await createServiceClient();

  // Verify product exists
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", data.product_id)
    .eq("is_active", true)
    .single();

  if (!product) {
    return NextResponse.json(
      { success: false, error: Messages.productUnavailable },
      { status: 404 }
    );
  }

  // Check for duplicate review (same email + product)
  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("product_id", data.product_id)
    .eq("customer_email", data.customer_email)
    .single();

  if (existingReview) {
    return NextResponse.json(
      { success: false, error: "You have already reviewed this product." },
      { status: 409 }
    );
  }

  // Check if verified purchase
  const { data: orderItem } = await supabase
    .from("order_items")
    .select("id")
    .eq("product_id", data.product_id)
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("reviews").insert({
    product_id: data.product_id,
    customer_name: data.customer_name,
    customer_email: data.customer_email,
    rating: data.rating,
    title: data.title ?? null,
    body: data.body,
    is_verified_purchase: !!orderItem,
    is_approved: false,
    is_featured: false,
  });

  if (error) {
    console.error("[submit-review]", error.message);
    return NextResponse.json(
      { success: false, error: Messages.genericError },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { message: Messages.reviewSubmitted },
  });
}
