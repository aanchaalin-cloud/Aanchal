import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const updateSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
});

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });

  const { data } = await supabase
    .from("customers")
    .select("id, full_name, email, phone, created_at")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ success: true, data });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });

  const data = await validateRequest(request, updateSchema);
  if (data instanceof NextResponse) return data;

  const service = await createServiceClient();

  const { data: existing } = await service
    .from("customers")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const payload = {
    id: user.id,
    full_name: data.full_name.trim(),
    email: (user.email ?? "").toLowerCase(),
    phone: data.phone ? data.phone.trim() : null,
  };

  const { error } = existing
    ? await service.from("customers").update(payload).eq("id", user.id)
    : await service.from("customers").insert(payload);

  if (error) {
    return NextResponse.json({ success: false, error: "Unable to update profile. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: payload });
}
