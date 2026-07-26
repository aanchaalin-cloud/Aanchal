import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const rewardSubmissionSchema = z.object({
  order_id: z.string().uuid("Invalid order ID"),
  customer_name: z.string().min(2).max(100),
  customer_email: z.string().email().max(200),
  customer_phone: z.string().max(15).optional(),
  social_url: z.string().url("Please enter a valid URL").max(2000),
  platform: z.enum(["instagram", "youtube", "facebook", "other"]),
  review_title: z.string().max(200).optional(),
  review_body: z.string().min(20, "Review must be at least 20 characters").max(2000),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, rewardSubmissionSchema);
  if (data instanceof NextResponse) return data;

  const supabase = await createServiceClient();

  // Verify order exists and belongs to this email
  const { data: order } = await supabase
    .from("orders")
    .select("id, customer_email, payment_status")
    .eq("id", data.order_id)
    .eq("customer_email", data.customer_email)
    .single();

  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order not found or does not match your email." },
      { status: 404 }
    );
  }

  if (order.payment_status !== "paid") {
    return NextResponse.json(
      { success: false, error: "Only paid orders are eligible for rewards." },
      { status: 400 }
    );
  }

  // Check for duplicate submission (same order)
  const { data: existing } = await supabase
    .from("reward_submissions")
    .select("id")
    .eq("order_id", data.order_id)
    .single();

  if (existing) {
    return NextResponse.json(
      { success: false, error: "A reward submission already exists for this order." },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("reward_submissions").insert({
    order_id: data.order_id,
    customer_name: data.customer_name,
    customer_email: data.customer_email,
    customer_phone: data.customer_phone ?? null,
    social_url: data.social_url,
    platform: data.platform,
    review_title: data.review_title ?? null,
    review_body: data.review_body,
    status: "pending",
  });

  if (error) {
    console.error("[submit-reward]", error.message);
    return NextResponse.json(
      { success: false, error: Messages.genericError },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { message: "Your submission has been received! We will review it and get back to you." },
  });
}
