import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { requireAdmin } from "@/lib/api-utils";
import { z } from "zod";

const updateReviewSchema = z.object({
  reviewId: z.string().uuid("Invalid review ID"),
  is_approved: z.boolean(),
  is_featured: z.boolean().optional(),
});

const deleteReviewSchema = z.object({
  reviewId: z.string().uuid("Invalid review ID"),
});

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServiceClient();
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*, products(name, slug)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin-list-reviews]", error.message);
    return NextResponse.json(
      { success: false, error: Messages.genericError },
      { status: 500 }
    );
  }

  // attach images where possible
  try {
    const reviewList = (reviews ?? []) as Array<{ id: string } & Record<string, unknown>>;
    const ids = reviewList.map((r) => r.id);
    if (ids.length > 0) {
      const { data: images } = await supabase.from("review_images").select("review_id, url").in("review_id", ids);
      const byReview: Record<string, string[]> = {};
      (images ?? []).forEach((img: { review_id: string; url: string }) => {
        byReview[img.review_id] = byReview[img.review_id] ?? [];
        byReview[img.review_id].push(img.url);
      });
      const enriched = reviewList.map((r) => ({ ...(r as Record<string, unknown>), images: byReview[r.id] ?? [] }));
      return NextResponse.json({ success: true, data: enriched });
    }
  } catch (err) {
    console.error("[admin-attach-review-images]", err);
  }

  return NextResponse.json({ success: true, data: reviews });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  const updatePayload: Record<string, unknown> = {
    is_approved: parsed.data.is_approved,
  };
  if (parsed.data.is_featured !== undefined) {
    updatePayload.is_featured = parsed.data.is_featured;
  }

  const { error } = await supabase
    .from("reviews")
    .update(updatePayload)
    .eq("id", parsed.data.reviewId);

  if (error) {
    console.error("[admin-update-review]", error.message);
    return NextResponse.json(
      { success: false, error: Messages.genericError },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: { message: "Review updated" } });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = deleteReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", parsed.data.reviewId);

  if (error) {
    console.error("[admin-delete-review]", error.message);
    return NextResponse.json(
      { success: false, error: Messages.genericError },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: { message: "Review deleted" } });
}
