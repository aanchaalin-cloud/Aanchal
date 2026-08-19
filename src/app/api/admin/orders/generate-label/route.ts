import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { requireAdmin, validateRequest } from "@/lib/api-utils";
import { z } from "zod";
import { getShippingProvider } from "@/lib/shipping";

const generateLabelSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
});

/**
 * POST /api/admin/orders/generate-label
 *
 * Generates a shipping label for an order that already has a courier
 * shipment. Returns the label URL (hosted by the provider). Requires the
 * provider's numeric shipment ID, so it only works for orders created via
 * the Shiprocket flow.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, generateLabelSchema, true);
  if (data instanceof NextResponse) return data;

  const provider = getShippingProvider();
  if (!provider?.generateLabel) {
    return NextResponse.json(
      { success: false, error: "Shipping provider does not support label generation." },
      { status: 503 }
    );
  }

  const supabase = await createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, shiprocket_shipment_id, tracking_id")
    .eq("id", data.orderId)
    .single();

  if (!order) {
    return NextResponse.json({ success: false, error: Messages.adminOrderNotFound }, { status: 404 });
  }

  if (!order.shiprocket_shipment_id) {
    return NextResponse.json(
      { success: false, error: "This order has no courier shipment. Create a shipment first." },
      { status: 400 }
    );
  }

  try {
    const labelUrl = await provider.generateLabel(order.shiprocket_shipment_id);
    if (!labelUrl) {
      return NextResponse.json(
        { success: false, error: "The courier could not generate a label yet. Please try again shortly." },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true, data: { labelUrl } });
  } catch (e) {
    console.error("[generate-label]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json(
      { success: false, error: "We couldn't generate the label with the courier. Please try again." },
      { status: 502 }
    );
  }
}
