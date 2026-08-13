"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  paytmOrderId: string;
  paymentStatus: string;
  refreshParam: string | boolean | undefined;
};

const MAX_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 5000;

/**
 * Client-side verifier for Paytm orders. When an order is still "pending"
 * (e.g. the customer came back from the Paytm callback, or the browser was
 * closed mid-payment), this polls the server-side verify-payment endpoint
 * until Paytm settles the transaction, then refreshes the server component.
 */
export default function PaymentStatusRefresher({
  orderId,
  paytmOrderId,
  paymentStatus,
  refreshParam,
}: Props) {
  const router = useRouter();
  const attempts = useRef(0);
  const [stopped, setStopped] = useState(false);
  const shouldPoll = paymentStatus === "pending" && Boolean(refreshParam);

  const poll = useCallback(async () => {
    attempts.current += 1;
    try {
      const res = await fetch("/api/checkout/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "paytm", orderId, paytmOrderId }),      });
      const data = await res.json().catch(() => null);

      // Order settled — stop and re-render the server component.
      if (res.ok || data?.code === "PAYMENT_FAILED") {
        setStopped(true);
        router.refresh();
        return;
      }
    } catch {
      // Ignore transient network errors and keep polling.
    }

    if (attempts.current < MAX_ATTEMPTS) {
      window.setTimeout(poll, POLL_INTERVAL_MS);
    } else {
      setStopped(true);
    }
  }, [orderId, paytmOrderId, router]);

  useEffect(() => {
    if (shouldPoll) {
      poll();
    }
  }, [shouldPoll, poll]);

  if (!shouldPoll || stopped) return null;

  return (
    <p className="mt-4 flex items-center justify-center gap-2 text-sm text-[#6B6B6B]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#800020] border-t-transparent" />
      Checking payment status…
    </p>
  );
}
