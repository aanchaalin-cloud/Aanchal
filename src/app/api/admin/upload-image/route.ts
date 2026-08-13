import { NextRequest, NextResponse } from "next/server";
import { Messages } from "@/lib/messages";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/api-utils";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const productId = formData.get("productId");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, error: "Image file is required" }, { status: 400 });
  }
  if (!productId || typeof productId !== "string" || !/^[0-9a-f-]{36}$/i.test(productId)) {
    return NextResponse.json({ success: false, error: "Valid product ID is required" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: `Invalid file type "${file.type}". Only JPEG, PNG, and WebP allowed.` }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ success: false, error: `File size exceeds 5 MB limit.` }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return NextResponse.json({ success: false, error: `Invalid file extension. Allowed: jpg, jpeg, png, webp.` }, { status: 400 });
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").toLowerCase();
  const storagePath = `products/${productId}/${timestamp}-${safeName}`;

  const serviceClient = await createServiceClient();

  const { data: product, error: productError } = await serviceClient
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) {
    return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
  }

  const { error: uploadError } = await serviceClient.storage.from("product-images").upload(storagePath, file, {
    contentType: file.type, upsert: false,
  });

  if (uploadError) {
    console.error("[upload-image]", uploadError.message);
    return NextResponse.json({ success: false, error: Messages.adminImageUploadError }, { status: 500 });
  }

  const { data: urlData } = serviceClient.storage.from("product-images").getPublicUrl(storagePath);
  if (!urlData?.publicUrl) {
    return NextResponse.json({ success: false, error: Messages.adminImageUploadError }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { url: urlData.publicUrl } });
}
