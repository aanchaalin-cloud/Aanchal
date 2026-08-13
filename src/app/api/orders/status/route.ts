import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const statusSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  email: z.string().email("Invalid email address").max(200),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const data = await validateRequest(request, statusSchema);
  if (data instanceof NextResponse) return data;

  const supabase = await createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      `
      id, order_number, customer_name, customer_email, payment_method, payment_status, order_status,
      subtotal, shipping_fee, total_amount, discount_amount, prepaid_amount, cod_amount,
      address_line1, address_line2, city, state, pincode,
      created_at, shipped_at, delivered_at, tracking_id, tracking_url, shipping_provider,
      order_items (
        product_id, product_name, product_slug, image_url, size, color, unit_price, quantity, line_total
      ),
      order_status_history (
        old_status, new_status, changed_by, created_at
      )
    `
    )
    .eq("id", data.orderId)
    .eq("customer_email", data.email.toLowerCase())
    .maybeSingle();

  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order not found. Please check the order ID and email." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: order });
}
