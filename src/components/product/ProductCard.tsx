"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, MessageCircle } from "lucide-react";
import type { ProductWithDetails } from "@/types";
import { useCart } from "@/context/CartContext";
import { getWhatsAppUrl } from "@/lib/whatsapp";

interface ProductCardProps {
  product: ProductWithDetails;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCart();

  const isFallback = product.id.startsWith("fb-");
  const firstImage = product.product_images?.[0]?.url || "/images/product-placeholder.svg";
  const category = product.category;
  const activeVariants = product.product_variants?.filter((v) => v.is_active) ?? [];
  const sizes = activeVariants.map((v) => v.size).filter(Boolean);
  const uniqueSizes = [...new Set(sizes)];
  const currentPrice = product.discount_price || product.price;
  const inStock = activeVariants.some((v) => v.stock > 0);
  const firstAvailable = activeVariants.find((v) => v.stock > 0);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFallback) {
      window.open(getWhatsAppUrl(product.name), "_blank");
      return;
    }
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
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        {!isFallback && !inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1C1C1C]/40">
            <span className="text-sm font-semibold uppercase tracking-wider text-white">
              Sold Out
            </span>
          </div>
        )}
        {product.discount_price && inStock && !isFallback && (
          <span className="absolute top-3 left-3 rounded bg-[#C41E3A] px-2 py-0.5 text-xs font-semibold text-white">
            Sale
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          {category && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#6B6B6B]">
              {category}
            </p>
          )}
          <h3 className="mt-1 font-serif text-lg font-medium leading-tight text-[#1C1C1C] group-hover:text-[#800020] transition-colors">
            {product.name}
          </h3>
          {uniqueSizes.length > 0 && (
            <p className="mt-1.5 text-xs text-[#6B6B6B]">
              Sizes: {uniqueSizes.join(", ")}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div>
            {product.discount_price ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#C41E3A]">
                  ₹{product.discount_price.toLocaleString("en-IN")}
                </span>
                <span className="text-xs text-[#6B6B6B] line-through">
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-[#1C1C1C]">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
            )}
          </div>
          {inStock && (
            <button
              type="button"
              onClick={handleAddToCart}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors ${
                isFallback
                  ? "bg-[#25D366] hover:bg-[#1DA851]"
                  : "bg-[#800020] hover:bg-[#66001A]"
              }`}
              aria-label={isFallback ? "Buy on WhatsApp" : "Add to cart"}
            >
              {isFallback ? <MessageCircle className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </>
  );

  if (isFallback) {
    return (
      <a
        href={getWhatsAppUrl(product.name)}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex flex-col bg-white rounded-sm overflow-hidden border border-[#E5D5C5]/60 hover:border-[#25D366]/50 hover:shadow-lg transition-all duration-300"
      >
        {cardContent}
      </a>
    );
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative flex flex-col bg-white rounded-sm overflow-hidden border border-[#E5D5C5]/60 hover:border-[#800020]/30 hover:shadow-lg transition-all duration-300"
    >
      {cardContent}
    </Link>
  );
}