import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { requireAdmin, validateRequest } from "@/lib/api-utils";
import { z } from "zod";
import { getShippingProvider } from "@/lib/shipping";
import { sendOrderEvent } from "@/lib/notifications/order-events";

const createShipmentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
});

/**
 * POST /api/admin/orders/create-shipment
 *
 * Creates a courier shipment for an order via the configured shipping
 * provider (Shiprocket), then persists the AWB/tracking details and marks
 * the order as shipped. Idempotent — never creates a duplicate shipment
 * for an order that already has one.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, createShipmentSchema, true);
  if (data instanceof NextResponse) return data;

  const provider = getShippingProvider();
  if (!provider) {
    return NextResponse.json(
      { success: false, error: "Shipping is not configured. Set SHIPPING_PROVIDER and its credentials." },
      { status: 503 }
    );
  }

  const supabase = await createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, order_status, payment_status, customer_name, customer_email, customer_phone, address_line1, address_line2, city, state, pincode, total_amount, cod_amount, shiprocket_shipment_id, tracking_id, order_items(product_name, quantity)"
    )
    .eq("id", data.orderId)
    .single();

  if (!order) {
    return NextResponse.json({ success: false, error: Messages.adminOrderNotFound }, { status: 404 });
  }

  // Do not hand unpaid / abandoned orders to the courier.
  if (!["paid", "partially_paid"].includes(order.payment_status)) {
    return NextResponse.json(
      { success: false, error: "This order's payment is not confirmed. Confirm payment before shipping." },
      { status: 400 }
    );
  }

  // Idempotency — an existing shipment (AWB or Shiprocket id) blocks duplicates.
  if (order.shiprocket_shipment_id || order.tracking_id) {
    return NextResponse.json({
      success: true,
      data: {
        message: "This order already has a shipment.",
        trackingId: order.tracking_id,
        trackingUrl: undefined,
      },
    });
  }

  const items = (order.order_items as Array<{ product_name: string; quantity: number }>) ?? [];
  const weightGrams = items.reduce((total, item) => total + item.quantity * 500, 500);

  try {
    const shipment = await provider.createShipment({
      orderId: order.id,
      orderNumber: order.order_number ?? `AANCHAL-${order.id.slice(0, 8).toUpperCase()}`,
      recipientName: order.customer_name,
      recipientPhone: order.customer_phone ?? "",
      addressLine1: order.address_line1,
      addressLine2: order.address_line2 ?? undefined,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      weightGrams,
      codAmount: Number(order.cod_amount),
      declaredValue: Math.round(Number(order.total_amount)),
      items: items.map((item) => ({ name: item.product_name, quantity: item.quantity })),
    });

    const updatePayload: Record<string, unknown> = {
      tracking_id: shipment.trackingId,
      shipping_provider: shipment.provider,
      order_status: "shipped",
      shipped_at: new Date().toISOString(),
    };
    if (shipment.trackingUrl) updatePayload.tracking_url = shipment.trackingUrl;
    // shiprocket_shipment_id stores the provider's numeric shipment ID (needed
    // for cancel / label); tracking_id holds the AWB used for tracking.
    if (shipment.providerShipmentId) updatePayload.shiprocket_shipment_id = shipment.providerShipmentId;

    const { error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", order.id);

    if (updateError) {
      console.error("[create-shipment] update failed:", updateError.message);
      return NextResponse.json({ success: false, error: Messages.adminUpdateOrderError }, { status: 500 });
    }

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      old_status: order.order_status,
      new_status: "shipped",
      changed_by: "admin",
      notes: `Shipment created via ${shipment.provider} (AWB: ${shipment.trackingId})`,
    });

    // Notify the customer — idempotent (one shipped email per order).
    await sendOrderEvent({
      type: "order_shipped",
      orderId: order.id,
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      trackingId: shipment.trackingId,
      trackingUrl: shipment.trackingUrl,
      shippingProvider: shipment.provider,
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Shipment created (${shipment.trackingId})`,
        trackingId: shipment.trackingId,
        trackingUrl: shipment.trackingUrl,
      },
    });
  } catch (e) {
    console.error("[create-shipment]", e instanceof Error ? e.message : "unknown");
    return NextResponse.json(
      {
        success: false,
        error: "We couldn't create the shipment with the courier. Please check the shipping configuration or try again.",
      },
      { status: 502 }
    );
  }
}
