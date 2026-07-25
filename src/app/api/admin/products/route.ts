import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { productCreateSchema } from "@/lib/validations";
import { Messages } from "@/lib/messages";
import { requireAdmin, validateRequest } from "@/lib/api-utils";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, productCreateSchema, true);
  if (data instanceof NextResponse) return data;

  const { name, slug, description, category, price, discount_price, fabric, wash_care, is_featured, is_active, images, variants } = data;
  const serviceClient = await createServiceClient();

  const { data: product, error: productError } = await serviceClient.from("products").insert({
    name, slug, description, category, price,
    discount_price: discount_price ?? null,
    fabric: fabric ?? null, wash_care: wash_care ?? null,
    is_featured, is_active,
  }).select("id").single();

  if (productError || !product) {
    console.error("[admin-create-product]", productError?.message);
    return NextResponse.json({ success: false, error: Messages.adminCreateProductError }, { status: 500 });
  }

  const validImages = images.filter((url: string) => url.trim()).map((url: string, idx: number) => ({
    product_id: product.id, url: url.trim(), alt_text: name, position: idx,
  }));
  if (validImages.length > 0) {
    await serviceClient.from("product_images").insert(validImages);
  }

  const validVariants = variants.filter((v: { size?: string | null; color?: string | null; sku?: string | null }) => v.size || v.color || v.sku).map((v: { size?: string | null; color?: string | null; color_hex?: string | null; sku?: string | null; stock: number }) => ({
    product_id: product.id, size: v.size || null, color: v.color || null, color_hex: v.color_hex || null, sku: v.sku || null, stock: v.stock,
  }));
  if (validVariants.length > 0) {
    await serviceClient.from("product_variants").insert(validVariants);
  }

  return NextResponse.json({ success: true, data: { id: product.id } });
}
