"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FALLBACK_PRODUCTS } from "@/lib/data/fallback-products";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import type { ProductWithDetails } from "@/types";

export function TrendingSection() {
  const products: ProductWithDetails[] = FALLBACK_PRODUCTS;

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
              Trending Now
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-[#1C1C1C]">
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

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => {
            const firstImage = product.product_images?.[0]?.url || "/images/product-placeholder.svg";
            const currentPrice = product.discount_price || product.price;
            const whatsappUrl = getWhatsAppUrl(product.name);

            return (
              <a
                key={product.id}
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-sm bg-[#FFF0E8]"
              >
                <div className="aspect-[3/4]">
                  <Image
                    src={firstImage}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
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
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
