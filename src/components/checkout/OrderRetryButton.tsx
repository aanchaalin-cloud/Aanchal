"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  statusToken: string;
  paymentProvider: string | null;
};

/**
 * Retry button shown when payment failed or is pending.
 * - Paytm: re-initiates payment for the SAME order (no cart needed) and
 *   redirects to the Paytm page with a fresh single-use Paytm order id.
 * - Razorpay: sends the customer back to checkout to retry.
 */
export default function OrderRetryButton({ orderId, statusToken, paymentProvider }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPaytm = paymentProvider === "paytm";

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, statusToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data?.data?.alreadyPaid) {
          router.refresh();
          return;
        }
        setError(data?.error ?? "We couldn't restart the payment. Please try again.");
        setLoading(false);
        return;
      }
      if (isPaytm && data.data.paytm?.redirectUrl) {
        window.location.href = data.data.paytm.redirectUrl;
        return;
      }
      router.refresh();
    } catch {
      setError("We couldn't restart the payment. Please try again.");
      setLoading(false);
    }
  };

  if (isPaytm) {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleRetry}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded bg-[#800020] px-6 py-3 text-sm font-medium text-white hover:bg-[#66001A] disabled:opacity-60 transition-colors"
        >
          {loading ? "Redirecting to payment…" : "Try Again"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
        {error && <p className="text-sm text-[#C41E3A]">{error}</p>}
      </div>
    );
  }

  return (
    <Link
      href="/checkout"
      className="inline-flex items-center gap-2 rounded bg-[#800020] px-6 py-3 text-sm font-medium text-white hover:bg-[#66001A] transition-colors"
    >
      Try Again
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
