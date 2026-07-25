"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Messages } from "@/lib/messages";
import type { OrderStatus } from "@/types";

const ORDER_STATUSES: OrderStatus[] = [
  "pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded",
];

export function OrderStatusUpdater({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    if (status === currentStatus) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/orders/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, order_status: status }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? Messages.adminUpdateOrderError);
        setSaving(false);
        return;
      }

      router.refresh();
    } catch {
      setError(Messages.genericError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as OrderStatus)}
        className="rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
        ))}
      </select>
      <button
        onClick={handleUpdate}
        disabled={status === currentStatus || saving}
        className="rounded bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        {saving ? "Saving…" : "Update"}
      </button>
      {error && <span className="text-xs text-[#800020]">{error}</span>}
    </div>
  );
}
