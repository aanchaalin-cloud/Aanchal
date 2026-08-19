import { hmacHex, timingSafeEqualUtf8 } from "@/lib/crypto";
import type { PaymentProviderAdapter, VerifyResult, CreateOrderResult } from "./payments-types";
import Razorpay from "razorpay";

const adapter: PaymentProviderAdapter = {
  name: "razorpay",
  async verifyPayment({ providerOrderId, providerPaymentId, signature }): Promise<VerifyResult> {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return { success: false, code: "CONFIG", message: "Razorpay not configured" };

    if (!providerOrderId || !providerPaymentId || !signature) return { success: false, code: "INVALID", message: "Missing params" };

    const expected = hmacHex(secret, `${providerOrderId}|${providerPaymentId}`);
    if (!timingSafeEqualUtf8(expected, signature)) return { success: false, code: "SIG", message: "Signature mismatch" };

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    let amountPaise: number | null = null;
    let currency: string | null = null;
    if (keyId && secret && providerPaymentId) {
      try {
        const auth = Buffer.from(`${keyId}:${secret}`).toString("base64");
        const r = await fetch(`https://api.razorpay.com/v1/payments/${providerPaymentId}`, { headers: { Authorization: `Basic ${auth}` } });
        if (r.ok) {
          const json = await r.json();
          amountPaise = json.amount ?? null;
          currency = json.currency ?? null;
        }
      } catch {
        // ignore
      }
    }

    return { success: true, providerPaymentId, amountPaise, currency } as VerifyResult;
  },
  async createOrder({ amountPaise, currency = "INR", receipt, notes }): Promise<CreateOrderResult> {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return { error: "Razorpay not configured" };

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    try {
      const rOrder = await razorpay.orders.create({ amount: amountPaise, currency, receipt: receipt ?? `rcpt_${Date.now()}`, notes });
      return { providerOrderId: rOrder.id } as CreateOrderResult;
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },
};

export default adapter;
