import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { requireAdmin, validateRequest } from "@/lib/api-utils";

const deleteImageSchema = z.object({ imageId: z.string().uuid("Invalid image ID") });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, deleteImageSchema, true);
  if (data instanceof NextResponse) return data;

  const serviceClient = await createServiceClient();
  const { data: imageRecord } = await serviceClient.from("product_images").select("id, url").eq("id", data.imageId).single();

  if (!imageRecord) {
    return NextResponse.json({ success: false, error: Messages.adminImageNotFound }, { status: 404 });
  }

  const { error: deleteError } = await serviceClient.from("product_images").delete().eq("id", data.imageId);
  if (deleteError) {
    console.error("[delete-image]", deleteError.message);
    return NextResponse.json({ success: false, error: Messages.adminImageDeleteError }, { status: 500 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && imageRecord.url?.includes("product-images")) {
      const urlObj = new URL(imageRecord.url);
      const pathParts = urlObj.pathname.split("/product-images/");
      if (pathParts.length === 2) {
        const storagePath = decodeURIComponent(pathParts[1]);
        await serviceClient.storage.from("product-images").remove([storagePath]);
      }
    }
  } catch {
    // Storage cleanup is best-effort
  }

  return NextResponse.json({ success: true, data: { message: "Image removed" } });
}
