"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { getSectionContent, type HomepageSectionContent } from "@/lib/homepage-sections";

type Review = {
  id?: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  images: string[];
};

type DbReview = {
  id: string;
  name: string;
  rating: number;
  title: string | null;
  text: string;
  images: string[];
};

function buildReviews(content?: HomepageSectionContent): Review[] {
  const c = getSectionContent("reviews", content);
  const items = c.items ?? [];
  return items
    .map((item) => ({
      name: item.name || "Aanchal Customer",
      location: item.location || "",
      rating: Math.max(1, Math.min(5, item.rating ?? 5)),
      text: item.text || "",
      images: [],
    }))
    .filter((review) => review.text);
}

function getInitial(name: string) {
  return name.charAt(0);
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border-2 border-[#95271D] bg-white p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-1">
        {Array.from({ length: review.rating }, (_, i) => (
          <Star key={i} className="h-4 w-4 fill-[#D4A843] text-[#D4A843]" />
        ))}
      </div>
      <blockquote className="text-sm italic leading-relaxed text-[#6B6B6B] sm:text-base">
        &ldquo;{review.text}&rdquo;
      </blockquote>
      {review.images.length > 0 && (
        <div className="mt-4 flex gap-2">
          {review.images.slice(0, 3).map((url, idx) => (
            <div key={idx} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-[#FFF0E8]">
              <Image
                src={url}
                alt="Customer review photo"
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
      <div className="mt-auto flex items-center gap-3 pt-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#95271D] text-sm font-bold text-[#D4A843]">
          {getInitial(review.name)}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1C1C1C]">{review.name}</p>
          <p className="text-xs text-[#6B6B6B]">{review.location}</p>
        </div>
      </div>
    </div>
  );
}

export function ReviewsSection({ content }: { content?: HomepageSectionContent }) {
  const c = getSectionContent("reviews", content);
  const [reviews, setReviews] = useState<Review[]>(() => buildReviews(content));
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reviews/featured")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const dbReviews: Review[] = Array.isArray(json.data)
          ? (json.data as DbReview[]).map((r) => ({
              id: r.id,
              name: r.name,
              location: "Verified Buyer",
              rating: r.rating,
              text: r.title ? `${r.title}. ${r.text}` : r.text,
              images: r.images,
            }))
          : [];
        setReviews((prev) => {
          const existingTexts = new Set(prev.map((p) => p.text));
          const fresh = dbReviews.filter((r) => !existingTexts.has(r.text));
          return [...fresh, ...prev];
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  if (reviews.length === 0) return null;

  return (
    <section className="overflow-hidden py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#95271D]">
              {c.eyebrow || "Testimonials"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#1C1C1C]">
              {c.headline || "What Our Customers Say"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Previous reviews"
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#95271D] text-[#800020] transition-colors hover:bg-[#FFF0E8]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="Next reviews"
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#95271D] text-[#800020] transition-colors hover:bg-[#FFF0E8]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          aria-label="Customer reviews"
          className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-hidden pb-2"
        >
          {reviews.map((review, idx) => (
            <div
              key={review.id ?? `${review.name}-${idx}`}
              className="w-full max-w-[380px] shrink-0 snap-start px-2 sm:w-[46%] sm:max-w-none lg:w-[31.5%]"
            >
              <ReviewCard review={review} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}