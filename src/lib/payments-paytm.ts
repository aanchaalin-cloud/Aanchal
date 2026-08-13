import type { PaymentProviderAdapter, VerifyResult, CreateOrderResult } from "./payments-types";
import { getPaytmConfig, getTransactionStatus, paytmAmountToPaise, buildPaytmOrderId } from "@/lib/paytm";

const adapter: PaymentProviderAdapter = {
  name: "paytm",
  async verifyPayment({ providerOrderId }): Promise<VerifyResult> {
    const config = getPaytmConfig();
    if (!config) return { success: false, code: "CONFIG", message: "Paytm not configured" };
    if (!providerOrderId) return { success: false, code: "INVALID", message: "Missing paytm order id" };

    const status = await getTransactionStatus(config, providerOrderId);
    if (!status.success) return { success: false, code: "STATUS", message: status.resultMsg ?? "Status unavailable" };
    if (status.resultStatus === "PENDING" || status.resultStatus === "TXNTXN") return { success: false, code: "PENDING", message: "Pending" };
    if (status.resultStatus === "TXN_FAILURE") return { success: false, code: "FAILED", message: "Transaction failed" };

    const amountPaise = status.txnAmount ? paytmAmountToPaise(status.txnAmount) : null;
    return { success: true, providerPaymentId: status.txnId ?? null, amountPaise, currency: "INR" } as VerifyResult;
  },
  async createOrder({ receipt }): Promise<CreateOrderResult> {
    // Use the merchant-side receipt (order id) to create a Paytm ORDER_ID matching existing behavior
    const attempt = 1;
    const orderId = receipt ?? `order_${Date.now()}`;
    const providerOrderId = buildPaytmOrderId(orderId, attempt);
    return { providerOrderId };
  },
};

export default adapter;
