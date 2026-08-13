"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getSectionContent, type HomepageSectionContent } from "@/lib/homepage-sections";
import { getSectionIcon } from "@/lib/section-icons";

type Slide = {
  icon: ReturnType<typeof getSectionIcon>;
  title: string;
  subtitle: string;
  description: string;
  action: { label: string; href: string };
};

function buildSlides(content?: HomepageSectionContent): Slide[] {
  const c = getSectionContent("text-slideshow", content);
  const items = c.items?.length
    ? c.items
    : [
        {
          icon: "Bell",
          title: "Get Notified",
          subtitle: "Be the first to know about new drops",
          description:
            "Sign up for exclusive updates on our latest collections, restocks, and special offers delivered straight to your inbox.",
          actionLabel: "Subscribe",
          actionHref: "/contact",
        },
        {
          icon: "Instagram",
          title: "Follow Us",
          subtitle: "Join the Aanchal community",
          description:
            "Follow us on Instagram for behind-the-scenes content, styling inspiration, and a closer look at the craftsmanship behind every piece.",
          actionLabel: "Follow @aanchal",
          actionHref: "/contact",
        },
        {
          icon: "Mail",
          title: "Contact Us",
          subtitle: "We’d love to hear from you",
          description:
            "Have a question about sizing, shipping, or custom orders? Our team is here to help you find the perfect piece.",
          actionLabel: "Get in Touch",
          actionHref: "/contact",
        },
      ];

  return items
    .map((item) => ({
      icon: getSectionIcon(item.icon),
      title: item.title || "Untitled",
      subtitle: item.subtitle || "",
      description: item.description || "",
      action: {
        label: item.actionLabel || "Learn More",
        href: item.actionHref && item.actionHref !== "#" ? item.actionHref : "/",
      },
    }))
    .filter((slide) => slide.title);
}

export function TextSlideshow({ content }: { content?: HomepageSectionContent }) {
  const SLIDES = buildSlides(content);
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % Math.max(SLIDES.length, 1));
  }, [SLIDES.length]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  if (SLIDES.length === 0) return null;

  return (
    <section className="bg-[#95271D] py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`transition-all duration-700 ${
              idx === current ? "block animate-fade-in" : "hidden"
            }`}
          >
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#D4A843]/15">
                <slide.icon className="h-7 w-7 text-[#D4A843]" />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#D4A843]/80">
                {slide.subtitle}
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                {slide.title}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/60">
                {slide.description}
              </p>
              <div className="mt-8">
                <Link
                  href={slide.action.href}
                  className="inline-flex items-center gap-2 rounded bg-[#D4A843] px-6 py-3 text-sm font-medium text-[#95271D] hover:bg-[#E8C66A] transition-colors"
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
                idx === current ? "w-8 bg-[#D4A843]" : "w-2 bg-white/30"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
