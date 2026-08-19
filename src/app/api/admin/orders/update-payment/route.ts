import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { requireAdmin, validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const updatePaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  payment_status: z.enum(["pending", "completed", "failed", "refunded"]),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, updatePaymentSchema, true);
  if (data instanceof NextResponse) return data;

  const serviceClient = await createServiceClient();
  const { data: order } = await serviceClient
    .from("orders")
    .select("id, order_number, payment_status, payment_method, customer_name, customer_email")
    .eq("id", data.orderId)
    .single();

  if (!order) {
    return NextResponse.json(
      { success: false, error: Messages.adminOrderNotFound },
      { status: 404 }
    );
  }

  if (order.payment_status === data.payment_status) {
    return NextResponse.json({
      success: true,
      data: { message: `Payment already ${data.payment_status}` },
    });
  }

  const { error: updateError } = await serviceClient
    .from("orders")
    .update({ payment_status: data.payment_status })
    .eq("id", data.orderId);

  if (updateError) {
    console.error("[update-payment]", updateError.message);
    return NextResponse.json(
      { success: false, error: Messages.adminUpdateOrderError },
      { status: 500 }
    );
  }

  await serviceClient.from("order_status_history").insert({
    order_id: data.orderId,
    old_status: order.payment_status,
    new_status: data.payment_status,
    changed_by: "admin",
    notes: data.notes || `Payment status changed to ${data.payment_status} by admin`,
  });

  return NextResponse.json({
    success: true,
    data: {
      message: `Payment status updated to ${data.payment_status}`,
      orderId: order.id,
      orderNumber: order.order_number,
    },
  });
}
