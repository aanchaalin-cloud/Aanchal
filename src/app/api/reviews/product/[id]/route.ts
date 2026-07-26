import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: productId } = await params;

  if (!productId || !/^[0-9a-f-]{36}$/i.test(productId)) {
    return NextResponse.json(
      { success: false, error: Messages.invalidRequest },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("id, customer_name, rating, title, body, is_verified_purchase, created_at")
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[get-product-reviews]", error.message);
    return NextResponse.json(
      { success: false, error: Messages.reviewLoadError },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: reviews });
}
