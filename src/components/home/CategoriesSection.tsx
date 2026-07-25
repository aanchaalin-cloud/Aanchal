"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const TOP_COLLECTIONS = [
  {
    name: "Black Anarkali",
    image: "/black.jpeg",
    href: "/shop?category=Anarkali",
  },
  {
    name: "Red Anarkali",
    image: "/red.jpeg",
    href: "/shop?category=Anarkali",
  },
  {
    name: "Blue Anarkali",
    image: "/blue.jpeg",
    href: "/shop?category=Anarkali",
  },
];

/* Curtain shapes: fan from left-center / right-center tieback */
const CLIP_LEFT =
  "polygon(0% 50%, 0% 0%, 44% 0%, 34% 30%, 30% 50%, 34% 70%, 44% 100%, 0% 100%)";
const CLIP_RIGHT =
  "polygon(100% 50%, 100% 0%, 56% 0%, 66% 30%, 70% 50%, 66% 70%, 56% 100%, 100% 100%)";

/* Mahroon + gold brocade background (CSS-only) */
const MAHROON_BG =
  "linear-gradient(135deg, #95271D 0%, #7A1F17 40%, #95271D 70%, #861F19 100%)";

const GOLD_PATTERN =
  "radial-gradient(ellipse 6px 8px at 25% 25%, rgba(212,168,67,0.18) 0%, transparent 100%), " +
  "radial-gradient(ellipse 6px 8px at 75% 75%, rgba(212,168,67,0.18) 0%, transparent 100%), " +
  "radial-gradient(ellipse 4px 5px at 50% 10%, rgba(212,168,67,0.12) 0%, transparent 100%), " +
  "radial-gradient(ellipse 4px 5px at 50% 90%, rgba(212,168,67,0.12) 0%, transparent 100%)";

const GOLD_FOLD_LINES =
  "repeating-linear-gradient(105deg, transparent, transparent 16px, rgba(212,168,67,0.08) 16px, rgba(212,168,67,0.08) 17px)";

export function CategoriesSection() {
  const [touched, setTouched] = useState<number | null>(null);

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
            Handpicked for You
          </p>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-[#1C1C1C]">
            Top Collection
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {TOP_COLLECTIONS.map((item, idx) => (
            <Link
              key={idx}
              href={item.href}
              className="group block"
              onTouchStart={() => setTouched(touched === idx ? null : idx)}
            >
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-md ring-1 ring-[#E5D5C5]/50">
                {/* Dress image */}
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />

                {/* ── Curtain overlay ── */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                  {/* ── Left curtain ── */}
                  <div
                    className={
                      "absolute inset-0 transition-all duration-600 ease-[cubic-bezier(.4,0,.2,1)] " +
                      (touched === idx ? "opacity-0 -translate-x-full " : "") +
                      "md:group-hover:opacity-0 md:group-hover:-translate-x-full"
                    }
                    style={{ clipPath: CLIP_LEFT }}
                  >
                    {/* Base mahroon */}
                    <div
                      className="absolute inset-0"
                      style={{ backgroundImage: MAHROON_BG }}
                    />
                    {/* Gold brocade spots */}
                    <div
                      className="absolute inset-0"
                      style={{ backgroundImage: GOLD_PATTERN }}
                    />
                    {/* Gold fold lines */}
                    <div
                      className="absolute inset-0"
                      style={{ backgroundImage: GOLD_FOLD_LINES }}
                    />
                    {/* Gold inner-edge trim */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to right, transparent 55%, rgba(212,168,67,0.35) 85%, rgba(212,168,67,0.55) 100%)",
                      }}
                    />
                    {/* Top & bottom gold border */}
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#D4A843]/60 via-[#D4A843]/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#D4A843]/60 via-[#D4A843]/30 to-transparent" />
                    {/* Highlight sheen */}
                    <div
                      className="absolute inset-0 opacity-25"
                      style={{
                        background:
                          "linear-gradient(160deg, rgba(232,198,106,0.6) 0%, transparent 35%)",
                      }}
                    />
                  </div>

                  {/* ── Right curtain ── */}
                  <div
                    className={
                      "absolute inset-0 transition-all duration-600 ease-[cubic-bezier(.4,0,.2,1)] " +
                      (touched === idx ? "opacity-0 translate-x-full " : "") +
                      "md:group-hover:opacity-0 md:group-hover:translate-x-full"
                    }
                    style={{ clipPath: CLIP_RIGHT }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(225deg, #95271D 0%, #7A1F17 40%, #95271D 70%, #861F19 100%)",
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{ backgroundImage: GOLD_PATTERN }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(75deg, transparent, transparent 16px, rgba(212,168,67,0.08) 16px, rgba(212,168,67,0.08) 17px)",
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to left, transparent 55%, rgba(212,168,67,0.35) 85%, rgba(212,168,67,0.55) 100%)",
                      }}
                    />
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-l from-[#D4A843]/60 via-[#D4A843]/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-l from-[#D4A843]/60 via-[#D4A843]/30 to-transparent" />
                    <div
                      className="absolute inset-0 opacity-25"
                      style={{
                        background:
                          "linear-gradient(200deg, rgba(232,198,106,0.6) 0%, transparent 35%)",
                      }}
                    />
                  </div>

                  {/* ── Tieback ornaments (left & right centre) ── */}
                  {/* Left rosette */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center -ml-1">
                    <div className="h-4 w-4 rounded-full bg-gradient-to-br from-[#E8C66A] to-[#B8922A] shadow-md ring-2 ring-[#E8C66A]/50" />
                    <div className="h-6 w-[2px] bg-gradient-to-b from-[#D4A843] to-[#B8922A]/40 mt-0.5" />
                    <div className="h-2 w-2 rotate-45 bg-[#D4A843]/80 mt-0.5" />
                  </div>
                  {/* Right rosette */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center -mr-1">
                    <div className="h-4 w-4 rounded-full bg-gradient-to-br from-[#E8C66A] to-[#B8922A] shadow-md ring-2 ring-[#E8C66A]/50" />
                    <div className="h-6 w-[2px] bg-gradient-to-b from-[#D4A843] to-[#B8922A]/40 mt-0.5" />
                    <div className="h-2 w-2 rotate-45 bg-[#D4A843]/80 mt-0.5" />
                  </div>
                </div>

                {/* View overlay on hover/touch */}
                <div
                  className={
                    "absolute bottom-4 left-1/2 -translate-x-1/2 z-20 rounded-full bg-white/90 backdrop-blur-sm px-5 py-1.5 shadow-md transition-all duration-300 " +
                    (touched === idx
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0")
                  }
                >
                  <span className="text-sm font-semibold text-[#800020]">
                    View Collection
                  </span>
                </div>
              </div>

              {/* Card label */}
              <div className="mt-4 text-center">
                <h3 className="text-lg font-medium text-[#1C1C1C] group-hover:text-[#800020] transition-colors">
                  {item.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
