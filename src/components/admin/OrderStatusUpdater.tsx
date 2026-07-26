"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Messages } from "@/lib/messages";
import type { OrderStatus, PackagingStatus } from "@/types";

const ORDER_STATUSES: OrderStatus[] = [
  "pending", "confirmed", "in_production", "ready_to_ship",
  "shipped", "out_for_delivery", "delivered",
  "cancelled", "return_requested", "returned", "refunded",
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_production: "In Production",
  ready_to_ship: "Ready to Ship",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return Requested",
  returned: "Returned",
  refunded: "Refunded",
};

const PACKAGING_STATUSES: PackagingStatus[] = ["pending", "packed", "ready_for_pickup"];
const PACKAGING_LABELS: Record<PackagingStatus, string> = {
  pending: "Pending",
  packed: "Packed",
  ready_for_pickup: "Ready for Pickup",
};

export function OrderStatusUpdater({
  orderId,
  currentStatus,
  packagingStatus: initialPackagingStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  packagingStatus?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [packagingStatus, setPackagingStatus] = useState<PackagingStatus>(
    (initialPackagingStatus as PackagingStatus) ?? "pending"
  );
  const [trackingId, setTrackingId] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [shippingProvider, setShippingProvider] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async () => {
    if (
      status === currentStatus &&
      packagingStatus === (initialPackagingStatus ?? "pending") &&
      !trackingId && !trackingUrl && !shippingProvider && !notes
    ) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const body: Record<string, string> = { orderId, order_status: status };
      if (trackingId) body.tracking_id = trackingId;
      if (trackingUrl) body.tracking_url = trackingUrl;
      if (shippingProvider) body.shipping_provider = shippingProvider;
      if (packagingStatus !== (initialPackagingStatus ?? "pending")) body.packaging_status = packagingStatus;
      if (notes) body.notes = notes;

      const res = await fetch("/api/admin/orders/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? Messages.adminUpdateOrderError);
        setSaving(false);
        return;
      }

      setTrackingId("");
      setTrackingUrl("");
      setShippingProvider("");
      setNotes("");
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError(Messages.genericError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
          className="rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button
          onClick={handleUpdate}
          disabled={saving}
          className="rounded bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          {saving ? "Saving..." : "Update"}
        </button>
        {success && <span className="text-xs text-green-600 font-medium">Updated!</span>}
      </div>

      {/* Packaging status */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-stone-600 whitespace-nowrap">Packaging:</label>
        <select
          value={packagingStatus}
          onChange={(e) => setPackagingStatus(e.target.value as PackagingStatus)}
          className="rounded border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
        >
          {PACKAGING_STATUSES.map((s) => (
            <option key={s} value={s}>{PACKAGING_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Shipping fields */}
      {(status === "shipped" || status === "out_for_delivery" || status === "ready_to_ship") && (
        <>
          <input
            type="text"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="Tracking ID"
            className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <input
            type="url"
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
            placeholder="Tracking URL (optional)"
            className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <input
            type="text"
            value={shippingProvider}
            onChange={(e) => setShippingProvider(e.target.value)}
            placeholder="Shipping provider (optional)"
            className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
        </>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Status notes (optional)"
        rows={2}
        className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
      />
      {error && <span className="text-xs text-[#800020]">{error}</span>}
    </div>
  );
}
