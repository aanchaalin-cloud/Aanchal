import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { reviewSchema } from "@/lib/validations";
import { Messages } from "@/lib/messages";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_IMAGES = 3;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get("content-type") || "";

  let parsedData: unknown = null;
  const files: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    // Parse multipart form (files + fields)
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid form data" }, { status: 400 });
    }

    parsedData = {
      product_id: formData.get("product_id")?.toString() ?? undefined,
      customer_name: formData.get("customer_name")?.toString() ?? undefined,
      customer_email: formData.get("customer_email")?.toString() ?? undefined,
      rating: formData.get("rating") ? Number(formData.get("rating")) : undefined,
      title: formData.get("title")?.toString() ?? undefined,
      body: formData.get("body")?.toString() ?? undefined,
    };

    const imageEntries = formData.getAll("images");
    for (const f of imageEntries) {
      if (f instanceof File) files.push(f);
    }
  } else {
    // Expect JSON payload
    try {
      parsedData = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }
  }

  // Validate input
  const validation = reviewSchema.safeParse(parsedData);
  if (!validation.success) {
    return NextResponse.json({ success: false, error: validation.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
  }
  const data = validation.data;

  // Basic files validation
  if (files.length > MAX_IMAGES) {
    return NextResponse.json({ success: false, error: `A maximum of ${MAX_IMAGES} images is allowed.` }, { status: 400 });
  }
  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: `Invalid file type "${file.type}". Only JPEG, PNG, and WebP allowed.` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)} MB limit.` }, { status: 400 });
    }
  }

  const supabase = await createServiceClient();

  // Reviews may be submitted with any email or none at all. A signed-in user's
  // verified email always takes precedence so verified-purchase badges work.
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  const customerEmail: string | null =
    user?.email?.toLowerCase() ||
    (data.customer_email ? data.customer_email.toLowerCase() : null);

  // Verify product exists
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", data.product_id)
    .eq("is_active", true)
    .single();

  if (!product) {
    return NextResponse.json(
      { success: false, error: Messages.productUnavailable },
      { status: 404 }
    );
  }

  // Check for duplicate review (same email + product). Anonymous reviews
  // (no email) bypass this check.
  if (customerEmail) {
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("product_id", data.product_id)
      .eq("customer_email", customerEmail)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: "You have already reviewed this product." },
        { status: 409 }
      );
    }
  }

  // Check if verified purchase
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("order_id")
    .eq("product_id", data.product_id)
    .limit(20);

  let isVerifiedPurchase = false;
  if (customerEmail && orderItems && orderItems.length > 0) {
    const orderIds = [...new Set(orderItems.map((item) => item.order_id))];
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .in("id", orderIds)
      .eq("customer_email", customerEmail)
      .in("payment_status", ["paid", "partially_paid"])
      .not("order_status", "in", '("cancelled","returned","refunded")')
      .limit(1);

    isVerifiedPurchase = (orders?.length ?? 0) > 0;
  }

  // Insert review and get its id
  const { data: inserted, error: insertError } = await supabase
    .from("reviews")
    .insert({
      product_id: data.product_id,
      customer_name: data.customer_name,
      customer_email: customerEmail,
      rating: data.rating,
      title: data.title ?? null,
      body: data.body,
      is_verified_purchase: isVerifiedPurchase,
      // Require moderation: reviews are inserted as not approved and must be approved by admin
      is_approved: false,
      is_featured: false,
    })
    .select("id");

  if (insertError || !inserted || inserted.length === 0) {
    console.error("[submit-review]", insertError?.message);
    return NextResponse.json({ success: false, error: Messages.genericError }, { status: 500 });
  }

  const reviewId = inserted[0].id as string;
  const uploadedUrls: string[] = [];

  if (files.length > 0) {
    // upload files to Supabase Storage under review-images bucket
    for (const file of files) {
      try {
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").toLowerCase();
        const storagePath = `reviews/${data.product_id}/${reviewId}/${timestamp}-${safeName}`;

        const { error: uploadError } = await supabase.storage.from("review-images").upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

        if (uploadError) {
          console.error("[upload-review-image]", uploadError.message);
          continue;
        }

        const { data: urlData } = supabase.storage.from("review-images").getPublicUrl(storagePath);
        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      } catch (err) {
        console.error("[upload-review-image]", err);
      }
    }

    // Persist image URLs to review_images table. If this table doesn't exist,
    // log and continue — do not block the review submission.
    if (uploadedUrls.length > 0) {
      try {
        const imageRows = uploadedUrls.map((url) => ({ review_id: reviewId, url }));
        const { error: imageInsertError } = await supabase.from("review_images").insert(imageRows);
        if (imageInsertError) {
          console.error("[insert-review-images]", imageInsertError.message);
        }
      } catch (err) {
        console.error("[insert-review-images]", err);
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: { message: Messages.reviewSubmitted, images: uploadedUrls },
  });
}
