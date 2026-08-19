import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";
import { getShippingProvider, type ShipmentTrackEvent } from "@/lib/shipping";
import { sendOrderEvent } from "@/lib/notifications/order-events";
import { info, warn } from "@/lib/logger";

const statusSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  email: z.string().email("Invalid email address").max(200),
});

const ORDER_STATUS_RANK: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  in_production: 2,
  ready_to_ship: 3,
  shipped: 4,
  out_for_delivery: 5,
  delivered: 6,
};

/**
 * POST /api/orders/status
 *
 * Customer-facing order lookup (order ID + email). When the order has a
 * courier AWB, live tracking is fetched from the shipping provider and — if
 * the courier reports a further-along lifecycle stage — the local order status
 * is advanced idempotently (forward-only) and the customer is notified.
 *
 * Tracking is best-effort: any provider failure is swallowed so order lookup
 * never breaks.
 */
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
      shiprocket_shipment_id,
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

  // ── Live tracking sync (best-effort, forward-only, idempotent) ──
  let trackingEvents: ShipmentTrackEvent[] = [];
  if (order.tracking_id && order.shipping_provider === "shiprocket") {
    try {
      const provider = getShippingProvider();
      if (provider?.trackShipment) {
        const tracking = await provider.trackShipment(order.tracking_id);
        if (tracking) {
          trackingEvents = tracking.events;

          const mapped = tracking.mappedOrderStatus;
          const currentRank = ORDER_STATUS_RANK[order.order_status] ?? -1;
          const mappedRank = mapped ? (ORDER_STATUS_RANK[mapped] ?? -1) : -1;

          // Never resurrect a terminal lifecycle state. Cancelled / returned /
          // refunded orders must not be flipped back by a stale courier
          // "delivered" update.
          const terminal = ["cancelled", "return_requested", "returned", "refunded"].includes(
            order.order_status
          );

          // Only advance forward through the lifecycle and only when a
          // shipment actually exists (mapped !== null).
          if (!terminal && mapped && mappedRank > currentRank) {
            const updatePayload: Record<string, unknown> = { order_status: mapped };
            if (mapped === "shipped") updatePayload.shipped_at = new Date().toISOString();
            if (mapped === "delivered") updatePayload.delivered_at = new Date().toISOString();

            const { error: updateError } = await supabase
              .from("orders")
              .update(updatePayload)
              .eq("id", order.id)
              .eq("order_status", order.order_status);

            if (!updateError) {
              await supabase.from("order_status_history").insert({
                order_id: order.id,
                old_status: order.order_status,
                new_status: mapped,
                changed_by: "system",
                notes: `Live courier status: ${tracking.trackingStatus ?? ""}`,
              });

              info("Order status advanced from live tracking", {
                orderId: order.id,
                from: order.order_status,
                to: mapped,
              });

              // Notify on milestone transitions (idempotent per type).
              if (mapped === "shipped") {
                await sendOrderEvent({
                  type: "order_shipped",
                  orderId: order.id,
                  orderNumber: order.order_number,
                  customerEmail: order.customer_email,
                  customerName: order.customer_name,
                  trackingId: order.tracking_id,
                  trackingUrl: order.tracking_url,
                  shippingProvider: order.shipping_provider,
                });
              } else if (mapped === "out_for_delivery") {
                await sendOrderEvent({
                  type: "delivery_day",
                  orderId: order.id,
                  customerEmail: order.customer_email,
                  customerName: order.customer_name,
                });
              } else if (mapped === "delivered") {
                await sendOrderEvent({
                  type: "order_delivered",
                  orderId: order.id,
                  customerEmail: order.customer_email,
                  customerName: order.customer_name,
                });
              }

              order.order_status = mapped;
            }
          }
        }
      }
    } catch (err) {
      warn("Tracking sync failed (best-effort)", {
        orderId: order.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: { ...order, tracking_events: trackingEvents },
  });
}
