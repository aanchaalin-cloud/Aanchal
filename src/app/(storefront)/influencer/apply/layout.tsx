import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply to the Creator Program",
  description:
    "Apply to join the Aanchal Creator & Dancer Squad. Get free outfits, earn commissions, and get featured.",
  robots: { index: false },
};

export default function InfluencerApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
