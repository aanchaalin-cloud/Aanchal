"use client";

import { useMemo, useState } from "react";
import type { ProductWithDetails } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";
import { formatPrice } from "@/lib/utils";
import { Messages } from "@/lib/messages";
import { SlidersHorizontal, X, Search } from "lucide-react";

type Props = {
  products: ProductWithDetails[];
};

type SortOption = "latest" | "price-asc" | "price-desc";

export function ShopPageClient({ products }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [availability, setAvailability] = useState<"all" | "in-stock" | "out-of-stock">("all");
  const [sort, setSort] = useState<SortOption>("latest");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const maxPrice = useMemo(() => {
    return Math.max(...products.map((p) => p.price), 10000);
  }, [products]);

  const filtered = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      );
    }

    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (availability === "in-stock") {
      result = result.filter((p) =>
        p.product_variants.some((v) => v.stock > 0)
      );
    } else if (availability === "out-of-stock") {
      result = result.filter(
        (p) => !p.product_variants.some((v) => v.stock > 0)
      );
    }

    result = result.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    if (sort === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    } else {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [products, search, selectedCategory, availability, sort, priceRange]);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setAvailability("all");
    setSort("latest");
    setPriceRange([0, maxPrice]);
  };

  const hasActiveFilters =
    search || selectedCategory || availability !== "all" || priceRange[0] > 0 || priceRange[1] < maxPrice;

  const activeBtn = "bg-[#800020] text-white";
  const inactiveBtn = "text-[#6B6B6B] hover:text-[#1C1C1C] hover:bg-[#FFF0E8]";

  const filterContent = (
    <div className="space-y-5">
      <div>
        <label htmlFor="search" className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2">
          Search
        </label>
        <input
          id="search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#800020]"
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2">
          Category
        </p>
        <div className="space-y-1" role="radiogroup" aria-label="Category filter">
          <button
            type="button"
            onClick={() => setSelectedCategory("")}
            role="radio"
            aria-checked={!selectedCategory}
            className={`block w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${!selectedCategory ? activeBtn : inactiveBtn}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              role="radio"
              aria-checked={selectedCategory === cat}
              className={`block w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${selectedCategory === cat ? activeBtn : inactiveBtn}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2">
          Price Range
        </p>
        <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
          <span>{formatPrice(priceRange[0])}</span>
          <input
            type="range"
            min={0}
            max={maxPrice}
            step={100}
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
            className="flex-1 accent-[#800020]"
            aria-label="Max price"
          />
          <span>{formatPrice(priceRange[1])}</span>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2">
          Availability
        </p>
        <div className="space-y-1" role="radiogroup" aria-label="Availability filter">
          {(["all", "in-stock", "out-of-stock"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setAvailability(opt)}
              role="radio"
              aria-checked={availability === opt}
              className={`block w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${availability === opt ? activeBtn : inactiveBtn}`}
            >
              {opt === "all" ? "All" : opt === "in-stock" ? "In Stock" : "Out of Stock"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2">
          Sort
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#800020]"
        >
          <option value="latest">Latest</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="w-full rounded border border-[#E5D5C5] px-3 py-2 text-sm text-[#6B6B6B] hover:text-[#C41E3A] hover:border-[#C41E3A] transition-colors"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#800020]">
          Collection
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-[#1C1C1C]">
          All Products
        </h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          {filtered.length} {filtered.length === 1 ? "piece" : "pieces"} available
        </p>
      </div>

      {/* Mobile filter toggle */}
      <div className="mb-6 lg:hidden">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 rounded border border-[#E5D5C5] px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1C1C1C] transition-colors"
          aria-expanded={showFilters}
          aria-controls="shop-filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
          {hasActiveFilters && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#800020] text-[10px] text-white">
              !
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Filters sidebar */}
        <aside
          id="shop-filters"
          className={`lg:col-span-1 ${showFilters ? "block" : "hidden"} lg:block`}
        >
          <div className="sticky top-24">
            {filterContent}
          </div>
        </aside>

        {/* Mobile filters overlay */}
        {showFilters && (
          <div className="fixed inset-0 z-40 bg-[#1C1C1C]/30 lg:hidden" onClick={() => setShowFilters(false)} />
        )}

        {/* Mobile filters panel */}
        {showFilters && (
          <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] overflow-y-auto bg-white p-6 shadow-xl lg:hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg font-semibold text-[#1C1C1C]">Filters</h2>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="rounded p-1 text-[#6B6B6B] hover:text-[#1C1C1C] transition-colors"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterContent}
          </div>
        )}

        {/* Product grid */}
        <div className="lg:col-span-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Search className="mx-auto h-12 w-12 text-[#95271D]" />
              <p className="mt-4 font-serif text-xl text-[#6B6B6B]">
                {hasActiveFilters ? Messages.emptyShopFiltered : Messages.emptyShop}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 rounded bg-[#800020] px-4 py-2 text-sm font-medium text-white hover:bg-[#66001A] transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}