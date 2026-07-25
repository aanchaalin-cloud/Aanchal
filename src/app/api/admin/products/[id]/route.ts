import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { productCreateSchema } from "@/lib/validations";
import { Messages } from "@/lib/messages";
import { requireAdmin, validateRequest } from "@/lib/api-utils";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const productId = (await params).id;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, productCreateSchema, true);
  if (data instanceof NextResponse) return data;

  const { name, slug, description, category, price, discount_price, fabric, wash_care, is_featured, is_active, images, variants } = data;
  const serviceClient = await createServiceClient();

  const { data: existingProduct } = await serviceClient.from("products").select("id").eq("id", productId).single();
  if (!existingProduct) {
    return NextResponse.json({ success: false, error: Messages.adminProductNotFound }, { status: 404 });
  }

  const { error: updateError } = await serviceClient.from("products").update({
    name, slug, description, category, price, discount_price: discount_price ?? null,
    fabric: fabric ?? null, wash_care: wash_care ?? null, is_featured, is_active,
  }).eq("id", productId);

  if (updateError) {
    console.error("[admin-update-product]", updateError.message);
    return NextResponse.json({ success: false, error: Messages.adminUpdateProductError }, { status: 500 });
  }

  await serviceClient.from("product_images").delete().eq("product_id", productId);
  const validImages = images.filter((url: string) => url.trim()).map((url: string, idx: number) => ({
    product_id: productId, url: url.trim(), alt_text: name, position: idx,
  }));
  if (validImages.length > 0) {
    await serviceClient.from("product_images").insert(validImages);
  }

  const { data: existingVariants } = await serviceClient.from("product_variants").select("id").eq("product_id", productId);
  const existingIds = new Set((existingVariants ?? []).map((v: { id: string }) => v.id));
  const variantsWithId = variants.filter((v): v is typeof v & { id: string } => !!v.id);
  const incomingIds = new Set(variantsWithId.map((v) => v.id));
  const toAdd = variants.filter((v) => !v.id || !existingIds.has(v.id));
  const toUpdate = variantsWithId.filter((v) => existingIds.has(v.id));
  const toRemove = [...existingIds].filter((id: string) => !incomingIds.has(id));

  const addPayload = toAdd.filter((v: { size?: string | null; color?: string | null; sku?: string | null }) => v.size || v.color || v.sku).map((v: { size?: string | null; color?: string | null; color_hex?: string | null; sku?: string | null; stock: number }) => ({
    product_id: productId, size: v.size || null, color: v.color || null, color_hex: v.color_hex || null, sku: v.sku || null, stock: v.stock,
  }));
  if (addPayload.length > 0) {
    await serviceClient.from("product_variants").insert(addPayload);
  }

  for (const v of toUpdate) {
    await serviceClient.from("product_variants").update({
      size: v.size || null, color: v.color || null, color_hex: v.color_hex || null, sku: v.sku || null, stock: v.stock,
    }).eq("id", v.id);
  }

  for (const variantId of toRemove) {
    const { count: refCount } = await serviceClient.from("order_items").select("id", { count: "exact", head: true }).eq("variant_id", variantId);
    if (refCount && refCount > 0) {
      await serviceClient.from("product_variants").update({ is_active: false, stock: 0 }).eq("id", variantId);
    } else {
      await serviceClient.from("product_variants").delete().eq("id", variantId);
    }
  }

  return NextResponse.json({ success: true, data: { message: "Product updated" } });
}
