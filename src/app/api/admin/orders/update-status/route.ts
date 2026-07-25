import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { requireAdmin, validateRequest } from "@/lib/api-utils";
import { orderStatusSchema } from "@/lib/validations";
import { z } from "zod";

const updateStatusSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  order_status: orderStatusSchema.shape.order_status,
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, updateStatusSchema, true);
  if (data instanceof NextResponse) return data;

  const serviceClient = await createServiceClient();
  const { data: order } = await serviceClient.from("orders").select("id, order_status").eq("id", data.orderId).single();

  if (!order) {
    return NextResponse.json({ success: false, error: Messages.adminOrderNotFound }, { status: 404 });
  }

  const { error: updateError } = await serviceClient.from("orders").update({ order_status: data.order_status }).eq("id", data.orderId);

  if (updateError) {
    console.error("[update-order-status]", updateError.message);
    return NextResponse.json({ success: false, error: Messages.adminUpdateOrderError }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { message: "Order status updated" } });
}
