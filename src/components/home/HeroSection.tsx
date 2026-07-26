"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, Play } from "lucide-react";

export function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [showReplay, setShowReplay] = useState(false);

  const handleReplay = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play();
      setShowReplay(false);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        video.pause();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-screen -mt-16 overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onEnded={() => setShowReplay(true)}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/Video1.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-[#95271D]/20 to-transparent" />

      <div className="relative z-10 flex items-center justify-center min-h-screen pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl text-center sm:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">
              Indian Craftsmanship, Modern Silhouettes
            </p>
            <h1 className="mt-4 text-6xl font-bold leading-tight text-white sm:text-7xl lg:text-8xl">
              AANCHAL
            </h1>
            <p className="mt-4 text-lg text-white/80 font-light tracking-wide">
              Where Heritage Meets Grace
            </p>
            <p className="mt-2 max-w-md text-sm text-white/60 leading-relaxed">
              Handcrafted clothing that honours tradition while embracing the elegance of contemporary design.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 justify-center sm:justify-start">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded bg-[#800020] px-6 py-3 text-sm font-medium text-white hover:bg-[#66001A] transition-colors"
              >
                Explore Collection
              </Link>
              <Link
                href="/shop?sort=newest"
                className="inline-flex items-center gap-2 rounded border border-white/40 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                New Arrivals
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showReplay && (
        <button
          type="button"
          onClick={handleReplay}
          className="absolute bottom-24 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors backdrop-blur-sm"
          aria-label="Replay video"
        >
          <Play className="h-5 w-5 ml-0.5" />
        </button>
      )}

      <button
        type="button"
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/50 hover:text-white/80 transition-colors animate-bounce"
        aria-label="Scroll down"
      >
        <span className="text-[10px] font-medium uppercase tracking-widest">Scroll</span>
        <ChevronDown className="h-4 w-4" />
      </button>
    </section>
  );
}