import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { requireAdmin, checkSameOrigin } from "@/lib/api-utils";
import { z } from "zod";
import crypto from "crypto";

const approveSchema = z.object({
  submissionId: z.string().uuid("Invalid submission ID"),
  voucherValue: z.number().int().min(100).max(500),
});

const rejectSchema = z.object({
  submissionId: z.string().uuid("Invalid submission ID"),
  rejectionReason: z.string().max(500).optional(),
});

function generateVoucherCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(10);
  let code = "AANCHAL-";
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServiceClient();
  const { data: submissions, error } = await supabase
    .from("reward_submissions")
    .select("*, reward_vouchers(id, code, value, is_used, expires_at)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin-list-rewards]", error.message);
    return NextResponse.json(
      { success: false, error: Messages.genericError },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: submissions });
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

  // Check if this is an approval
  const approveParsed = approveSchema.safeParse(body);
  const rejectParsed = rejectSchema.safeParse(body);

  const supabase = await createServiceClient();

  if (approveParsed.success) {
    const { submissionId, voucherValue } = approveParsed.data;

    // Fetch submission
    const { data: submission } = await supabase
      .from("reward_submissions")
      .select("id, customer_email, status")
      .eq("id", submissionId)
      .single();

    if (!submission) {
      return NextResponse.json({ success: false, error: "Submission not found" }, { status: 404 });
    }

    if (submission.status !== "pending") {
      return NextResponse.json({ success: false, error: "Submission already reviewed" }, { status: 400 });
    }

    // Update submission status
    await supabase
      .from("reward_submissions")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", submissionId);

    // Create voucher
    const code = generateVoucherCode();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 3);

    await supabase.from("reward_vouchers").insert({
      submission_id: submissionId,
      code,
      customer_email: submission.customer_email,
      value: voucherValue,
      is_used: false,
      expires_at: expiresAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: { message: "Submission approved. Voucher created.", code, value: voucherValue },
    });
  }

  if (rejectParsed.success) {
    const { submissionId, rejectionReason } = rejectParsed.data;

    const { error } = await supabase
      .from("reward_submissions")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    if (error) {
      console.error("[admin-reject-reward]", error.message);
      return NextResponse.json({ success: false, error: Messages.genericError }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { message: "Submission rejected." } });
  }

  return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
}
