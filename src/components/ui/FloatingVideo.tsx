"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, X, Volume2, VolumeX } from "lucide-react";

export function FloatingVideo() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hasDismissed, setHasDismissed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("aanchal_video_dismissed");
    if (dismissed) {
      setHasDismissed(true);
      return;
    }

    const timer = setTimeout(() => setIsOpen(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setHasDismissed(true);
    sessionStorage.setItem("aanchal_video_dismissed", "true");
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Respect prefers-reduced-motion
  const prefersReducedMotion = typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (hasDismissed || !isOpen || prefersReducedMotion) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      <div className="relative w-64 overflow-hidden rounded-lg border border-[#E5D5C5]/50 bg-white shadow-2xl sm:w-80">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#95271D] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#D4A843]">
            Your measurements. Your fit.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-0.5 text-white/70 hover:text-white transition-colors"
            aria-label="Close video"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Video */}
        <div className="relative aspect-video bg-[#1C1C1C]">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            preload="metadata"
          >
            <source src="/videos/custom-fit.mp4" type="video/mp4" />
          </video>

          {/* Overlay text */}
          <div className="absolute inset-0 flex items-center justify-center bg-[#1C1C1C]/30">
            <p className="text-center text-sm font-semibold text-white drop-shadow-lg sm:text-base">
              Your Aanchal.<br />Your measurements.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between bg-[#1C1C1C] px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="rounded p-1 text-white/70 hover:text-white transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="rounded p-1 text-white/70 hover:text-white transition-colors"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-white/50">Custom Fit by Aanchal</p>
        </div>
      </div>
    </div>
  );
}
