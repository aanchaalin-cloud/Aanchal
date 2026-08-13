import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Your Order",
  description:
    "Track your Aanchal order status, payment details, and delivery timeline using your order number.",
  alternates: {
    canonical: "/track-order",
  },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
