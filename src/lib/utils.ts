import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely.
 * shadcn/ui standard utility.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Indian Rupee currency string.
 * Example: 1299 → "₹1,299"
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convert price in rupees to paise (Razorpay uses paise).
 * Example: 1299 → 129900
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Generate a URL-friendly slug from a product name.
 * Example: "Blue Silk Saree" → "blue-silk-saree"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Get the primary (first) image URL for a product.
 * Falls back to a placeholder if no images exist.
 */
export function getPrimaryImageUrl(
  images: { url: string; position: number }[]
): string {
  if (!images || images.length === 0) {
    return "/images/product-placeholder.svg";
  }
  const sorted = [...images].sort((a, b) => a.position - b.position);
  return sorted[0].url;
}

/**
 * Format a date string to a readable Indian format.
 * Example: "2024-01-15T10:30:00Z" → "15 Jan 2024, 10:30 AM"
 */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

/**
 * Get a human-readable label for order status.
 */
export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    in_production: "In Production",
    ready_to_ship: "Ready to Ship",
    shipped: "Shipped",
    out_for_delivery: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
    return_requested: "Return Requested",
    returned: "Returned",
    refunded: "Refunded",
  };
  return labels[status] ?? status;
}

/**
 * Get badge color class for order status.
 */
export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    in_production: "bg-purple-100 text-purple-800",
    ready_to_ship: "bg-indigo-100 text-indigo-800",
    shipped: "bg-indigo-100 text-indigo-800",
    out_for_delivery: "bg-orange-100 text-orange-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    return_requested: "bg-amber-100 text-amber-800",
    returned: "bg-gray-100 text-gray-800",
    refunded: "bg-gray-100 text-gray-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}

/**
 * Get badge color class for payment status.
 */
export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    partially_paid: "bg-orange-100 text-orange-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
    partially_refunded: "bg-amber-100 text-amber-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}

/**
 * Get badge color class for payment method.
 */
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    prepaid: "Full Prepaid",
    cod: "50% Prepaid + COD",
  };
  return labels[method] ?? method;
}

/**
 * Human-readable label for the order confirmation method.
 */
export function getConfirmationMethodLabel(method: string): string {
  return method === "whatsapp" ? "WhatsApp" : "Online";
}

/**
 * Badge color class for the confirmation method.
 */
export function getConfirmationMethodColor(method: string): string {
  return method === "whatsapp"
    ? "bg-green-100 text-green-800"
    : "bg-stone-100 text-stone-700";
}
