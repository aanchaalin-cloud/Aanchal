import "server-only";

import {
  buildWhatsAppOrderMessage,
  getWhatsAppNumber,
  getWhatsAppOrderLink,
  type WhatsAppOrderSummary,
} from "@/lib/whatsapp";
import { createServiceClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

/**
 * Builds the prepared WhatsApp message + click-to-chat URL for an existing
 * order, reading the same authoritative rows the order-success page renders.
 * Single source of truth so the checkout redirect and the status page always
 * carry the identical message.
 */
export async function buildWhatsAppConfirmationForOrder(orderId: string): Promise<{
  message: string;
  whatsappUrl: string;
  whatsappNumber: string;
} | null> {
  noStore();

  const supabase = await createServiceClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, customer_name, customer_email, customer_phone,
       subtotal, shipping_fee, discount_amount, total_amount,
       reward_voucher_code, influencer_code, notes,
       address_line1, address_line2, city, state, pincode,
       order_items ( product_name, size, color, quantity, line_total ),
       order_measurements ( chest, waist, full_height, shoulder, unit, personalisation_request )`
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) return null;

  const rawMeasurements = order.order_measurements;
  const measurements = Array.isArray(rawMeasurements)
    ? (rawMeasurements[0] ?? null)
    : rawMeasurements;

  const summary: WhatsAppOrderSummary = {
    orderNumber: order.order_number ?? order.id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone ?? "",
    customerEmail: order.customer_email ?? "",
    items: (order.order_items ?? []).map((item) => ({
      productName: item.product_name,
      variant: [item.size, item.color].filter(Boolean).join(" / ") || null,
      quantity: item.quantity,
      lineTotal: Number(item.line_total),
    })),
    measurements: measurements
      ? {
          unit: measurements.unit ?? "inches",
          chest: Number(measurements.chest),
          waist: Number(measurements.waist),
          fullHeight: Number(measurements.full_height),
          shoulder:
            measurements.shoulder != null ? Number(measurements.shoulder) : null,
          personalisationRequest: measurements.personalisation_request,
        }
      : null,
    address: {
      line1: order.address_line1,
      line2: order.address_line2,
      city: order.city ?? "",
      state: order.state ?? "",
      pincode: order.pincode ?? "",
    },
    subtotal: order.subtotal ?? Number(order.total_amount),
    shippingFee: order.shipping_fee ?? 0,
    discountAmount: order.discount_amount ?? 0,
    totalAmount: Number(order.total_amount),
    couponCode: order.reward_voucher_code,
    influencerCode: order.influencer_code,
    notes: order.notes,
  };

  const message = buildWhatsAppOrderMessage(summary);
  return {
    message,
    whatsappUrl: getWhatsAppOrderLink(message),
    whatsappNumber: getWhatsAppNumber(),
  };
}