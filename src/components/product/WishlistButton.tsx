"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  className,
  size = "md",
}: {
  productId: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isWishlisted, toggleWishlist, loading } = useWishlist();
  const [busy, setBusy] = useState(false);

  const active = isWishlisted(productId);
  const pendingState = loading || busy;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pendingState) return;
    setBusy(true);

    const result = await toggleWishlist(productId);
    if (result.requiresLogin) {
      router.push(`/login?next=${encodeURIComponent(pathname ?? "/")}`);
    }
    setBusy(false);
  };

  const box = size === "sm" ? "h-10 w-10" : "h-10 w-10";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pendingState}
      aria-label={active ? "Remove from wishlist" : loading ? "Loading wishlist" : "Add to wishlist"}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center rounded-full bg-white/95 shadow-sm border transition-all hover:scale-105",
        box,
        active ? "text-[#C41E3A] border-[#C41E3A]/30" : "text-[#6B6B6B] border-[#E5D5C5]",
        pendingState && "opacity-60",
        className
      )}
    >
      <Heart
        className={cn(size === "sm" ? "h-4 w-4" : "h-5 w-5", active && "fill-current")}
      />
    </button>
  );
}
