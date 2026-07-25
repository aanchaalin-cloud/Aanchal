const WHATSAPP_NUMBER = "+918949911242";

export function getWhatsAppUrl(productName: string): string {
  const message = encodeURIComponent(
    `Hi, I am here to buy this product: ${productName}`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
}

export function openWhatsApp(productName: string): void {
  window.open(getWhatsAppUrl(productName), "_blank");
}

export function isFallbackMode(): boolean {
  return typeof window !== "undefined" && !window.location.hostname.includes("localhost")
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder") ?? true
    : false;
}
