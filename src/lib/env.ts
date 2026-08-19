export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getRequiredServerEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return value;
}

export function getOptionalServerEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

/**
 * Checkout confirmation mode.
 *
 * "whatsapp" (Phase 1): no online payment. The website creates a pending order
 * and the customer confirms it on WhatsApp; the owner confirms manually.
 * "payment" (Phase 2): full online checkout (Paytm/Razorpay + Shiprocket).
 *
 * WhatsApp is the DEFAULT. Online payment runs only when explicitly requested
 * via NEXT_PUBLIC_CHECKOUT_MODE=payment, so a build/deploy that forgets the env
 * can never fall into a broken payment path — it always lands on WhatsApp.
 *
 * Uses a NEXT_PUBLIC_* variable because the storefront UI (checkout page and
 * order-success page) needs to branch on the same flag. It is a configuration
 * flag, not a secret.
 */
export function getCheckoutMode(): "payment" | "whatsapp" {
  return process.env.NEXT_PUBLIC_CHECKOUT_MODE === "payment" ? "payment" : "whatsapp";
}
