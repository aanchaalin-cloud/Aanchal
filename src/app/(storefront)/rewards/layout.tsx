import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Earn a Reward",
  description:
    "Share your Aanchal experience on social media and earn a discount voucher for your next purchase.",
  alternates: {
    canonical: "/rewards",
  },
};

export default function RewardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
