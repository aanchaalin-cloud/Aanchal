import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().min(1, "Label is required").max(30).default("Home"),
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  address_line1: z.string().min(3, "Address line 1 is required").max(200),
  address_line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
  country: z.string().min(2).max(100).default("India"),
  is_default: z.boolean().optional().default(false),
});

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });

  const service = await createServiceClient();
  const { data, error } = await service
    .from("customer_addresses")
    .select("*")
    .eq("customer_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: "Unable to load addresses." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });

  const data = await validateRequest(request, addressSchema);
  if (data instanceof NextResponse) return data;

  const service = await createServiceClient();

  const { data: existing } = await service
    .from("customer_addresses")
    .select("id")
    .eq("customer_id", user.id)
    .limit(1);

  const isDefault = data.is_default || (existing ?? []).length === 0;

  if (isDefault) {
    await service
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", user.id)
      .eq("is_default", true);
  }

  const { data: row, error } = await service
    .from("customer_addresses")
    .insert({
      customer_id: user.id,
      label: data.label,
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      address_line1: data.address_line1.trim(),
      address_line2: data.address_line2?.trim() || null,
      city: data.city.trim(),
      state: data.state.trim(),
      pincode: data.pincode.trim(),
      country: data.country.trim() || "India",
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: "Unable to save address." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: row });
}
