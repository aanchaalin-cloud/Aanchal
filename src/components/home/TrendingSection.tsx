import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFeaturedProducts } from "@/lib/queries/products";
import type { ProductWithDetails } from "@/types";
import { getPrimaryStorefrontImage } from "@/lib/product-images";

function TrendingCard({ product }: { product: ProductWithDetails }) {
  // Static card — show only the product's first image (no hover swap).
  const firstImage = getPrimaryStorefrontImage(product.product_images ?? []) || "/images/product-placeholder.svg";
  const currentPrice = product.discount_price || product.price;

  const card = (
    <div className="group relative overflow-hidden rounded-sm bg-[#FFF0E8]">
      <div className="aspect-[3/4]">
        <Image
          src={firstImage}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
          sizes="(max-width: 640px) 220px, (max-width: 1024px) 260px, 300px"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
        <h3 className="text-sm font-medium text-white leading-snug">
          {product.name}
        </h3>
        <p className="mt-1 text-sm font-semibold text-white/90">
          ₹{currentPrice.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block w-[220px] shrink-0 sm:w-[260px] lg:w-[300px]"
      aria-label={`View ${product.name}`}
    >
      {card}
    </Link>
  );
}

export async function TrendingSection() {
  const featured = await getFeaturedProducts();

  if (featured.length === 0) return null;

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
              Trending Now
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#1C1C1C]">
              Most Loved Styles
            </h2>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#800020] hover:underline underline-offset-4"
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-hidden" aria-label="Trending products">
          <div className="marquee-track flex w-max">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex gap-4 pr-4" aria-hidden={dup === 1}>
                {featured.map((product) => (
                  <TrendingCard key={product.id} product={product} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
