"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Ruler } from "lucide-react";
import type { ProductWithDetails } from "@/types";
import { useCart } from "@/context/CartContext";
import { WishlistButton } from "@/components/product/WishlistButton";
import { formatPrice } from "@/lib/utils";

interface ProductCardProps {
  product: ProductWithDetails;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCart();

  const firstImage = product.product_images?.[0]?.url || "/images/product-placeholder.svg";
  const hoverImage = product.product_images?.[1]?.url;
  const category = product.category;
  const activeVariants = product.product_variants?.filter((v) => v.is_active) ?? [];
  const currentPrice = product.discount_price || product.price;
  const inStock = activeVariants.some((v) => v.stock > 0);
  const firstAvailable = activeVariants.find((v) => v.stock > 0);
  const discountPercent = product.discount_price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || !firstAvailable) return;
    addItem({
      variant_id: firstAvailable.id,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      image_url: firstImage,
      selected_size: firstAvailable.size ?? null,
      selected_color: firstAvailable.color ?? null,
      sku: firstAvailable.sku ?? null,
      display_price: currentPrice,
      available_stock: firstAvailable.stock,
      quantity: 1,
    });
    openCart();
  };

  const cardContent = (
    <>
      <div className="relative aspect-[3/4] overflow-hidden bg-[#FFF0E8]">
        <Image
          src={firstImage}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover pointer-fine:group-hover:scale-105 transition-transform duration-700"
        />
        {hoverImage && (
          <Image
            src={hoverImage}
            alt={`${product.name} alternate view`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover opacity-0 transition-opacity duration-500 pointer-fine:group-hover:opacity-100 pointer-fine:group-hover:scale-105"
          />
        )}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1C1C1C]/40">
            <span className="text-sm font-semibold uppercase tracking-wider text-white">
              Sold Out
            </span>
          </div>
        )}
        {product.discount_price && inStock && discountPercent > 0 && (
          <span className="absolute top-3 left-3 rounded bg-[#C41E3A] px-2 py-0.5 text-xs font-semibold text-white">
            {discountPercent}% OFF
          </span>
        )}
        <WishlistButton
          productId={product.id}
          size="sm"
          className="absolute top-3 right-3"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          {category && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6B6B6B]">
              {category}
            </p>
          )}
          <h3 className="mt-1 text-lg font-medium leading-tight text-[#1C1C1C] group-hover:text-[#800020] transition-colors">
            {product.name}
          </h3>
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#FFF0E8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#95271D]">
            <Ruler className="h-3 w-3" />
            Custom Fit
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            {product.discount_price ? (
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#C41E3A]">
                    ₹{product.discount_price.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#6B6B6B]">
                  <span>MRP</span>
                  <span className="line-through">
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-sm font-semibold text-[#1C1C1C]">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          {inStock && (
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#800020] text-white transition-colors hover:bg-[#66001A]"
              aria-label="Add to cart"
            >
              <ShoppingBag className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative flex flex-col bg-white rounded-sm overflow-hidden border border-[#E5D5C5]/60 hover:border-[#800020]/30 hover:shadow-lg transition-all duration-300"
    >
      {cardContent}
    </Link>
  );
}