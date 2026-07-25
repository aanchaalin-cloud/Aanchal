import type { Metadata } from "next";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { BannerSection } from "@/components/home/BannerSection";
import { TrendingSection } from "@/components/home/TrendingSection";
import { TextSlideshow } from "@/components/home/TextSlideshow";
import { ReviewsSection } from "@/components/home/ReviewsSection";

export const metadata: Metadata = {
  title: "Aanchal | Premium Indian Clothing Brand",
  description:
    "Discover graceful Indian clothing crafted for comfort, elegance, and everyday charm. Shop premium ethnic wear and boutique styles from Aanchal.",
  openGraph: {
    title: "Aanchal | Premium Indian Clothing Brand",
    description:
      "Discover graceful Indian clothing crafted for comfort, elegance, and everyday charm. Shop premium ethnic wear and boutique styles from Aanchal.",
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CategoriesSection />
      <BannerSection />
      <TrendingSection />
      <TextSlideshow />
      <ReviewsSection />
    </>
  );
}
