import type { Metadata } from "next";
import { HomepageSections } from "@/components/home/HomepageSections";

export const metadata: Metadata = {
  title: "Aanchal | Premium Indian Clothing Brand",
  description:
    "Discover graceful Indian clothing crafted for comfort, elegance, and everyday charm. Shop premium ethnic wear and boutique styles from Aanchal.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Aanchal | Premium Indian Clothing Brand",
    description:
      "Discover graceful Indian clothing crafted for comfort, elegance, and everyday charm. Shop premium ethnic wear and boutique styles from Aanchal.",
  },
};

export const revalidate = 60;

export default function HomePage() {
  return <HomepageSections />;
}
