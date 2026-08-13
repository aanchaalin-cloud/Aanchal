"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Props = {
  orderId: string;
  statusToken: string;
  dispatched: boolean;
};

export default function CancelOrderButton({ orderId, statusToken, dispatched }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; refundNote?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, statusToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Unable to cancel this order.");
        setLoading(false);
        return;
      }
      setResult(data.data);
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="rounded-sm border border-green-200 bg-green-50 p-4 text-left">
        <p className="text-sm font-medium text-green-800">{result.message}</p>
        {result.refundNote && <p className="mt-1 text-xs text-green-700">{result.refundNote}</p>}
      </div>
    );
  }

  return (
    <div className="text-left">
      {confirming ? (
        <div className="rounded-sm border border-[#C41E3A]/30 bg-[#C41E3A]/5 p-4">
          <p className="text-sm text-[#1C1C1C]">
            Are you sure you want to cancel this order?
            {dispatched
              ? " Since it has already been dispatched, a 15% deduction will apply."
              : " Cancellation before dispatch is free."}
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded bg-[#C41E3A] px-4 py-2 text-sm font-medium text-white hover:bg-[#A31A2F] disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Yes, Cancel Order
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="rounded border border-[#D4C5B5] px-4 py-2 text-sm font-medium text-[#1C1C1C] hover:bg-[#F5EBE1]"
            >
              Keep Order
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-[#C41E3A]">{error}</p>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm font-medium text-[#C41E3A] hover:underline"
        >
          Cancel this order
        </button>
      )}
    </div>
  );
}
