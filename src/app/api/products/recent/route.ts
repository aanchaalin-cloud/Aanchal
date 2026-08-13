import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";
import type { ProductWithDetails } from "@/types";

const recentSchema = z.object({
  slugs: z.array(z.string().min(1).max(80)).max(20),
});

/**
 * Resolve recent-viewed product slugs (guest browsing history kept in
 * localStorage) back to full product details. Public route — no auth.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await validateRequest(request, recentSchema);
  if (body instanceof NextResponse) return body;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(`
      id, name, slug, description, category, price, discount_price,
      fabric, wash_care, is_featured, is_active, created_at, updated_at,
      product_images ( id, product_id, url, alt_text, position, created_at ),
      product_variants ( id, product_id, size, color, color_hex, sku, stock, is_active, created_at, updated_at )
    `)
    .in("slug", body.slugs)
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to load products" }, { status: 500 });
  }

  const products = (data as ProductWithDetails[]) ?? [];
  const order = new Map(body.slugs.map((slug, i) => [slug, i]));
  products.sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99));

  return NextResponse.json({ success: true, data: products });
}
