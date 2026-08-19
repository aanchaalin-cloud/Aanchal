import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";

const usernameLoginSchema = z.object({
  identifier: z.string().min(1, "Username is required").max(100),
  password: z.string().min(1, "Password is required").max(100),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, usernameLoginSchema);
  if (data instanceof NextResponse) return data;

  const identifier = data.identifier.trim();
  if (identifier.includes("@")) {
    // Email sign-in goes through the browser Supabase client on the login
    // page — this route only resolves usernames.
    return NextResponse.json(
      { success: false, error: "Enter your username, not your email." },
      { status: 400 },
    );
  }

  const service = await createServiceClient();
  const { data: customer } = await service
    .from("customers")
    .select("email")
    .eq("username", identifier.toLowerCase())
    .maybeSingle();

  // Generic message — never reveal whether a username exists (enumeration).
  if (!customer?.email) {
    return NextResponse.json(
      { success: false, error: "Invalid username or password." },
      { status: 401 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: customer.email,
    password: data.password,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: "Invalid username or password." },
      { status: 401 },
    );
  }

  return NextResponse.json({ success: true });
}