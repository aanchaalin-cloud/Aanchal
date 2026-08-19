"use client";

import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Messages } from "@/lib/messages";

type InfluencerProfile = {
  id: string;
  referral_code: string | null;
  status: "pending" | "approved" | "rejected";
  social_handle: string;
  platform: string;
  followers: string | null;
  niche: string | null;
  desired_promo_code: string | null;
  bio: string;
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  customers: { full_name: string; email: string; phone: string | null } | null;
  earnings: { total: number; pending: number; paid: number; orders: number };
};

export default function AdminInfluencersPage() {
  const [profiles, setProfiles] = useState<InfluencerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/influencers");
      const data = await res.json();
      if (data.success) setProfiles(data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const filtered = profiles.filter((p) => {
    if (filter === "pending") return p.status === "pending";
    if (filter === "approved") return p.status === "approved";
    if (filter === "rejected") return p.status === "rejected";
    return true;
  });

  const handleReview = async (influencerId: string, decision: "approved" | "rejected") => {
    setReviewing(influencerId);
    try {
      const res = await fetch("/api/admin/influencers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ influencerId, decision, notes: notes[influencerId] || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.referral_code) {
          alert(`Approved! Referral code: ${data.data.referral_code}`);
        }
        fetchProfiles();
      } else {
        alert(data.error ?? "Failed");
      }
    } catch {
      alert(Messages.genericError);
    } finally {
      setReviewing(null);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Influencer Applications</h1>
        <p className="text-sm text-stone-600 mt-1">Review applications and generate referral codes</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f ? "bg-stone-900 text-white" : "border border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-stone-600 py-8 text-center">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-stone-600 py-8 text-center">No applications to display.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-sm border border-stone-200 bg-white p-5">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      p.status === "approved" ? "bg-green-100 text-green-800" :
                      p.status === "rejected" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>{p.status}</span>
                    <span className="text-xs text-stone-500">{p.platform}</span>
                    {p.followers && <span className="text-xs text-stone-500">· {p.followers} followers</span>}
                  </div>
                  <p className="text-sm font-medium text-stone-900">
                    {p.customers?.full_name ?? "Unknown"} · {p.social_handle}
                  </p>
                  <p className="text-xs text-stone-500">{p.customers?.email ?? ""}</p>
                  {p.niche && (
                    <p className="text-xs text-stone-600">
                      Niche: <span className="font-medium">{p.niche}</span>
                    </p>
                  )}
                  {p.desired_promo_code && (
                    <p className="text-xs text-stone-600">
                      Desired code: <span className="font-mono font-medium">{p.desired_promo_code}</span>
                    </p>
                  )}
                  <p className="text-sm text-stone-600 italic">{p.bio}</p>
                  <p className="text-[10px] text-stone-400">
                    Applied: {new Date(p.created_at).toLocaleString("en-IN")}
                    {p.reviewed_at ? ` · Reviewed: ${new Date(p.reviewed_at).toLocaleString("en-IN")}` : ""}
                  </p>

                  {p.status === "approved" && p.referral_code && (
                    <div className="flex items-center gap-2 rounded bg-green-50 px-3 py-2 w-fit">
                      <span className="text-xs font-semibold text-green-800">Code: {p.referral_code}</span>
                      <button
                        onClick={() => copyCode(p.referral_code!)}
                        className="text-green-700 hover:text-green-900"
                        aria-label="Copy referral code"
                      >
                        {copied === p.referral_code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}

                  {p.status === "approved" && (
                    <div className="flex flex-wrap gap-4 text-xs text-stone-600">
                      <span>Orders: <b>{p.earnings.orders}</b></span>
                      <span>Total commission: <b>₹{p.earnings.total.toLocaleString("en-IN")}</b></span>
                      <span className="text-amber-700">Pending: ₹{p.earnings.pending.toLocaleString("en-IN")}</span>
                      <span className="text-green-700">Paid: ₹{p.earnings.paid.toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  {p.notes && <p className="text-xs text-stone-500">Notes: {p.notes}</p>}
                </div>

                {p.status === "pending" && (
                  <div className="flex-shrink-0 space-y-2 lg:w-56">
                    <textarea
                      value={notes[p.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="Internal notes (optional)"
                      rows={2}
                      className="w-full rounded border border-stone-300 px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => handleReview(p.id, "approved")}
                      disabled={reviewing === p.id}
                      className="w-full rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {reviewing === p.id ? "..." : "Approve + Generate Code"}
                    </button>
                    <button
                      onClick={() => handleReview(p.id, "rejected")}
                      disabled={reviewing === p.id}
                      className="w-full rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
