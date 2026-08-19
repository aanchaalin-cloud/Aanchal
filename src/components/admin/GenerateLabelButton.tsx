"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

export function GenerateLabelButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelUrl, setLabelUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setLabelUrl(null);
    try {
      const res = await fetch("/api/admin/orders/generate-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Unable to generate the label.");
        setLoading(false);
        return;
      }
      setLabelUrl(data.data?.labelUrl ?? null);
    } catch {
      setError("Unable to generate the label. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        <FileText className="h-4 w-4" />
        {loading ? "Generating label…" : "Generate Label"}
      </button>
      {labelUrl && (
        <a
          href={labelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block text-xs font-medium text-green-700 underline"
        >
          Open label PDF →
        </a>
      )}
      {error && <p className="mt-1 text-xs text-[#C41E3A]">{error}</p>}
    </div>
  );
}
