"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BackButton } from "@/components/ui/BackButton";

export function StorefrontMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const padding = isHome
    ? scrolled
      ? "pt-[142px] lg:pt-24"
      : "pt-24"
    : "pt-[110px] lg:pt-16";

  return (
    <main className={cn("min-h-screen", padding)}>
      {!isHome && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-2 pb-1 sm:px-6 md:pt-3 lg:px-8">
          <BackButton />
        </div>
      )}
      {children}
    </main>
  );
}
