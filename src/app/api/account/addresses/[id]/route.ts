import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1, "Label is required").max(30),
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  address_line1: z.string().min(3, "Address line 1 is required").max(200),
  address_line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
  country: z.string().min(2).max(100),
  is_default: z.boolean().optional().default(false),
});

// Route params must be a valid UUID before being used in DB queries.
function parseAddressId(raw: string): string | NextResponse {
  const parsed = z.string().uuid("Invalid address ID").safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid address ID." }, { status: 400 });
  }
  return parsed.data;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });

  const addressId = parseAddressId(params.id);
  if (addressId instanceof NextResponse) return addressId;

  const data = await validateRequest(request, updateSchema);
  if (data instanceof NextResponse) return data;

  const service = await createServiceClient();

  const { data: existing } = await service
    .from("customer_addresses")
    .select("id")
    .eq("id", addressId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ success: false, error: "Address not found." }, { status: 404 });
  }

  if (data.is_default) {
    await service
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", user.id)
      .eq("is_default", true)
      .neq("id", addressId);
  }

  const { data: row, error } = await service
    .from("customer_addresses")
    .update({
      label: data.label.trim(),
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      address_line1: data.address_line1.trim(),
      address_line2: data.address_line2?.trim() || null,
      city: data.city.trim(),
      state: data.state.trim(),
      pincode: data.pincode.trim(),
      country: data.country.trim(),
      is_default: data.is_default,
    })
    .eq("id", addressId)
    .eq("customer_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: "Unable to update address." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: row });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });

  const addressId = parseAddressId(params.id);
  if (addressId instanceof NextResponse) return addressId;

  const service = await createServiceClient();

  const { data: existing } = await service
    .from("customer_addresses")
    .select("id, is_default")
    .eq("id", addressId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ success: false, error: "Address not found." }, { status: 404 });
  }

  const { error } = await service
    .from("customer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", user.id);

  if (error) {
    return NextResponse.json({ success: false, error: "Unable to delete address." }, { status: 500 });
  }

  if (existing.is_default) {
    const { data: next } = await service
      .from("customer_addresses")
      .select("id")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (next) {
      await service
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", next.id);
    }
  }

  return NextResponse.json({ success: true });
}
