"use client";

import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { Messages } from "@/lib/messages";

type Application = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  social_handle: string;
  social_link: string;
  platform: string;
  followers: string | null;
  niche: string | null;
  desired_promo_code: string | null;
  bio: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  created_at: string;
};

export default function AdminInfluencersPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [approvedInfo, setApprovedInfo] = useState<{ id: string; referral_code: string; email: string; temp_password: string } | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/influencers");
      const data = await res.json();
      if (data.success) setApplications(data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const filtered = applications.filter((a) => {
    if (filter === "pending") return a.status === "pending";
    if (filter === "approved") return a.status === "approved";
    if (filter === "rejected") return a.status === "rejected";
    return true;
  });

  const handleReview = async (applicationId: string, decision: "approved" | "rejected") => {
    setReviewing(applicationId);
    try {
      const res = await fetch("/api/admin/influencers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, decision }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.referral_code) {
          setApprovedInfo({
            id: applicationId,
            referral_code: data.data.referral_code,
            email: data.data.email,
            temp_password: data.data.temp_password,
          });
        }
        fetchApplications();
      } else {
        alert(data.error ?? "Failed");
      }
    } catch {
      alert(Messages.genericError);
    } finally {
      setReviewing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Influencer Applications</h1>
        <p className="text-sm text-stone-600 mt-1">Review applications and generate referral codes</p>
      </div>

      {approvedInfo && (
        <div className="rounded-sm border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800">Influencer Approved!</p>
          <div className="mt-2 space-y-1 text-sm text-green-700">
            <p>Email: <span className="font-mono">{approvedInfo.email}</span></p>
            <p>Referral Code: <span className="font-mono font-bold">{approvedInfo.referral_code}</span></p>
            <p>Temp Password: <span className="font-mono">{approvedInfo.temp_password}</span></p>
          </div>
          <p className="mt-2 text-xs text-green-600">Share the email, referral code, and temp password with the influencer.</p>
          <button onClick={() => setApprovedInfo(null)} className="mt-2 text-xs text-green-700 underline">Dismiss</button>
        </div>
      )}

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
          {filtered.map((a) => (
            <div key={a.id} className="rounded-sm border border-stone-200 bg-white p-5">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      a.status === "approved" ? "bg-green-100 text-green-800" :
                      a.status === "rejected" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>{a.status}</span>
                    <span className="text-xs text-stone-500">{a.platform}</span>
                    {a.followers && <span className="text-xs text-stone-500">{a.followers} followers</span>}
                  </div>

                  <p className="text-sm font-medium text-stone-900">{a.full_name}</p>
                  <p className="text-xs text-stone-500">{a.email} | {a.phone}</p>
                  <p className="text-xs text-stone-500">
                    Handle: <span className="font-medium">{a.social_handle}</span>
                  </p>
                  <p className="text-xs text-stone-500">
                    Profile: <a href={a.social_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                      {a.social_link} <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                  {a.niche && (
                    <p className="text-xs text-stone-600">
                      Niche: <span className="font-medium">{a.niche}</span>
                    </p>
                  )}
                  {a.desired_promo_code && (
                    <p className="text-xs text-stone-600">
                      Desired code: <span className="font-mono font-medium">{a.desired_promo_code}</span>
                    </p>
                  )}
                  <p className="text-sm text-stone-600 italic">{a.bio}</p>
                  <p className="text-[10px] text-stone-400">
                    Applied: {new Date(a.created_at).toLocaleString("en-IN")}
                    {a.reviewed_at ? ` | Reviewed: ${new Date(a.reviewed_at).toLocaleString("en-IN")}` : ""}
                  </p>
                </div>

                {a.status === "pending" && (
                  <div className="flex-shrink-0 lg:w-56">
                    <button
                      onClick={() => handleReview(a.id, "approved")}
                      disabled={reviewing === a.id}
                      className="w-full rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {reviewing === a.id ? "..." : "Approve + Generate Code"}
                    </button>
                    <button
                      onClick={() => handleReview(a.id, "rejected")}
                      disabled={reviewing === a.id}
                      className="mt-2 w-full rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
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
