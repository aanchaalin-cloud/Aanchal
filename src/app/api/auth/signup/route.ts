import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const signupSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(200),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  username: z
    .string()
    .regex(
      /^[a-z0-9_]{3,20}$/,
      "Username must be 3-20 characters: lowercase letters, numbers, underscores"
    )
    .optional()
    .or(z.literal("")),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, signupSchema);
  if (data instanceof NextResponse) return data;

  const supabase = await createServiceClient();

  const existing = await supabase
    .from("customers")
    .select("id")
    .eq("email", data.email.toLowerCase())
    .maybeSingle();

  if (existing.data) {
    // Keep the message generic — revealing that an email is registered leaks
    // account existence and can be abused for enumeration / signup squatting.
    return NextResponse.json(
      { success: false, error: "Unable to create an account with this email." },
      { status: 409 },
    );
  }

  const username = data.username ? data.username.toLowerCase() : null;

  if (username) {
    const { data: usernameTaken } = await supabase
      .from("customers")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (usernameTaken) {
      return NextResponse.json(
        { success: false, error: "This username is already taken." },
        { status: 409 },
      );
    }
  }

  const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
    email: data.email.toLowerCase(),
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.full_name,
      phone: data.phone || null,
      ...(username ? { username } : {}),
    },
  });

  if (createError || !authUser.user) {
    console.error("[signup] createUser failed:", createError?.message);
    return NextResponse.json(
      { success: false, error: "Unable to create an account with this email." },
      { status: 400 },
    );
  }

  const { error: profileError } = await supabase.from("customers").insert({
    id: authUser.user.id,
    full_name: data.full_name,
    email: data.email.toLowerCase(),
    phone: data.phone || null,
    username,
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json(
      { success: false, error: "Unable to create your profile. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: { userId: authUser.user.id } });
}
