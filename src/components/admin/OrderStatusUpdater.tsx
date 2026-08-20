"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Messages } from "@/lib/messages";
import type { OrderStatus, PackagingStatus } from "@/types";

const ORDER_STATUS_FLOW: Record<string, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_production", "shipped", "cancelled"],
  in_production: ["ready_to_ship", "shipped", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: ["return_requested"],
  cancelled: ["refunded"],
  return_requested: ["returned", "refunded"],
  returned: ["refunded"],
  refunded: [],
};

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

const COURIERS = [
  "Delhivery",
  "DTDC",
  "BlueDart",
  "Shadowfax",
  "Xpressbees",
  "Ecom Express",
  "India Post",
  "Professional Couriers",
  "Shiprocket",
  "Other",
];

export function OrderStatusUpdater({
  orderId,
  currentStatus,
  packagingStatus: initialPackagingStatus,
  existingTrackingId,
  existingTrackingUrl,
  existingShippingProvider,
  existingEstimatedDeliveryDate,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  packagingStatus?: string;
  existingTrackingId?: string | null;
  existingTrackingUrl?: string | null;
  existingShippingProvider?: string | null;
  existingEstimatedDeliveryDate?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [packagingStatus, setPackagingStatus] = useState<PackagingStatus>(
    (initialPackagingStatus as PackagingStatus) ?? "pending"
  );
  const [trackingId, setTrackingId] = useState(existingTrackingId ?? "");
  const [trackingUrl, setTrackingUrl] = useState(existingTrackingUrl ?? "");
  const [shippingProvider, setShippingProvider] = useState(existingShippingProvider ?? "");
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(
    existingEstimatedDeliveryDate ? existingEstimatedDeliveryDate.slice(0, 10) : ""
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const allowedStatuses = ORDER_STATUS_FLOW[currentStatus] ?? [];
  const isShipmentStatus = ["shipped", "out_for_delivery", "ready_to_ship", "delivered"].includes(status);

  const handleUpdate = async () => {
    const hasChanges =
      status !== currentStatus ||
      packagingStatus !== (initialPackagingStatus ?? "pending") ||
      trackingId !== (existingTrackingId ?? "") ||
      trackingUrl !== (existingTrackingUrl ?? "") ||
      shippingProvider !== (existingShippingProvider ?? "") ||
      estimatedDeliveryDate !== (existingEstimatedDeliveryDate ? existingEstimatedDeliveryDate.slice(0, 10) : "") ||
      notes;

    if (!hasChanges) return;

    // Validate: tracking_id + shipping_provider required when transitioning to shipped
    if (status === "shipped" && currentStatus !== "shipped") {
      if (!trackingId.trim()) {
        setError("Tracking ID is required when marking an order as shipped.");
        return;
      }
      if (!shippingProvider) {
        setError("Please select a courier when marking an order as shipped.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const body: Record<string, string> = { orderId, order_status: status };

      // Always send tracking fields if they have any value
      if (trackingId.trim()) body.tracking_id = trackingId.trim();
      if (trackingUrl.trim()) body.tracking_url = trackingUrl.trim();
      if (shippingProvider) body.shipping_provider = shippingProvider;
      if (estimatedDeliveryDate) body.estimated_delivery_date = estimatedDeliveryDate;
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
          <optgroup label="Current">
            <option value={currentStatus}>{STATUS_LABELS[currentStatus]} (current)</option>
          </optgroup>
          {allowedStatuses.length > 0 && (
            <optgroup label="Allowed next">
              {allowedStatuses.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </optgroup>
          )}
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

      {/* Shipping fields — show when selecting a shipment status OR when order already has tracking */}
      {isShipmentStatus && (
        <div className="space-y-2 rounded border border-blue-200 bg-blue-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">Shipment Details</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={shippingProvider}
              onChange={(e) => setShippingProvider(e.target.value)}
              className="rounded border border-stone-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            >
              <option value="">Select courier…</option>
              {COURIERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="Tracking / AWB number"
              className="rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="url"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              placeholder="Tracking URL (optional)"
              className="rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            <input
              type="date"
              value={estimatedDeliveryDate}
              onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
              placeholder="Estimated delivery"
              className="rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
        </div>
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
