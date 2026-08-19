import { sendOrderEmail, type OrderEmailType } from "@/lib/email";

export type OrderEventType = OrderEmailType;

type OrderEventParams = {
  type: OrderEventType;
  orderId: string;
  orderNumber?: string | null;
  customerEmail: string;
  customerName: string;
  trackingId?: string;
  trackingUrl?: string;
  shippingProvider?: string;
};

/**
 * Sends the branded transactional email for an order status change.
 * Idempotent via the order_notifications unique partial index
 * (order_id, type) WHERE provider = 'email' AND status = 'sent'.
 * Safe to call repeatedly — duplicates are skipped.
 */
export async function sendOrderEvent(params: OrderEventParams): Promise<void> {
  await sendOrderEmail(
    await import("@/lib/supabase/server").then((m) => m.createServiceClient()),
    {
      type: params.type,
      to: params.customerEmail,
      customerName: params.customerName,
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      trackingId: params.trackingId,
      trackingUrl: params.trackingUrl,
      shippingProvider: params.shippingProvider,
    }
  );
}
