/**
 * WhatsApp integration — central configuration + message builders.
 *
 * The business number lives ONLY here, sourced from
 * NEXT_PUBLIC_WHATSAPP_NUMBER. Do not hardcode it anywhere else.
 */

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+917742719732";

/** Digits-only business WhatsApp number (what wa.me expects). */
export function getWhatsAppNumber(): string {
  return WHATSAPP_NUMBER.replace(/[^\d]/g, "");
}

/**
 * Get a WhatsApp URL for direct messaging.
 * Used for customer support / influencer contact — not as a purchase flow.
 */
export function getWhatsAppUrl(productName?: string): string {
  const message = productName
    ? `Hi, I am here to buy this product: ${productName}`
    : "Hi, I need help with my Aanchal order.";
  return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}

/** Build a WhatsApp click-to-chat URL for a fully prepared message. */
export function getWhatsAppOrderLink(message: string): string {
  return `https://wa.me/${getWhatsAppNumber()}?text=${encodeURIComponent(message)}`;
}

/** Format a rupee amount for the WhatsApp message (keeps paise when present). */
export function formatRupees(amount: number): string {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Format a height given in inches as "5 ft 4 in". */
export function formatHeight(unit: "cm" | "inches", totalInches: number): string {
  if (unit === "cm") return `${totalInches} cm`;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet} ft ${inches} in`;
}

export type WhatsAppOrderItem = {
  productName: string;
  variant: string | null;
  quantity: number;
  lineTotal: number;
};

export type WhatsAppOrderSummary = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: WhatsAppOrderItem[];
  measurements: {
    unit: "cm" | "inches";
    chest: number;
    waist: number;
    fullHeight: number;
    shoulder: number | null;
    personalisationRequest?: string | null;
  } | null;
  address: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  couponCode?: string | null;
  influencerCode?: string | null;
  notes?: string | null;
};

/**
 * Build the prepared WhatsApp order-confirmation message.
 * Pure function — no DB, no network, safe to call on client or server.
 * All values must be provided by the server (authoritative totals only).
 */
export function buildWhatsAppOrderMessage(order: WhatsAppOrderSummary): string {
  const lines: string[] = [];

  lines.push("Hello Aanchal! 🌸");
  lines.push("");
  lines.push("I would like to place my order and confirm it on WhatsApp.");
  lines.push("");
  lines.push(`Order No: ${order.orderNumber}`);
  lines.push("");

  // Customer details
  lines.push("CUSTOMER DETAILS");
  lines.push(`Name: ${order.customerName}`);
  lines.push(`Mobile: ${order.customerPhone}`);
  lines.push(`Email: ${order.customerEmail}`);
  lines.push("");

  // Product details
  lines.push("PRODUCT DETAILS");
  order.items.forEach((item, index) => {
    const variant = item.variant ? ` (${item.variant})` : "";
    lines.push(`${index + 1}. ${item.productName}${variant} × ${item.quantity} — ${formatRupees(item.lineTotal)}`);
  });
  lines.push("");

  // Custom fit
  if (order.measurements) {
    const m = order.measurements;
    lines.push("CUSTOM FIT");
    lines.push(`Chest: ${m.chest} in`);
    lines.push(`Waist: ${m.waist} in`);
    lines.push(`Height: ${formatHeight(m.unit, m.fullHeight)}`);
    if (m.shoulder != null) lines.push(`Shoulder: ${m.shoulder} in`);
    if (m.personalisationRequest && m.personalisationRequest.trim()) {
      lines.push(`Additional request: ${m.personalisationRequest.trim()}`);
    }
    lines.push("");
  }

  // Custom request / order notes
  if (order.notes && order.notes.trim()) {
    lines.push("CUSTOM REQUEST");
    lines.push(order.notes.trim());
    lines.push("");
  }

  // Delivery address
  lines.push("DELIVERY ADDRESS");
  lines.push(order.address.line1);
  if (order.address.line2) lines.push(order.address.line2);
  lines.push(`${order.address.city}, ${order.address.state} – ${order.address.pincode}`);
  lines.push("");

  // Order summary
  lines.push("ORDER SUMMARY");
  lines.push(`Subtotal: ${formatRupees(order.subtotal)}`);
  if (order.shippingFee > 0) {
    lines.push(`Shipping: ${formatRupees(order.shippingFee)}`);
  } else {
    lines.push("Shipping: Free");
  }
  if (order.discountAmount > 0) {
    lines.push(`Discount: -${formatRupees(order.discountAmount)}`);
  }
  if (order.couponCode) lines.push(`Coupon: ${order.couponCode}`);
  if (order.influencerCode) lines.push(`Referral: ${order.influencerCode}`);
  lines.push(`Final Amount: ${formatRupees(order.totalAmount)}`);
  lines.push("");

  // Payment note — Phase 1: no online payment.
  lines.push("PAYMENT");
  lines.push("Payment will be confirmed separately with Aanchal.");
  lines.push("");
  lines.push("Please confirm my order.");
  lines.push("");
  lines.push("Thank you! ❤️");

  return lines.join("\n");
}
