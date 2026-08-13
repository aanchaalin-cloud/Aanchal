export type VerifyResult = {
  success: boolean;
  providerPaymentId?: string | null;
  amountPaise?: number | null;
  currency?: string | null;
  code?: string;
  message?: string;
};

export type CreateOrderResult = {
  providerOrderId?: string | null;
  txnToken?: string | null;
  redirectUrl?: string | null;
  error?: string | null;
};

export type PaymentProviderAdapter = {
  name: "razorpay" | "paytm";
  verifyPayment: (params: { orderId: string; providerOrderId?: string; providerPaymentId?: string; signature?: string }) => Promise<VerifyResult>;
  createOrder?: (params: { amountPaise: number; currency?: string; receipt?: string; notes?: Record<string, string> }) => Promise<CreateOrderResult>;
};
