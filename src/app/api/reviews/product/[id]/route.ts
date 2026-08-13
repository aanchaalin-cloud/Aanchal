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

  // Attach review images (if any) from review_images table
  try {
    const reviewList = (reviews ?? []) as Array<{ id: string }>;
    const reviewIds = reviewList.map((r) => r.id);
    if (reviewIds.length > 0) {
      const { data: images } = await supabase
        .from("review_images")
        .select("review_id, url")
        .in("review_id", reviewIds);

      const imagesByReview: Record<string, string[]> = {};
      (images ?? []).forEach((img: { review_id: string; url: string }) => {
        imagesByReview[img.review_id] = imagesByReview[img.review_id] ?? [];
        imagesByReview[img.review_id].push(img.url);
      });

      const enriched = reviewList.map((r) => ({ ...r, images: imagesByReview[r.id] ?? [] }));

      return NextResponse.json(
        { success: true, data: enriched },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
      );
    }
  } catch (err) {
    // If anything goes wrong attaching images, log and return reviews without images
    console.error("[get-product-reviews-attach-images]", err);
  }

  return NextResponse.json(
    { success: true, data: reviews },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
