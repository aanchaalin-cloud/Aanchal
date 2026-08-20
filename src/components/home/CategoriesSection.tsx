import Link from "next/link";
import { getActiveProductCatalog } from "@/lib/queries/products";
import type { ProductWithDetails } from "@/types";
import { getPrimarySlideshowImage } from "@/lib/product-images";
import { CollectionsScroller } from "./CollectionsScroller";

type CollectionItem = {
  name: string;
  image: string;
  href: string;
};

const TOP_COLLECTIONS: CollectionItem[] = [
  { name: "Black Anarkali", image: "/images/product-placeholder.svg", href: "/shop?category=Anarkali" },
  { name: "Red Anarkali", image: "/images/product-placeholder.svg", href: "/shop?category=Anarkali" },
  { name: "Blue Anarkali", image: "/images/product-placeholder.svg", href: "/shop?category=Anarkali" },
  { name: "Light Blue Anarkali", image: "/images/product-placeholder.svg", href: "/shop?category=Anarkali" },
  { name: "Black Classic", image: "/images/product-placeholder.svg", href: "/shop?category=Anarkali" },
  { name: "Blue Classic", image: "/images/product-placeholder.svg", href: "/shop?category=Anarkali" },
  { name: "White Anarkali", image: "/images/product-placeholder.svg", href: "/shop?category=Anarkali" },
];

function collectionImage(product: ProductWithDetails): string {
  return getPrimarySlideshowImage(product.product_images ?? []) ?? "/images/product-placeholder.svg";
}

export async function CategoriesSection() {
  const result = await getActiveProductCatalog();
  const dbProducts = result.data ?? [];

  const anarkalis = dbProducts.filter((p) =>
    (p.category ?? "").toLowerCase().includes("anarkali"),
  );
  const topProducts = (anarkalis.length > 0 ? anarkalis : dbProducts).slice(0, 7);

  const collections: CollectionItem[] =
    topProducts.length > 0
      ? topProducts.map((p) => ({
          name: p.name,
          image: collectionImage(p),
          href: `/products/${p.slug}`,
        }))
      : TOP_COLLECTIONS;

  return (
    <section className="overflow-hidden py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
            Handpicked for You
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[#1C1C1C]">
            Top Collection
          </h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-[#800020] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#95271D]"
            >
              Shop All
            </Link>
            <Link
              href="/shop?category=Anarkali"
              className="inline-flex items-center gap-2 rounded-full border border-[#800020] px-6 py-2.5 text-sm font-semibold text-[#800020] transition-colors hover:bg-[#FFF0E8]"
            >
              Shop Anarkalis
            </Link>
          </div>
        </div>
      </div>

      <CollectionsScroller collections={collections} />
    </section>
  );
}
