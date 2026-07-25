"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Instagram, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";

const SLIDES = [
  {
    icon: Bell,
    title: "Get Notified",
    subtitle: "Be the first to know about new drops",
    description: "Sign up for exclusive updates on our latest collections, restocks, and special offers delivered straight to your inbox.",
    action: { label: "Subscribe", href: "/contact" },
  },
  {
    icon: Instagram,
    title: "Follow Us",
    subtitle: "Join the Aanchal community",
    description: "Follow us on Instagram for behind-the-scenes content, styling inspiration, and a closer look at the craftsmanship behind every piece.",
    action: { label: "Follow @aanchal", href: "#" },
  },
  {
    icon: Mail,
    title: "Contact Us",
    subtitle: "We'd love to hear from you",
    description: "Have a question about sizing, shipping, or custom orders? Our team is here to help you find the perfect piece.",
    action: { label: "Get in Touch", href: "/contact" },
  },
];

export function TextSlideshow() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`transition-all duration-700 ${
              idx === current ? "block animate-fade-in" : "hidden"
            }`}
          >
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#95271D]/10">
                <slide.icon className="h-7 w-7 text-[#95271D]" />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A843]">
                {slide.subtitle}
              </p>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#1C1C1C] sm:text-4xl">
                {slide.title}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-[#6B6B6B]">
                {slide.description}
              </p>
              <div className="mt-8">
                <Link
                  href={slide.action.href}
                  className="inline-flex items-center gap-2 rounded bg-[#95271D] px-6 py-3 text-sm font-medium text-[#D4A843] hover:bg-[#7A1F17] transition-colors"
                >
                  {slide.action.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}

        <div className="mt-12 flex items-center justify-center gap-3">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrent(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === current ? "w-8 bg-[#95271D]" : "w-2 bg-[#E5D5C5]"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
