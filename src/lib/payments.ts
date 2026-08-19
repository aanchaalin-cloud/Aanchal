import type { PaymentProviderAdapter, VerifyResult } from "./payments-types";

export type { VerifyResult };
export type PaymentProviderName = "razorpay" | "paytm";

/**
 * Lazily load the provider adapter so that WhatsApp mode never imports the
 * Razorpay/Paytm SDK modules at all.  This prevents module-level crashes
 * when payment credentials are missing or the SDK cannot initialise.
 */
export async function getProviderAdapter(name: PaymentProviderName): Promise<PaymentProviderAdapter | null> {
  if (name === "razorpay") {
    const mod = await import("./payments-razorpay");
    return mod.default;
  }
  if (name === "paytm") {
    const mod = await import("./payments-paytm");
    return mod.default;
  }
  return null;
}
