import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const applySchema = z.object({
  social_handle: z.string().min(1, "Social media handle is required").max(100),
  platform: z.string().min(1, "Platform is required").max(50),
  followers: z.string().max(50).optional().or(z.literal("")),
  bio: z.string().min(20, "Tell us a little more about yourself (min 20 characters)").max(1000),
  niche: z.string().max(100).optional().or(z.literal("")),
  desired_promo_code: z
    .string()
    .max(50)
    .optional()
    .or(z.literal("")),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await validateRequest(request, applySchema);
  if (body instanceof NextResponse) return body;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Please sign in to apply for the influencer program." },
      { status: 401 }
    );
  }

  const service = await createServiceClient();

  // Ensure a customer profile exists (e.g. legacy accounts)
  const { data: existingCustomer } = await service
    .from("customers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingCustomer) {
    await service.from("customers").upsert({
      id: user.id,
      full_name: (user.user_metadata?.full_name as string) ?? "Customer",
      email: user.email ?? "",
      phone: (user.user_metadata?.phone as string) ?? null,
    });
  }

  const { data: existingApp } = await service
    .from("influencer_profiles")
    .select("id, status")
    .eq("id", user.id)
    .maybeSingle();

  if (existingApp && existingApp.status === "pending") {
    return NextResponse.json(
      { success: false, error: "You have already submitted an application. We'll review it within 2-3 business days." },
      { status: 400 }
    );
  }

  const { error } = await service.from("influencer_profiles").upsert(
    {
      id: user.id,
      status: "pending",
      social_handle: body.social_handle,
      platform: body.platform,
      followers: body.followers || null,
      bio: body.bio,
      niche: body.niche || null,
      desired_promo_code: body.desired_promo_code || null,
      notes: null,
    },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json(
      { success: false, error: "Unable to submit your application. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
  });
}
