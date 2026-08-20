"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type CollectionItem = {
  name: string;
  image: string;
  href: string;
};

function CollectionCard({
  item,
  priority,
}: {
  item: CollectionItem;
  priority?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className="group relative w-[260px] flex-shrink-0 sm:w-[300px] lg:w-[320px]"
      aria-label={`View ${item.name}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#FFF0E8] ring-1 ring-[#E5D5C5]/60 shadow-sm transition-shadow duration-300 group-hover:shadow-md">
        <Image
          src={item.image}
          alt={item.name}
          fill
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 260px, (max-width: 1024px) 300px, 320px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <span className="inline-block rounded-full bg-white/90 px-5 py-1.5 text-sm font-semibold text-[#800020] shadow-md backdrop-blur-sm">
            View Collection
          </span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <h3 className="text-lg font-medium text-[#1C1C1C] transition-colors group-hover:text-[#800020]">
          {item.name}
        </h3>
      </div>
    </Link>
  );
}

const RESUME_DELAY_MS = 4000;
const SCROLL_DURATION_S = 45;

export function CollectionsScroller({
  collections,
}: {
  collections: CollectionItem[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const autoScrollRef = useRef(true);
  const interactingRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTimeRef = useRef(0);
  const oneSetWidthRef = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || collections.length === 0) return;

    const measure = () => {
      const children = Array.from(track.children) as HTMLElement[];
      const dup = collections.length;
      if (children.length <= dup) return;
      const firstRect = children[0].getBoundingClientRect();
      const midRect = children[dup].getBoundingClientRect();
      oneSetWidthRef.current = midRect.left - firstRect.left;
    };

    const raf = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(track);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [collections.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reducedMotion || collections.length === 0) return;

    const animate = (now: number) => {
      if (autoScrollRef.current && !interactingRef.current) {
        const oneSet = oneSetWidthRef.current;
        if (oneSet > 0 && container.scrollWidth > container.clientWidth) {
          const dt = lastTimeRef.current > 0 ? (now - lastTimeRef.current) / 1000 : 0;
          container.scrollLeft += (oneSet / SCROLL_DURATION_S) * dt;
          if (container.scrollLeft >= oneSet) {
            container.scrollLeft -= oneSet;
          }
        }
      }
      lastTimeRef.current = now;
      rafRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reducedMotion, collections.length]);

  const handlePointerDown = useCallback(() => {
    interactingRef.current = true;
    autoScrollRef.current = false;
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    interactingRef.current = false;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      const container = containerRef.current;
      const oneSet = oneSetWidthRef.current;
      if (container && oneSet > 0) {
        container.scrollLeft = container.scrollLeft % oneSet;
      }
      lastTimeRef.current = 0;
      autoScrollRef.current = true;
    }, RESUME_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      autoScrollRef.current = false;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (window.matchMedia("(pointer: fine)").matches && !interactingRef.current) {
      lastTimeRef.current = 0;
      autoScrollRef.current = true;
    }
  }, []);

  const items = [...collections, ...collections];

  return (
    <div
      ref={containerRef}
      className="overflow-x-auto scrollbar-hidden"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={trackRef} className="flex gap-6 w-max py-1">
        {items.map((item, idx) => (
          <CollectionCard
            key={`${item.image}-${idx}`}
            item={item}
            priority={idx < 3}
          />
        ))}
      </div>
    </div>
  );
}
