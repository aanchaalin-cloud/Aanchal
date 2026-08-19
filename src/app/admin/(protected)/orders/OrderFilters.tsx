"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

const PAYMENT_STATUSES = ["all", "pending", "partially_paid", "paid", "failed", "refunded", "partially_refunded"];
const ORDER_STATUSES = [
  "all", "pending", "confirmed", "in_production", "ready_to_ship",
  "shipped", "out_for_delivery", "delivered", "cancelled", "return_requested",
  "returned", "refunded",
];

const labelize = (s: string) => (s === "all" ? "All" : s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));

type Props = {
  currentPaymentStatus: string;
  currentOrderStatus: string;
  currentSearch: string;
  onSearch: (query: string) => void;
};

export function OrderFilters({ currentPaymentStatus, currentOrderStatus, currentSearch, onSearch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchInput, setSearchInput] = useState(currentSearch);

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (currentPaymentStatus !== "all" || key === "payment_status") {
      params.set("payment_status", key === "payment_status" ? value : currentPaymentStatus);
    }
    if (currentOrderStatus !== "all" || key === "order_status") {
      params.set("order_status", key === "order_status" ? value : currentOrderStatus);
    }
    if (currentSearch || key === "search") {
      params.set("search", key === "search" ? value : currentSearch);
    }
    if (params.get("payment_status") === "all") params.delete("payment_status");
    if (params.get("order_status") === "all") params.delete("order_status");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput.trim());
    const params = new URLSearchParams();
    if (currentPaymentStatus !== "all") params.set("payment_status", currentPaymentStatus);
    if (currentOrderStatus !== "all") params.set("order_status", currentOrderStatus);
    if (searchInput.trim()) params.set("search", searchInput.trim());
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by order #, name, email, phone..."
            className="w-full rounded border border-stone-200 pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 transition-colors"
        >
          Search
        </button>
        {currentSearch && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              onSearch("");
              const params = new URLSearchParams();
              if (currentPaymentStatus !== "all") params.set("payment_status", currentPaymentStatus);
              if (currentOrderStatus !== "all") params.set("order_status", currentOrderStatus);
              const qs = params.toString();
              router.push(qs ? `${pathname}?${qs}` : pathname);
            }}
            className="text-xs text-stone-600 hover:text-stone-900 underline"
          >
            Clear
          </button>
        )}
      </form>

      {/* Filters */}
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
        {(currentPaymentStatus !== "all" || currentOrderStatus !== "all" || currentSearch) && (
          <button
            onClick={() => {
              setSearchInput("");
              onSearch("");
              router.push(pathname);
            }}
            className="text-xs text-stone-600 hover:text-stone-900 underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
