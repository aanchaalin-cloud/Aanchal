"use client";

import { useState, useEffect } from "react";
import { Star, CheckCircle, XCircle, Trash2 } from "lucide-react";

type Review = {
  id: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  title: string | null;
  body: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  is_featured: boolean;
  created_at: string;
  products: { name: string; slug: string } | null;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reviews");
      const data = await res.json();
      if (data.success) setReviews(data.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const filtered = reviews.filter((r) => {
    if (filter === "pending") return !r.is_approved;
    if (filter === "approved") return r.is_approved;
    return true;
  });

  const handleApprove = async (reviewId: string, featured: boolean) => {
    await fetch("/api/admin/reviews", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, is_approved: true, is_featured: featured }),
    });
    fetchReviews();
  };

  const handleReject = async (reviewId: string) => {
    await fetch("/api/admin/reviews", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, is_approved: false, is_featured: false }),
    });
    fetchReviews();
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Delete this review permanently?")) return;
    await fetch("/api/admin/reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId }),
    });
    fetchReviews();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Reviews</h1>
        <p className="text-sm text-stone-600 mt-1">{reviews.length} total reviews</p>
      </div>

      <div className="flex gap-2">
        {(["all", "pending", "approved"] as const).map((f) => (
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
        <p className="text-sm text-stone-600 py-8 text-center">No reviews to display.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((review) => (
            <div key={review.id} className="rounded-sm border border-stone-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-[#D4A843] text-[#D4A843]" : "text-stone-200"}`} />
                      ))}
                    </div>
                    {review.is_verified_purchase && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600">
                        <CheckCircle className="h-3 w-3" /> Verified
                      </span>
                    )}
                    {review.is_approved && (
                      <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">Approved</span>
                    )}
                    {review.is_featured && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">Featured</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-stone-900">{review.customer_name} · {review.customer_email}</p>
                  <p className="text-xs text-stone-500">{review.products?.name ?? "Unknown product"}</p>
                  {review.title && <p className="text-sm font-medium text-stone-900 mt-1">{review.title}</p>}
                  <p className="text-sm text-stone-600 mt-1">{review.body}</p>
                  <p className="text-[10px] text-stone-400 mt-1">{new Date(review.created_at).toLocaleString("en-IN")}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!review.is_approved && (
                    <>
                      <button onClick={() => handleApprove(review.id, false)} className="rounded p-1.5 text-green-600 hover:bg-green-50 transition-colors" title="Approve">
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleApprove(review.id, true)} className="rounded p-1.5 text-amber-600 hover:bg-amber-50 transition-colors" title="Approve + Feature">
                        <Star className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {review.is_approved && (
                    <button onClick={() => handleReject(review.id)} className="rounded p-1.5 text-orange-600 hover:bg-orange-50 transition-colors" title="Hide">
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(review.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
