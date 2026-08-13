"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";

export function CreateShipmentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/orders/create-shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Unable to create the shipment.");
        setLoading(false);
        return;
      }
      setMessage(data.data?.message ?? "Shipment created.");
      router.refresh();
      setTimeout(() => setMessage(null), 4000);
    } catch {
      setError("Unable to create the shipment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleCreate}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded border border-[#800020] bg-white px-3 py-1.5 text-sm font-medium text-[#800020] hover:bg-[#800020] hover:text-white disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        <Truck className="h-4 w-4" />
        {loading ? "Creating shipment…" : "Create Shipment"}
      </button>
      {message && <p className="mt-1 text-xs font-medium text-green-700">{message}</p>}
      {error && <p className="mt-1 text-xs text-[#C41E3A]">{error}</p>}
    </div>
  );
}
