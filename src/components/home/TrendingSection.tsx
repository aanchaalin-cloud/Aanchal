import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFeaturedProducts } from "@/lib/queries/products";
import type { ProductWithDetails } from "@/types";

function TrendingCard({ product }: { product: ProductWithDetails }) {
  const firstImage = product.product_images?.[0]?.url || "/images/product-placeholder.svg";
  const hoverImage = product.product_images?.[1]?.url;
  const currentPrice = product.discount_price || product.price;

  const card = (
    <div className="group relative overflow-hidden rounded-sm bg-[#FFF0E8]">
      <div className="aspect-[3/4]">
        <Image
          src={firstImage}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        {hoverImage && (
          <Image
            src={hoverImage}
            alt={`${product.name} current view`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:scale-105"
          />
        )}
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
      className="group block"
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 max-[360px]:grid-cols-1">
          {featured.map((product) => (
            <TrendingCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
