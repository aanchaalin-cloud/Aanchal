"use client";

import Image from "next/image";
import { Star, CheckCircle } from "lucide-react";
import type { ProductReview } from "@/types";

type ProductReviewsProps = {
  reviews: ProductReview[];
};

function ReviewCard({ review }: { review: ProductReview }) {
  const hasImages = Array.isArray(review.images) && review.images.length > 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E5D5C5]/60">
      {/* Photo on top */}
      {hasImages && (
        <div className="relative aspect-square w-full overflow-hidden bg-[#FFF0E8]">
          <Image
            src={review.images![0]}
            alt={`Review by ${review.customer_name}`}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      )}

      {/* Text below */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Stars + verified badge */}
        <div className="mb-2 flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3.5 w-3.5 ${
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
              Verified
            </span>
          )}
        </div>

        {/* Title */}
        {review.title && (
          <p className="text-sm font-semibold text-[#1C1C1C] mb-1">{review.title}</p>
        )}

        {/* Body */}
        <p className="text-sm leading-relaxed text-[#6B6B6B] line-clamp-4">
          {review.body}
        </p>

        {/* Additional images */}
        {hasImages && review.images!.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {review.images!.slice(1, 4).map((url, idx) => (
              <div key={url} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#FFF0E8]">
                <Image
                  src={url}
                  alt={`Review photo ${idx + 2}`}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Name + date */}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-[#1C1C1C]">{review.customer_name}</p>
          <p className="text-[10px] text-[#6B6B6B]">
            {new Date(review.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

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

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
