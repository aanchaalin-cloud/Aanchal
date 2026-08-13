import type { MetadataRoute } from "next";
import { getActiveProductSitemapEntries } from "@/lib/queries/products";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://aanchal.in";

const STATIC_ROUTES = [
  { url: "/", priority: 1.0, changeFrequency: "weekly" as const },
  { url: "/shop", priority: 0.9, changeFrequency: "daily" as const },
  { url: "/contact", priority: 0.6, changeFrequency: "monthly" as const },
  { url: "/shipping-policy", priority: 0.4, changeFrequency: "monthly" as const },
  { url: "/return-policy", priority: 0.4, changeFrequency: "monthly" as const },
  { url: "/privacy-policy", priority: 0.3, changeFrequency: "monthly" as const },
  { url: "/terms", priority: 0.3, changeFrequency: "monthly" as const },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let productEntries: MetadataRoute.Sitemap = [];

  try {
    const products = await getActiveProductSitemapEntries();
    productEntries = products.map((p) => ({
      url: `${BASE_URL}/products/${p.slug}`,
      lastModified: new Date(p.updated_at ?? p.created_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // If product fetch fails, just return static routes
  }

  return [
    ...STATIC_ROUTES.map((r) => ({
      url: `${BASE_URL}${r.url}`,
      lastModified: new Date(),
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...productEntries,
  ];
}
