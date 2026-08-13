const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+918949911242";

/**
 * Get a WhatsApp URL for direct messaging.
 * Used for customer support contact only — not as a purchase flow.
 */
export function getWhatsAppUrl(productName?: string): string {
  const message = productName
    ? `Hi, I am here to buy this product: ${productName}`
    : "Hi, I need help with my Aanchal order.";
  return `https://wa.me/${WHATSAPP_NUMBER.replace(/[^\d]/g, "")}?text=${encodeURIComponent(message)}`;
}
