"use client";

import dynamic from "next/dynamic";

const FloatingVideo = dynamic(
  () => import("@/components/ui/FloatingVideo").then((m) => ({ default: m.FloatingVideo })),
  { ssr: false }
);

export function LazyFloatingVideo() {
  return <FloatingVideo />;
}
