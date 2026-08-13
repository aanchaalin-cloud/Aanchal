"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Play } from "lucide-react";
import { getSectionContent, type HomepageSectionContent } from "@/lib/homepage-sections";

export function HeroSection({ content }: { content?: HomepageSectionContent }) {
  const c = getSectionContent("hero", content);
  const videoUrl = c.videoUrl || "/Video1.mp4";
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [showReplay, setShowReplay] = useState(false);

  const tryPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {
      // Autoplay can be blocked before the browser considers the page
      // "user-activated". If playback fails for any reason, keep the poster
      // visible and let the user start playback manually via the replay button.
      setShowReplay(true);
    });
  }, []);

  const handleReplay = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      tryPlay();
      setShowReplay(false);
    }
  }, [tryPlay]);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    // Start playback once the browser can play the source.
    video.addEventListener("canplay", tryPlay, { once: true });
    if (video.readyState >= 2) tryPlay();

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const visible = rect.bottom > 0 && rect.top < window.innerHeight;
      if (visible) {
        tryPlay();
      } else {
        video.pause();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      video.removeEventListener("canplay", tryPlay);
      window.removeEventListener("scroll", onScroll);
    };
  }, [tryPlay]);

  return (
    <section ref={sectionRef} className="relative min-h-screen -mt-16 overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/anarkali.webp"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-[#95271D]/20 to-transparent" />

      <div className="relative z-10 flex items-center justify-center min-h-screen pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl rounded-lg bg-black/15 p-6 backdrop-blur-sm text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
              {c.eyebrow || "Premium Indian Ethnic Wear"}
            </p>
            <div className="mt-4 flex justify-center sm:justify-start">
              <div className="inline-flex items-center rounded-full bg-white/95 px-6 py-3 shadow-xl sm:px-8 sm:py-4">
                <Image
                  src="/logo.png"
                  alt="Aanchal"
                  width={952}
                  height={224}
                  priority
                  className="h-10 w-auto object-contain sm:h-14 lg:h-16"
                />
              </div>
            </div>
            <p className="mt-4 text-xl text-white/90 font-light tracking-wide sm:text-2xl">
              {c.headline || "Premium Exotic Anarkali"}
            </p>
            <p className="mt-3 text-base font-medium text-[#D4A843] sm:text-lg">
              {c.subheadline || "Custom Tailored for You"}
            </p>
            <p className="mt-2 max-w-md text-sm text-white/70 leading-relaxed">
              {c.description || "Order Today — handcrafted ethnic wear made to your measurements."}
            </p>
            <div className="mt-8 flex items-center justify-center sm:justify-start">
              <Link
                href={c.ctaHref || "/shop"}
                className="inline-flex items-center gap-2 rounded-full bg-[#800020] px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-[#95271D]"
              >
                {c.ctaLabel || "Shop Now"}
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