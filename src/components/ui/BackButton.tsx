"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({
  href = "/",
  label = "Back",
}: {
  href?: string;
  label?: string;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(href);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-[#800020] transition-colors hover:bg-[#FFF0E8]"
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
