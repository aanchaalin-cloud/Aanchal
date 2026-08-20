import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { Messages } from "@/lib/messages";
import { requireAdmin, validateRequest } from "@/lib/api-utils";
import { z } from "zod";
import { safeUrl } from "@/lib/validations";
import { createInfluencerEarnings, cancelInfluencerEarnings } from "@/lib/orders/influencer-earnings";
import { sendOrderEvent } from "@/lib/notifications/order-events";
import { getShippingProvider } from "@/lib/shipping";

const ORDER_STATUS_FLOW: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_production", "shipped", "cancelled"],
  in_production: ["ready_to_ship", "shipped", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: ["return_requested"],
  cancelled: ["refunded"],
  return_requested: ["returned", "refunded"],
  returned: ["refunded"],
  refunded: [],
};

const updateStatusSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  order_status: z.enum([
    "pending", "confirmed", "in_production", "ready_to_ship",
    "shipped", "out_for_delivery", "delivered",
    "cancelled", "return_requested", "returned", "refunded",
  ]),
  notes: z.string().max(500).optional(),
  tracking_id: z.string().max(200).optional(),
  tracking_url: safeUrl.optional(),
  shipping_provider: z.string().max(100).optional(),
  estimated_delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  packaging_status: z.enum(["pending", "packed", "ready_for_pickup"]).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const data = await validateRequest(request, updateStatusSchema, true);
  if (data instanceof NextResponse) return data;

  const serviceClient = await createServiceClient();
  const { data: order } = await serviceClient
    .from("orders")
    .select("id, order_number, order_status, customer_name, customer_email, customer_phone, payment_method, payment_status, shiprocket_shipment_id")
    .eq("id", data.orderId)
    .single();

  if (!order) {
    return NextResponse.json(
      { success: false, error: Messages.adminOrderNotFound },
      { status: 404 }
    );
  }

  const oldStatus = order.order_status;
  const newStatus = data.order_status;

  const allowedNext = ORDER_STATUS_FLOW[oldStatus] ?? [];
  if (!allowedNext.includes(newStatus)) {
    return NextResponse.json(
      { success: false, error: `Cannot transition from "${oldStatus}" to "${newStatus}". Allowed: ${allowedNext.join(", ") || "none"}.` },
      { status: 400 }
    );
  }

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    order_status: newStatus,
  };

  if (data.tracking_id) updatePayload.tracking_id = data.tracking_id;
  if (data.tracking_url) updatePayload.tracking_url = data.tracking_url;
  if (data.shipping_provider) updatePayload.shipping_provider = data.shipping_provider;
  if (data.estimated_delivery_date) updatePayload.estimated_delivery_date = data.estimated_delivery_date;
  if (data.packaging_status) updatePayload.packaging_status = data.packaging_status;

  // Set timestamps based on status transitions
  if (newStatus === "shipped" && oldStatus !== "shipped") {
    updatePayload.shipped_at = new Date().toISOString();
  }
  if (newStatus === "delivered" && oldStatus !== "delivered") {
    updatePayload.delivered_at = new Date().toISOString();
    if (order.payment_method === "cod" && order.payment_status !== "completed") {
      updatePayload.payment_status = "completed";
    }
  }
  if (newStatus === "cancelled" && oldStatus !== "cancelled") {
    updatePayload.cancelled_at = new Date().toISOString();
  }

  // Update order
  const { error: updateError } = await serviceClient
    .from("orders")
    .update(updatePayload)
    .eq("id", data.orderId);

  if (updateError) {
    console.error("[update-order-status]", updateError.message);
    return NextResponse.json(
      { success: false, error: Messages.adminUpdateOrderError },
      { status: 500 }
    );
  }

  // Log to status history
  const historyPayload: Record<string, unknown> = {
    order_id: data.orderId,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: "admin",
  };
  if (data.notes) historyPayload.notes = data.notes;

  const { error: historyError } = await serviceClient
    .from("order_status_history")
    .insert(historyPayload);

  if (historyError) {
    console.warn("[update-order-status] Failed to log history:", historyError.message);
    // Non-fatal — order was already updated
  }

  // ── Influencer commission lifecycle ──
  if (newStatus === "delivered") {
    // COD orders earn commission once delivered; prepaid is idempotent-safe.
    await createInfluencerEarnings(data.orderId);
  } else if (newStatus === "cancelled") {
    await cancelInfluencerEarnings(data.orderId);
    // Restore stock only if it was decremented at finalisation.
    if (order.payment_status === "paid" || order.payment_status === "partially_paid") {
      const { error: stockError } = await serviceClient.rpc("cancel_order_stock_restore", {
        p_order_id: data.orderId,
      });
      if (stockError) {
        console.error("[update-order-status] Stock restore failed:", stockError.message);
      }
    }
  }

  // ── Best-effort: cancel the courier shipment when the order is cancelled ──
  if (newStatus === "cancelled" && order.shiprocket_shipment_id) {
    const provider = getShippingProvider();
    if (provider?.cancelShipment) {
      provider
        .cancelShipment(order.shiprocket_shipment_id)
        .then((res) => {
          if (!res.success) {
            console.warn(
              "[update-order-status] Shiprocket cancel failed:",
              res.error ?? "unknown"
            );
          }
        })
        .catch((err) => {
          console.warn(
            "[update-order-status] Shiprocket cancel error:",
            err instanceof Error ? err.message : String(err)
          );
        });
    }
  }

  // ── Transactional notifications (idempotent) ──
  const eventPayload = {
    orderId: data.orderId,
    orderNumber: order.order_number,
    customerEmail: order.customer_email,
    customerName: order.customer_name,
  };

  if (newStatus === "shipped") {
    await sendOrderEvent({
      type: "order_shipped",
      ...eventPayload,
      trackingId: data.tracking_id,
      trackingUrl: data.tracking_url,
      shippingProvider: data.shipping_provider,
    });
  } else if (newStatus === "out_for_delivery") {
    await sendOrderEvent({ type: "delivery_day", ...eventPayload });
  } else if (newStatus === "delivered") {
    await sendOrderEvent({ type: "order_delivered", ...eventPayload });
  } else if (newStatus === "cancelled") {
    await sendOrderEvent({ type: "order_cancelled", ...eventPayload });
  } else if (newStatus === "refunded") {
    await sendOrderEvent({ type: "order_refunded", ...eventPayload });
  }

  return NextResponse.json({
    success: true,
    data: { message: "Order status updated" },
  });
}
