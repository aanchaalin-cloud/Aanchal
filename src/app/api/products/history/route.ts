import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";
import type { ProductWithDetails } from "@/types";

const historySchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
});

const productSelect = `
  id, name, slug, description, category, price, discount_price,
  fabric, wash_care, is_featured, is_active, created_at, updated_at,
  product_images ( id, product_id, url, alt_text, position, created_at ),
  product_variants ( id, product_id, size, color, color_hex, sku, stock, is_active, created_at, updated_at )
`;

/** Record a product view for the signed-in customer. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await validateRequest(request, historySchema);
  if (body instanceof NextResponse) return body;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const { error } = await supabase.from("product_history").upsert(
    { customer_id: user.id, product_id: body.productId, viewed_at: new Date().toISOString() },
    { onConflict: "customer_id,product_id" }
  );

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to record history" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** Return the signed-in customer's recently viewed products (newest first). */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("product_history")
    .select(`product_id, viewed_at, products ( ${productSelect} )`)
    .eq("customer_id", user.id)
    .order("viewed_at", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to load history" }, { status: 500 });
  }

  // `products` is embedded through a many-to-one FK (product_history.product_id
  // → products.id); PostgREST may return it as an object or one-element array.
  const products = (data ?? [])
    .map((row: { products?: ProductWithDetails | ProductWithDetails[] }) => {
      const p = row.products;
      return Array.isArray(p) ? p[0] : p;
    })
    .filter((p: ProductWithDetails | undefined): p is ProductWithDetails => Boolean(p));

  return NextResponse.json({ success: true, data: products });
}
