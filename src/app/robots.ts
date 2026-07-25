import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://aanchal.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/checkout/", "/cart/", "/order-success/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
