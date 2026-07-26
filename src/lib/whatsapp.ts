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

/**
 * Open WhatsApp in a new tab.
 */
export function openWhatsApp(productName?: string): void {
  if (typeof window !== "undefined") {
    window.open(getWhatsAppUrl(productName), "_blank");
  }
}

/**
 * Check if Supabase is configured (not in fallback mode).
 */
export function isSupabaseReady(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key && !url.includes("placeholder") && !key.includes("placeholder"));
}
