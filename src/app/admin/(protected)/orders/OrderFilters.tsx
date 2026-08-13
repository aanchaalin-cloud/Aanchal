"use client";

import { useRouter, usePathname } from "next/navigation";

const PAYMENT_STATUSES = ["all", "pending", "partially_paid", "paid", "failed", "refunded", "partially_refunded"];
const ORDER_STATUSES = [
  "all", "pending", "confirmed", "in_production", "quality_check", "ready_to_ship",
  "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "failed",
];

const labelize = (s: string) => (s === "all" ? "All" : s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));

type Props = {
  currentPaymentStatus: string;
  currentOrderStatus: string;
};

export function OrderFilters({ currentPaymentStatus, currentOrderStatus }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (currentPaymentStatus !== "all" || key === "payment_status") {
      params.set("payment_status", key === "payment_status" ? value : currentPaymentStatus);
    }
    if (currentOrderStatus !== "all" || key === "order_status") {
      params.set("order_status", key === "order_status" ? value : currentOrderStatus);
    }
    // Remove "all" values from URL
    if (params.get("payment_status") === "all") params.delete("payment_status");
    if (params.get("order_status") === "all") params.delete("order_status");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-stone-600">Payment:</label>
        <select
          value={currentPaymentStatus}
          onChange={(e) => handleFilter("payment_status", e.target.value)}
          className="rounded border border-stone-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
        >
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{labelize(s)}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-stone-600">Status:</label>
        <select
          value={currentOrderStatus}
          onChange={(e) => handleFilter("order_status", e.target.value)}
          className="rounded border border-stone-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : labelize(s)}</option>
          ))}
        </select>
      </div>
      {(currentPaymentStatus !== "all" || currentOrderStatus !== "all") && (
        <button
          onClick={() => router.push(pathname)}
          className="text-xs text-stone-600 hover:text-stone-900 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}