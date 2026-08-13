"use client";

import { useEffect, useState } from "react";
import type { ProductWithDetails } from "@/types";
import { useRecentViews } from "@/context/RecentViewsContext";
import { ProductCard } from "@/components/product/ProductCard";

export function RecentlyViewed() {
  const { slugs, isHydrated } = useRecentViews();
  const [products, setProducts] = useState<ProductWithDetails[]>([]);

  useEffect(() => {
    if (!isHydrated || slugs.length === 0) {
      setProducts([]);
      return;
    }

    let cancelled = false;

    fetch("/api/products/recent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setProducts(json.data);
        }
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, slugs]);

  if (products.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-serif text-2xl text-[#1C1C1C] sm:text-3xl">
          Recently Viewed
        </h2>
        <div className="h-px flex-1 bg-[#E5D5C5]" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
