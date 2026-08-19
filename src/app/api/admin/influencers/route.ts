import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { requireAdmin, checkSameOrigin } from "@/lib/api-utils";
import { z } from "zod";
import crypto from "crypto";

const reviewSchema = z.object({
  applicationId: z.string().uuid("Invalid application ID"),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().max(500).optional(),
});

function generateReferralCode(fullName: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  let rand = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 4; i++) {
    rand += chars[bytes[i] % chars.length];
  }
  return `AANCHAL${initials}${rand}`;
}

function generatePassword(): string {
  return crypto.randomBytes(8).toString("hex");
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServiceClient();

  const { data: applications, error } = await supabase
    .from("influencer_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin-influencers]", error.message);
    return NextResponse.json({ success: false, error: Messages.genericError }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: applications ?? [] });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const csrf = checkSameOrigin(request);
  if (csrf) return csrf;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { applicationId, decision } = parsed.data;
  const supabase = await createServiceClient();

  const { data: app, error: fetchErr } = await supabase
    .from("influencer_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (fetchErr || !app) {
    return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
  }

  if (app.status !== "pending") {
    return NextResponse.json({ success: false, error: "Application already reviewed" }, { status: 400 });
  }

  if (decision === "rejected") {
    const { error } = await supabase
      .from("influencer_applications")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", applicationId);

    if (error) {
      return NextResponse.json({ success: false, error: Messages.genericError }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: { message: "Application rejected." } });
  }

  // ── Approve: create auth user → customer → influencer_profile ──

  const tempPassword = generatePassword();

  const { data: newUser, error: createUserErr } = await supabase.auth.admin.createUser({
    email: app.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: app.full_name, phone: app.phone },
  });

  if (createUserErr) {
    console.error("[admin-influencers] Create user error:", createUserErr.message);
    return NextResponse.json(
      { success: false, error: "Failed to create user account. " + createUserErr.message },
      { status: 500 }
    );
  }

  const userId = newUser.user.id;

  const { error: custErr } = await supabase.from("customers").upsert({
    id: userId,
    full_name: app.full_name,
    email: app.email,
    phone: app.phone,
  }, { onConflict: "id" });

  if (custErr) {
    console.warn("[admin-influencers] Customer upsert failed:", custErr.message);
  }

  let referralCode = generateReferralCode(app.full_name);
  if (app.desired_promo_code) {
    const normalized = app.desired_promo_code.trim().toUpperCase();
    const { data: clash } = await supabase
      .from("influencer_profiles")
      .select("id")
      .eq("referral_code", normalized)
      .maybeSingle();
    if (!clash) referralCode = normalized;
  }

  const { data: codeClash } = await supabase
    .from("influencer_profiles")
    .select("id")
    .eq("referral_code", referralCode)
    .maybeSingle();
  if (codeClash) referralCode = generateReferralCode(app.full_name);

  const { error: profileErr } = await supabase.from("influencer_profiles").upsert({
    id: userId,
    status: "approved",
    social_handle: app.social_handle,
    social_link: app.social_link,
    platform: app.platform,
    followers: app.followers,
    bio: app.bio,
    niche: app.niche,
    desired_promo_code: app.desired_promo_code,
    referral_code: referralCode,
    reviewed_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (profileErr) {
    console.error("[admin-influencers] Profile upsert error:", profileErr.message);
    return NextResponse.json(
      { success: false, error: "Failed to create influencer profile." },
      { status: 500 }
    );
  }

  await supabase
    .from("influencer_applications")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  return NextResponse.json({
    success: true,
    data: {
      message: "Application approved.",
      referral_code: referralCode,
      email: app.email,
      temp_password: tempPassword,
    },
  });
}
