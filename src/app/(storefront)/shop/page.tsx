import type { Metadata } from "next";
import { getActiveProductCatalog } from "@/lib/queries/products";
import { FALLBACK_PRODUCTS } from "@/lib/data/fallback-products";
import { ShopPageClient } from "./ShopPageClient";
import type { ProductWithDetails } from "@/types";

export const metadata: Metadata = {
  title: "Shop All Products",
  description:
    "Browse our full collection of handcrafted Indian clothing — sarees, kurtas, lehengas, and more. Find your perfect fit at Aanchal.",
  openGraph: {
    title: "Shop All Products | Aanchal",
    description:
      "Browse our full collection of handcrafted Indian clothing — sarees, kurtas, lehengas, and more.",
  },
};

export const revalidate = 60;

export default async function ShopPage() {
  const result = await getActiveProductCatalog();

  const products: ProductWithDetails[] = result.data ?? FALLBACK_PRODUCTS;

  return <ShopPageClient products={products} />;
}
