"use client";

import { Star } from "lucide-react";
import type { ProductReview } from "@/types";

export function ProductRating({ reviews }: { reviews: ProductReview[] }) {
  if (!reviews || reviews.length === 0) return null;

  const total = reviews.length;
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / total;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1" aria-label={`Rated ${avg.toFixed(1)} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= Math.round(avg)
                ? "fill-[#C41E3A] text-[#C41E3A]"
                : "fill-[#E5D5C5] text-[#E5D5C5]"
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-semibold text-[#1C1C1C]">
          {avg.toFixed(1)}
        </span>
      </div>
      <button
        type="button"
        onClick={() =>
          document
            .getElementById("customer-reviews")
            ?.scrollIntoView({ behavior: "smooth" })
        }
        className="text-sm text-[#800020] underline-offset-2 hover:underline"
      >
        {total} {total === 1 ? "rating" : "ratings"}
      </button>
      <span className="text-sm text-[#6B6B6B]">|</span>
      <button
        type="button"
        onClick={() =>
          document
            .getElementById("customer-reviews")
            ?.scrollIntoView({ behavior: "smooth" })
        }
        className="text-sm text-[#800020] underline-offset-2 hover:underline"
      >
        Rate this product
      </button>
      <details className="group relative">
        <summary className="cursor-pointer list-none text-sm text-[#6B6B6B] hover:text-[#800020]">
          Distribution
        </summary>
        <div className="absolute right-0 top-full z-10 mt-2 w-56 rounded-sm border border-[#E5D5C5] bg-white p-4 shadow-lg">
          {distribution.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2 py-0.5">
              <span className="w-6 text-xs text-[#6B6B6B]">{star} ★</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F1E6DE]">
                <div
                  className="h-full rounded-full bg-[#C41E3A]"
                  style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                />
              </div>
              <span className="w-6 text-right text-xs text-[#6B6B6B]">{count}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
