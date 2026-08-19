"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

const PAYMENT_OPTIONS: { value: PaymentStatus; label: string; icon: typeof CheckCircle; color: string }[] = [
  { value: "pending", label: "Pending", icon: Clock, color: "text-amber-600" },
  { value: "completed", label: "Paid", icon: CheckCircle, color: "text-green-600" },
  { value: "failed", label: "Failed", icon: XCircle, color: "text-red-600" },
  { value: "refunded", label: "Refunded", icon: CreditCard, color: "text-blue-600" },
];

export function PaymentManager({
  orderId,
  currentStatus,
  confirmationMethod,
  paymentMethod,
  codAmount,
  prepaidAmount,
}: {
  orderId: string;
  currentStatus: string;
  confirmationMethod: string;
  paymentMethod: string;
  codAmount: number;
  prepaidAmount: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState("");

  const handleMarkPaid = async (status: PaymentStatus) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/orders/update-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          payment_status: status,
          notes: notes || `Admin marked payment as ${status}`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update payment status");
        setSaving(false);
        return;
      }

      setSuccess(true);
      setNotes("");
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (currentStatus === "completed" || currentStatus === "refunded") {
    const option = PAYMENT_OPTIONS.find((o) => o.value === currentStatus);
    return (
      <div className="rounded-sm border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-stone-900 mb-3">Payment</h2>
        <div className="flex items-center gap-2">
          {option && <option.icon className={cn("h-5 w-5", option.color)} />}
          <span className="text-sm font-medium text-stone-900 capitalize">{currentStatus}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-stone-900 mb-3">Payment</h2>

      <div className="space-y-3">
        {confirmationMethod === "whatsapp" && paymentMethod === "cod" && (
          <div className="rounded-sm bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            COD order. Mark as paid once cash is collected on delivery.
          </div>
        )}
        {confirmationMethod === "whatsapp" && paymentMethod !== "cod" && (
          <div className="rounded-sm bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            Prepaid WhatsApp order. Mark as paid once you verify the UPI/bank transfer.
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_OPTIONS.filter((o) => o.value !== currentStatus).map((option) => {
            const isQuickPaid =
              option.value === "completed" &&
              ((paymentMethod === "cod" && codAmount > 0) ||
                (paymentMethod !== "cod" && prepaidAmount > 0));

            return (
              <button
                key={option.value}
                onClick={() => handleMarkPaid(option.value)}
                disabled={saving}
                className={cn(
                  "flex items-center justify-center gap-2 rounded border px-3 py-2.5 text-sm font-medium transition-colors",
                  isQuickPaid
                    ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                    : option.value === "failed"
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : option.value === "refunded"
                    ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100",
                  saving && "opacity-50 pointer-events-none"
                )}
              >
                <option.icon className={cn("h-4 w-4", option.color)} />
                {option.value === "completed" && isQuickPaid
                  ? "Mark Paid"
                  : option.label}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
        />

        {error && <p className="text-xs text-[#800020]">{error}</p>}
        {success && <p className="text-xs text-green-600 font-medium">Payment status updated!</p>}
      </div>
    </div>
  );
}
