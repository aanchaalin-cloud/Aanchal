import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const wishlistSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
});

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("wishlist_items")
    .select(
      `
      id, product_id, created_at,
      products ( id, name, slug, price, discount_price, category, is_active )
    `
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to load wishlist" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await validateRequest(request, wishlistSchema);
  if (body instanceof NextResponse) return body;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Please sign in to save items to your wishlist" }, { status: 401 });
  }

  const { error } = await supabase
    .from("wishlist_items")
    .upsert(
      { customer_id: user.id, product_id: body.productId },
      { onConflict: "customer_id,product_id", ignoreDuplicates: true }
    );

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to update wishlist" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const body = await validateRequest(request, wishlistSchema);
  if (body instanceof NextResponse) return body;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const { error } = await supabase
    .from("wishlist_items")
    .delete()
    .eq("customer_id", user.id)
    .eq("product_id", body.productId);

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to update wishlist" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
