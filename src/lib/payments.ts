import type { PaymentProviderAdapter, VerifyResult } from "./payments-types";
import razorpayAdapter from "./payments-razorpay";
import paytmAdapter from "./payments-paytm";

export type { VerifyResult };
export type PaymentProviderName = "razorpay" | "paytm";

export async function getProviderAdapter(name: PaymentProviderName): Promise<PaymentProviderAdapter | null> {
  if (name === "razorpay") return razorpayAdapter;
  if (name === "paytm") return paytmAdapter;
  return null;
}
