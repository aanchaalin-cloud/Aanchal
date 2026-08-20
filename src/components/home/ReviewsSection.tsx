"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { getSectionContent, type HomepageSectionContent } from "@/lib/homepage-sections";

type Review = {
  id: string;
  name: string;
  rating: number;
  text: string;
  images: string[];
};

function ReviewCard({ review }: { review: Review }) {
  const hasImage = review.images.length > 0;
  const firstImage = review.images[0];

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E5D5C5]/60 transition-shadow hover:shadow-md">
      {/* Photo on top — littlebox.com style */}
      {hasImage && firstImage && (
        <div className="relative aspect-square w-full overflow-hidden bg-[#FFF0E8]">
          <Image
            src={firstImage}
            alt={`Review by ${review.name}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
          />
        </div>
      )}

      {/* Text below photo */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Stars */}
        <div className="mb-2 flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < review.rating
                  ? "fill-[#D4A843] text-[#D4A843]"
                  : "text-[#E5D5C5]"
              }`}
            />
          ))}
        </div>

        {/* Review text */}
        <p className="text-sm leading-relaxed text-[#1C1C1C] line-clamp-4">
          &ldquo;{review.text}&rdquo;
        </p>

        {/* Name */}
        <div className="mt-auto pt-3">
          <p className="text-xs font-semibold text-[#1C1C1C]">{review.name}</p>
        </div>
      </div>
    </div>
  );
}

export function ReviewsSection({ content }: { content?: HomepageSectionContent }) {
  const c = getSectionContent("reviews", content);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reviews/featured")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const dbReviews: Review[] = Array.isArray(json.data)
          ? json.data.map((r: { id: string; name: string; rating: number; text: string; images: string[] }) => ({
              id: r.id,
              name: r.name,
              rating: r.rating,
              text: r.text,
              images: r.images ?? [],
            }))
          : [];
        setReviews(dbReviews);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || reviews.length === 0) return null;

  return (
    <section className="overflow-hidden py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#95271D]">
            {c.eyebrow || "Testimonials"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#1C1C1C]">
            {c.headline || "What Our Customers Say"}
          </h2>
        </div>
      </div>

      {/* Horizontal scrollable grid */}
      <div className="overflow-x-auto scrollbar-hidden -mx-4 px-4">
        <div className="flex gap-4 pb-4 w-max">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="w-[260px] shrink-0 sm:w-[300px] lg:w-[320px]"
            >
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
