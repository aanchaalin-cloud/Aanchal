import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const rewardSubmissionSchema = z.object({
  order_number: z.string().min(3).max(20),
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

  // When logged in, bind the submission to the session user instead of trusting
  // the client-supplied email. Guests (e.g. COD orders) still verify by email.
  let customerEmail = data.customer_email.toLowerCase();
  const userSupabase = await createClient();
  const { data: { user } } = await userSupabase.auth.getUser();
  if (user?.email) {
    customerEmail = user.email.toLowerCase();
  }

  // Verify order exists and belongs to this email
  const { data: order } = await supabase
    .from("orders")
    .select("id, customer_email, payment_status")
    .eq("order_number", data.order_number.trim().toUpperCase())
    .eq("customer_email", customerEmail)
    .maybeSingle();

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
    .eq("order_id", order.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { success: false, error: "A reward submission already exists for this order." },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("reward_submissions").insert({
    order_id: order.id,
    customer_name: data.customer_name,
    customer_email: customerEmail,
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
