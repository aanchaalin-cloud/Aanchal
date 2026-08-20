import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServiceClient();

  // Fetch all approved reviews (featured first, then by date)
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("id, customer_name, rating, title, body, created_at")
    .eq("is_approved", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !reviews || reviews.length === 0) {
    return NextResponse.json(
      { success: error ? false : true, data: [] },
      { status: error ? 500 : 200 },
    );
  }

  const reviewIds = reviews.map((r) => r.id as string);
  let imagesByReview: Record<string, string[]> = {};
  const { data: images } = await supabase
    .from("review_images")
    .select("review_id, url")
    .in("review_id", reviewIds);

  imagesByReview = (images ?? []).reduce(
    (acc, img) => {
      (acc[img.review_id as string] ??= []).push(img.url as string);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const data = reviews.map((r) => ({
    id: r.id,
    name: r.customer_name,
    rating: r.rating,
    title: r.title,
    text: r.body,
    images: imagesByReview[r.id as string] ?? [],
  }));

  return NextResponse.json(
    { success: true, data },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
