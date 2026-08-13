"use client";

import Image from "next/image";
import { Star, CheckCircle } from "lucide-react";
import type { ProductReview } from "@/types";

type ProductReviewsProps = {
  reviews: ProductReview[];
};

export function ProductReviews({ reviews }: ProductReviewsProps) {
  if (reviews.length === 0) {
    return null;
  }

  const averageRating = Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;
  const totalReviews = reviews.length;

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

            {/* Review images (if any) */}
            {Array.isArray(review.images) && review.images.length > 0 && (
              <div className="mt-3">
                <div className="flex gap-2 overflow-x-auto">
                  {review.images.map((url: string, idx: number) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="relative inline-block h-20 w-20 overflow-hidden rounded">
                      <Image src={url} alt={`review-${review.id}-${idx}`} fill className="object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-[#6B6B6B] mt-2">
              {review.customer_name} · {new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
