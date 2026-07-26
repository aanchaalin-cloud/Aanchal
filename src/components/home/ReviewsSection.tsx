"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const REVIEWS = [
  {
    name: "Priya S.",
    location: "Mumbai",
    rating: 5,
    text: "Absolutely in love with my silk saree! The quality is exceptional and the craftsmanship is evident in every detail. Received so many compliments at the wedding.",
  },
  {
    name: "Anita K.",
    location: "Delhi",
    rating: 5,
    text: "The fit of the kurta set is perfect. I appreciate how the brand blends traditional aesthetics with modern silhouettes. Fast shipping and beautiful packaging too!",
  },
  {
    name: "Rohini M.",
    location: "Bangalore",
    rating: 5,
    text: "Ordered the fusion wear set for a family function and it was a hit. The fabric is comfortable, the colors are rich, and the embroidery is stunning. Will definitely order again.",
  },
  {
    name: "Meera J.",
    location: "Pune",
    rating: 5,
    text: "Aanchal has become my go-to for ethnic wear. The attention to detail, the quality of fabric, and the customer service are all outstanding. Truly a premium experience.",
  },
];

export function ReviewsSection() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % REVIEWS.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + REVIEWS.length) % REVIEWS.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 7000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
            Testimonials
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#1C1C1C]">
            What Our Customers Say
          </h2>
        </div>

        <div className="relative">
          {REVIEWS.map((review, idx) => (
            <div
              key={idx}
              className={`transition-all duration-700 ${
                idx === current ? "block animate-fade-in" : "hidden"
              }`}
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#800020] text-[#800020]" />
                  ))}
                </div>
                <blockquote className="mt-6 text-base leading-relaxed text-[#6B6B6B] italic sm:text-lg">
                  &ldquo;{review.text}&rdquo;
                </blockquote>
                <div className="mt-6">
                  <p className="text-sm font-semibold text-[#1C1C1C]">{review.name}</p>
                  <p className="text-xs text-[#6B6B6B]">{review.location}</p>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm border border-[#E5D5C5]/50 text-[#6B6B6B] hover:text-[#800020] hover:border-[#800020]/30 transition-colors"
            aria-label="Previous review"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm border border-[#E5D5C5]/50 text-[#6B6B6B] hover:text-[#800020] hover:border-[#800020]/30 transition-colors"
            aria-label="Next review"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2">
          {REVIEWS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrent(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === current ? "w-6 bg-[#800020]" : "w-2 bg-[#E5D5C5]"
              }`}
              aria-label={`Go to review ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
