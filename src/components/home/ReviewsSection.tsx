"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { getSectionContent, type HomepageSectionContent } from "@/lib/homepage-sections";

const SLIDE_MS = 3500;

type Review = {
  name: string;
  location: string;
  rating: number;
  text: string;
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
    }))
    .filter((review) => review.text);
}

function getInitial(name: string) {
  return name.charAt(0);
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="h-full rounded-2xl border-2 border-[#95271D] bg-white p-8 sm:p-10">
      <div className="mb-5 flex items-center gap-1">
        {Array.from({ length: review.rating }, (_, i) => (
          <Star key={i} className="h-4 w-4 fill-[#D4A843] text-[#D4A843]" />
        ))}
      </div>
      <blockquote className="text-base italic leading-relaxed text-[#6B6B6B] sm:text-lg">
        &ldquo;{review.text}&rdquo;
      </blockquote>
      <div className="mt-6 flex items-center gap-3">
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
  const REVIEWS = buildReviews(content);
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(1);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const compute = () =>
      setPerView(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3);
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const maxIndex = Math.max(0, REVIEWS.length - perView);

  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex);
  }, [maxIndex, index]);

  useEffect(() => {
    if (!visible || hovered || reducedMotion) return;
    const timer = setInterval(
      () =>
        setIndex((prev) => (prev + 1 > maxIndex ? 0 : prev + 1)),
      SLIDE_MS
    );
    return () => clearInterval(timer);
  }, [visible, hovered, reducedMotion, maxIndex]);

  const goTo = useCallback((nextIndex: number) => {
    setIndex(Math.max(0, Math.min(nextIndex, REVIEWS.length - 1)));
  }, [REVIEWS.length]);

  if (REVIEWS.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="overflow-hidden py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
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
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label="Previous reviews"
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#95271D] text-[#800020] transition-colors hover:bg-[#FFF0E8] disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={index >= maxIndex}
              aria-label="Next reviews"
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#95271D] text-[#800020] transition-colors hover:bg-[#FFF0E8] disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-hidden">
          <div
            className={
              reducedMotion ? "flex" : "flex transition-transform duration-700 ease-in-out"
            }
            style={{ transform: `translateX(-${(index * 100) / perView}%)` }}
          >
            {REVIEWS.map((review, idx) => (
              <div
                key={`${review.name}-${idx}`}
                className="w-full shrink-0 px-2 sm:w-1/2 sm:px-3 lg:w-1/3"
              >
                <ReviewCard review={review} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }, (_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => goTo(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === index ? "w-6 bg-[#95271D]" : "w-2 bg-[#E5D5C5]"
              }`}
              aria-label={`Go to reviews ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
