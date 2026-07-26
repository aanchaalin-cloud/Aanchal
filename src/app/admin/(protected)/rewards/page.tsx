"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Gift } from "lucide-react";
import { Messages } from "@/lib/messages";

type RewardSubmission = {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  social_url: string;
  platform: string;
  review_body: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  reward_vouchers: Array<{ code: string; value: number; is_used: boolean; expires_at: string }>;
};

export default function AdminRewardsPage() {
  const [submissions, setSubmissions] = useState<RewardSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [approving, setApproving] = useState<string | null>(null);
  const [voucherValue, setVoucherValue] = useState(500);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rewards");
      const data = await res.json();
      if (data.success) setSubmissions(data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const filtered = submissions.filter((s) => {
    if (filter === "pending") return s.status === "pending";
    if (filter === "approved") return s.status === "approved";
    if (filter === "rejected") return s.status === "rejected";
    return true;
  });

  const handleApprove = async (submissionId: string) => {
    setApproving(submissionId);
    try {
      const res = await fetch("/api/admin/rewards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, voucherValue }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Voucher created: ${data.data.code} (₹${data.data.value})`);
        fetchSubmissions();
      } else {
        alert(data.error ?? "Failed");
      }
    } catch {
      alert(Messages.genericError);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (submissionId: string) => {
    await fetch("/api/admin/rewards", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, rejectionReason: rejectReason || undefined }),
    });
    setRejectReason("");
    fetchSubmissions();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Reward Submissions</h1>
        <p className="text-sm text-stone-600 mt-1">Review social media posts and approve vouchers</p>
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
        <p className="text-sm text-stone-600 py-8 text-center">No submissions to display.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((sub) => (
            <div key={sub.id} className="rounded-sm border border-stone-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      sub.status === "approved" ? "bg-green-100 text-green-800" :
                      sub.status === "rejected" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>{sub.status}</span>
                    <span className="text-xs text-stone-500">{sub.platform}</span>
                  </div>
                  <p className="text-sm font-medium text-stone-900">{sub.customer_name} · {sub.customer_email}</p>
                  <a href={sub.social_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <ExternalLink className="h-3 w-3" /> View Social Post
                  </a>
                  <p className="text-sm text-stone-600 italic">{sub.review_body}</p>
                  <p className="text-[10px] text-stone-400">Order: {sub.order_id.slice(0, 8)}… · {new Date(sub.created_at).toLocaleString("en-IN")}</p>

                  {sub.reward_vouchers.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <Gift className="h-3 w-3" />
                      Voucher: {sub.reward_vouchers[0].code} (₹{sub.reward_vouchers[0].value})
                      {sub.reward_vouchers[0].is_used ? " — Used" : ""}
                    </div>
                  )}
                  {sub.rejection_reason && (
                    <p className="text-xs text-red-600">Rejected: {sub.rejection_reason}</p>
                  )}
                </div>

                {sub.status === "pending" && (
                  <div className="flex-shrink-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-stone-600">₹</label>
                      <input
                        type="number"
                        value={voucherValue}
                        onChange={(e) => setVoucherValue(Number(e.target.value))}
                        min={100}
                        max={500}
                        className="w-20 rounded border border-stone-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <button
                      onClick={() => handleApprove(sub.id)}
                      disabled={approving === sub.id}
                      className="w-full rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {approving === sub.id ? "..." : "Approve + Voucher"}
                    </button>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Rejection reason (optional)"
                      className="w-full rounded border border-stone-300 px-2 py-1 text-xs"
                    />
                    <button
                      onClick={() => handleReject(sub.id)}
                      className="w-full rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
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
