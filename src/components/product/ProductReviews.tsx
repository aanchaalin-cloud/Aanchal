"use client";

import { useState, useEffect } from "react";
import { Star, CheckCircle } from "lucide-react";

type Review = {
  id: string;
  customer_name: string;
  rating: number;
  title: string | null;
  body: string;
  is_verified_purchase: boolean;
  created_at: string;
};

type ProductReviewsProps = {
  productId: string;
};

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch(`/api/reviews/product/${productId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setReviews(data.data);
          if (data.data.length > 0) {
            const avg = data.data.reduce((sum: number, r: Review) => sum + r.rating, 0) / data.data.length;
            setAverageRating(Math.round(avg * 10) / 10);
            setTotalReviews(data.data.length);
          }
        }
      } catch {
        // Silently fail — reviews are non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, [productId]);

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto h-6 w-6 animate-pulse rounded-full bg-[#95271D]/20" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-semibold text-[#1C1C1C]">{averageRating}</p>
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3.5 w-3.5 ${
                  s <= Math.round(averageRating)
                    ? "fill-[#D4A843] text-[#D4A843]"
                    : "text-[#E5D5C5]"
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] text-[#6B6B6B] mt-1">{totalReviews} review{totalReviews !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-[#E5D5C5]/50 pb-4 last:border-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-3 w-3 ${
                      s <= review.rating
                        ? "fill-[#D4A843] text-[#D4A843]"
                        : "text-[#E5D5C5]"
                    }`}
                  />
                ))}
              </div>
              {review.is_verified_purchase && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Verified Purchase
                </span>
              )}
            </div>
            {review.title && (
              <p className="text-sm font-medium text-[#1C1C1C]">{review.title}</p>
            )}
            <p className="text-sm text-[#6B6B6B] mt-1 leading-relaxed">{review.body}</p>
            <p className="text-[10px] text-[#6B6B6B] mt-2">
              {review.customer_name} · {new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
