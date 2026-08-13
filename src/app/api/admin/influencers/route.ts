import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { requireAdmin } from "@/lib/api-utils";
import { z } from "zod";
import crypto from "crypto";

const reviewSchema = z.object({
  influencerId: z.string().uuid("Invalid influencer ID"),
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

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServiceClient();
  const { data: profiles, error } = await supabase
    .from("influencer_profiles")
    .select(
      `
      id, referral_code, status, social_handle, platform, followers, bio, notes,
      created_at, reviewed_at,
      customers ( id, full_name, email, phone )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin-list-influencers]", error.message);
    return NextResponse.json({ success: false, error: Messages.genericError }, { status: 500 });
  }

  const profileIds = (profiles ?? []).map((p: { id: string }) => p.id);

  const { data: earnings } = await supabase
    .from("influencer_earnings")
    .select("influencer_id, status, commission_amount, order_amount, created_at")
    .in("influencer_id", profileIds);

  const earningsByInfluencer = new Map<string, { total: number; pending: number; paid: number; orders: number }>();
  for (const row of earnings ?? []) {
    const current = earningsByInfluencer.get(row.influencer_id) ?? { total: 0, pending: 0, paid: 0, orders: 0 };
    if (row.status !== "cancelled") {
      current.total += row.commission_amount;
      current.orders += 1;
    }
    if (row.status === "pending") current.pending += row.commission_amount;
    if (row.status === "paid") current.paid += row.commission_amount;
    earningsByInfluencer.set(row.influencer_id, current);
  }

  const data = (profiles ?? []).map((p: { id: string }) => ({
    ...p,
    earnings: earningsByInfluencer.get(p.id) ?? { total: 0, pending: 0, paid: 0, orders: 0 },
  }));

  return NextResponse.json({ success: true, data });
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

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { influencerId, decision, notes } = parsed.data;

  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("influencer_profiles")
    .select("id, status, referral_code, customers(full_name)")
    .eq("id", influencerId)
    .single();

  if (!existing) {
    return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
  }

  if (existing.status !== "pending") {
    return NextResponse.json({ success: false, error: "Application already reviewed" }, { status: 400 });
  }

  if (decision === "rejected") {
    const { error } = await supabase
      .from("influencer_profiles")
      .update({
        status: "rejected",
        notes: notes ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", influencerId);

    if (error) {
      return NextResponse.json({ success: false, error: Messages.genericError }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: { message: "Application rejected." } });
  }

  // Approve → generate a referral code
  const fullName = (existing.customers as unknown as { full_name?: string } | null)?.full_name ?? "AANCHAL";
  let referralCode = existing.referral_code ?? generateReferralCode(fullName);

  // Ensure uniqueness
  const { data: clash } = await supabase
    .from("influencer_profiles")
    .select("id")
    .eq("referral_code", referralCode)
    .maybeSingle();

  if (clash) {
    referralCode = generateReferralCode(fullName);
  }

  const { error } = await supabase
    .from("influencer_profiles")
    .update({
      status: "approved",
      referral_code: referralCode,
      notes: notes ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", influencerId);

  if (error) {
    return NextResponse.json({ success: false, error: Messages.genericError }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: { message: "Application approved.", referral_code: referralCode },
  });
}
