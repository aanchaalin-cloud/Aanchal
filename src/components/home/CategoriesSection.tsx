import Image from "next/image";
import Link from "next/link";
import { getActiveProductCatalog } from "@/lib/queries/products";
import type { ProductWithDetails } from "@/types";

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
  const images = product.product_images ?? [];
  return images[2]?.url || images[0]?.url || "/images/product-placeholder.svg";
}

function CollectionCard({
  item,
  priority,
}: {
  item: CollectionItem;
  priority?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className="group relative w-[260px] flex-shrink-0 sm:w-[300px] lg:w-[320px]"
      aria-label={`View ${item.name}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#FFF0E8] ring-1 ring-[#E5D5C5]/60 shadow-sm transition-shadow duration-300 group-hover:shadow-md">
        <Image
          src={item.image}
          alt={item.name}
          fill
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 260px, (max-width: 1024px) 300px, 320px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <span className="inline-block rounded-full bg-white/90 px-5 py-1.5 text-sm font-semibold text-[#800020] shadow-md backdrop-blur-sm">
            View Collection
          </span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <h3 className="text-lg font-medium text-[#1C1C1C] transition-colors group-hover:text-[#800020]">
          {item.name}
        </h3>
      </div>
    </Link>
  );
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

      <div className="marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="flex gap-6 pr-6"
            aria-hidden={copy === 1}
          >
            {collections.map((item, idx) => (
              <CollectionCard
                key={`${item.image}-${copy}`}
                item={item}
                priority={copy === 0 && idx < 3}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
