"use client";

import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";

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
    text: "Ordered the fusion wear set for a family function and it was a hit. The fabric is comfortable, the colors are rich, and the embroidery is stunning.",
  },
  {
    name: "Meera J.",
    location: "Pune",
    rating: 5,
    text: "Aanchal has become my go-to for ethnic wear. The attention to detail, the quality of fabric, and the customer service are all outstanding.",
  },
  {
    name: "Deepa R.",
    location: "Chennai",
    rating: 5,
    text: "The custom fit option is a game changer. I finally have a lehenga that fits perfectly without alterations. The personalisation request was handled beautifully.",
  },
  {
    name: "Kavitha N.",
    location: "Hyderabad",
    rating: 5,
    text: "Bought the Anarkali set for my sister's engagement. Everyone thought it was designer! The gold thread work is exquisite and the fabric drapes like a dream.",
  },
  {
    name: "Shreya P.",
    location: "Kolkata",
    rating: 5,
    text: "I was nervous ordering online but the measurements form was so easy to follow. The dress fits like it was made for me — because it literally was! Will order again.",
  },
  {
    name: "Nandini V.",
    location: "Jaipur",
    rating: 5,
    text: "The Bandhani print kurta is stunning. Rich colours, comfortable cotton, and the handloom feel is authentic. Aanchal truly honours Indian textile traditions.",
  },
  {
    name: "Fatima Z.",
    location: "Lucknow",
    rating: 5,
    text: "Beautiful chikankari work on the white kurta set. I wore it to an Eid gathering and received endless compliments. The packaging was lovely too — felt like unwrapping a gift.",
  },
  {
    name: "Lakshmi T.",
    location: "Coimbatore",
    rating: 5,
    text: "Third order from Aanchal and they never disappoint. The consistency in quality is what keeps me coming back. My mother loves their cotton sarees.",
  },
];

function getInitial(name: string) {
  return name.charAt(0);
}

export function ReviewsSection() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % REVIEWS.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 3000);
    return () => clearInterval(timer);
  }, [next]);

  const review = REVIEWS[current];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#95271D]">
            Testimonials
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#1C1C1C]">
            What Our Customers Say
          </h2>
        </div>

        {/* Review card with visible stroke border */}
        <div className="mx-auto max-w-2xl rounded-2xl border-[3px] border-[#95271D] bg-white p-8 sm:p-10 transition-all duration-500 animate-fade-in">
          {/* Stars */}
          <div className="flex items-center gap-1 mb-5">
            {Array.from({ length: review.rating }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-[#D4A843] text-[#D4A843]" />
            ))}
          </div>

          {/* Quote */}
          <blockquote className="text-base leading-relaxed text-[#6B6B6B] italic sm:text-lg">
            &ldquo;{review.text}&rdquo;
          </blockquote>

          {/* Author */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#95271D] text-[#D4A843] text-sm font-bold">
              {getInitial(review.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1C1C1C]">{review.name}</p>
              <p className="text-xs text-[#6B6B6B]">{review.location}</p>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div className="mt-8 flex items-center justify-center gap-2">
          {REVIEWS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrent(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === current ? "w-6 bg-[#95271D]" : "w-2 bg-[#E5D5C5]"
              }`}
              aria-label={`Go to review ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
