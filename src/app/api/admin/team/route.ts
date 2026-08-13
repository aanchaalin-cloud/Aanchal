import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/api-utils";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const addSchema = z.object({
  email: z.string().email("Invalid email address").max(200),
  role: z.enum(["admin", "superadmin"]).default("admin"),
});

export async function GET(): Promise<NextResponse> {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: "Unable to load team." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, addSchema, true);
  if (data instanceof NextResponse) return data;

  const email = data.email.toLowerCase().trim();
  const supabase = await createServiceClient();

  const { data: existing } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ success: false, error: "This user is already an admin." }, { status: 409 });
  }

  const { data: authUser } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = (authUser?.users ?? []).find(
    (u) => (u.email ?? "").toLowerCase() === email
  );

  if (!user) {
    return NextResponse.json(
      { success: false, error: "No account found for this email. Ask them to sign up first." },
      { status: 404 }
    );
  }

  const { error } = await supabase.from("admin_users").insert({
    id: user.id,
    email,
    role: data.role,
  });

  if (error) {
    return NextResponse.json({ success: false, error: "Unable to add admin." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { email, role: data.role } });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await requireSuperAdmin();
  if (auth instanceof NextResponse) return auth;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ success: false, error: "Admin ID is required" }, { status: 400 });
  }

  if (user && body.id === user.id) {
    return NextResponse.json({ success: false, error: "You cannot remove yourself." }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service.from("admin_users").delete().eq("id", body.id);

  if (error) {
    return NextResponse.json({ success: false, error: "Unable to remove admin." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
