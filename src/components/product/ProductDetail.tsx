"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Minus, Plus, ShoppingBag, Shield, Truck, RotateCcw,
  Ruler, Check, AlertTriangle, Package
} from "lucide-react";
import type { ProductWithDetails, ProductReview } from "@/types";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRecentViews } from "@/context/RecentViewsContext";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductReviews } from "@/components/product/ProductReviews";
import { ProductRating } from "@/components/product/ProductRating";
import { ReviewForm } from "@/components/product/ReviewForm";
import { WishlistButton } from "@/components/product/WishlistButton";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { getStorefrontImages, getPrimaryStorefrontImage, type ProductImageRef } from "@/lib/product-images";

interface ProductDetailProps {
  product: ProductWithDetails;
  relatedProducts?: ProductWithDetails[];
}

export function ProductDetail({ product, relatedProducts = [] }: ProductDetailProps) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const { recordView } = useRecentViews();
  const router = useRouter();
  const historyLoggedRef = useRef(false);

  useEffect(() => {
    recordView(product.slug);

    if (user && !historyLoggedRef.current) {
      historyLoggedRef.current = true;
      fetch("/api/products/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      }).catch(() => {
        historyLoggedRef.current = false;
      });
    }
  }, [product.id, product.slug, user, recordView]);

  const allImages = product.product_images ?? [];
  const images: ProductImageRef[] = allImages.length
    ? getStorefrontImages(allImages)
    : [{ id: "placeholder", url: "/images/product-placeholder.svg", alt_text: product.name, position: 0 }];
  const primaryImageUrl = getPrimaryStorefrontImage(allImages) ?? images[0]?.url ?? null;

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reviews/product/${product.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setReviews(json.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const activeVariants = product.product_variants?.filter((v) => v.is_active) ?? [];
  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? null;
  const currentPrice = product.discount_price || product.price;
  const discountPercent = product.discount_price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  const category = product.category;
  const uniqueColors = [...new Set(activeVariants.map((v) => v.color).filter(Boolean))];

  const firstAvailable = activeVariants.find((v) => v.stock > 0);
  const allOutOfStock = !firstAvailable;
  // Default to the first in-stock variant so single-variant products work and
  // add-to-cart never silently picks an out-of-stock first variant.
  const effectiveVariant = selectedVariant ?? firstAvailable ?? null;

  const addToCart = () => {
    const variant = effectiveVariant;
    if (!variant || variant.stock <= 0) return;

    addItem({
      variant_id: variant.id,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      image_url: primaryImageUrl,
      selected_size: variant.size ?? null,
      selected_color: variant.color ?? null,
      sku: variant.sku ?? null,
      display_price: currentPrice,
      available_stock: variant.stock,
      quantity,
    });

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const buyNow = () => {
    const variant = effectiveVariant;
    if (!variant || variant.stock <= 0) return;

    addItem({
      variant_id: variant.id,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      image_url: primaryImageUrl,
      selected_size: variant.size ?? null,
      selected_color: variant.color ?? null,
      sku: variant.sku ?? null,
      display_price: currentPrice,
      available_stock: variant.stock,
      quantity,
    });

    router.push("/checkout");
  };

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
    setAddedToCart(false);
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 text-xs text-[#6B6B6B]" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="hover:text-[#800020] transition-colors">Home</Link></li>
            <li>/</li>
            <li><Link href="/shop" className="hover:text-[#800020] transition-colors">Shop</Link></li>
            {category && (
              <>
                <li>/</li>
                <li><Link href={`/shop?category=${encodeURIComponent(category)}`} className="hover:text-[#800020] transition-colors">{category}</Link></li>
              </>
            )}
            <li>/</li>
            <li className="text-[#1C1C1C] truncate max-w-[150px] sm:max-w-[250px]">{product.name}</li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-[#FFF0E8]">
              <Image
                src={images[selectedImage]?.url || "/images/product-placeholder.svg"}
                alt={images[selectedImage]?.alt_text || product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority
              />
              {discountPercent > 0 && (
                <span className="absolute top-3 left-3 rounded bg-[#C41E3A] px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                  {discountPercent}% OFF
                </span>
              )}
              <WishlistButton
                productId={product.id}
                className="absolute top-3 right-3"
              />
              {allOutOfStock && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1C1C1C]/40">
                  <span className="text-sm font-semibold uppercase tracking-wider text-white">
                    Sold Out
                  </span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2" role="tablist" aria-label="Product images">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    role="tab"
                    aria-selected={idx === selectedImage}
                    aria-label={`View image ${idx + 1}`}
                    className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#800020] ${
                      idx === selectedImage ? "border-[#800020]" : "border-transparent hover:border-[#E5D5C5]"
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt_text || `${product.name} thumbnail ${idx + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            {category && (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B6B6B]">
                {category}
              </p>
            )}

            <h1 className="mt-2 text-2xl font-semibold leading-tight text-[#1C1C1C] sm:text-3xl">
              {product.name}
            </h1>

            <ProductRating reviews={reviews} />

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              {product.discount_price ? (
                <>
                  <span className="text-2xl font-semibold text-[#C41E3A]">
                    ₹{product.discount_price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-base text-[#6B6B6B]">
                    <span className="mr-1 text-xs">MRP</span>
                    <span className="line-through">₹{product.price.toLocaleString("en-IN")}</span>
                  </span>
                  <span className="rounded bg-[#C41E3A]/10 px-2 py-0.5 text-xs font-semibold text-[#C41E3A]">
                    {discountPercent}% off
                  </span>
                </>
              ) : (
                <span className="text-2xl font-semibold text-[#1C1C1C]">
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
              )}
            </div>

            {allOutOfStock && (
              <div className="mt-3 flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-sm text-[#C41E3A]">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>This product is currently sold out.</span>
              </div>
            )}

            {product.description && (
              <p className="mt-6 text-sm leading-relaxed text-[#4A4A4A] whitespace-pre-wrap">
                {product.description}
              </p>
            )}

            <div className="mt-6 space-y-5">
              {/* Variant selector */}
              {uniqueColors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                    Variants
                    {selectedVariant?.color && (
                      <span className="ml-1 lowercase normal-case text-[#1C1C1C]">— {selectedVariant.color}</span>
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Variant selection">
                    {uniqueColors.map((color) => {
                      const variant = activeVariants.find((v) => v.color === color);
                      const isDisabled = !variant || variant.stock <= 0;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            if (!isDisabled && variant) {
                              handleVariantSelect(variant.id);
                            }
                          }}
                          disabled={isDisabled}
                          role="radio"
                          aria-checked={selectedVariant?.color === color}
                          aria-label={`Variant: ${color}${isDisabled ? " (sold out)" : ""}`}
                          className={`relative rounded-sm border px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#800020] ${
                            isDisabled
                              ? "border-[#E5D5C5] text-[#BDBDBD] cursor-not-allowed line-through"
                              : selectedVariant?.color === color
                              ? "border-[#800020] bg-[#800020] text-white"
                              : "border-[#E5D5C5] text-[#1C1C1C] hover:border-[#800020]"
                          }`}
                        >
                          {color}
                          {isDisabled && <span className="sr-only"> (sold out)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Fit panel — every outfit is made to measure */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                    Fit
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#FFF0E8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#95271D]">
                      <Ruler className="h-3 w-3" />
                      Custom Fit
                    </span>
                  </p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#6B6B6B]">
                  Every outfit is stitched to your exact measurements — no S/M/L sizes.
                  You&apos;ll enter your <span className="font-medium text-[#1C1C1C]">chest, waist, height and shoulder</span>{" "}
                  measurements at checkout. Our team also confirms the details with you
                  before production begins.
                </p>
              </div>
            </div>

            {/* Quantity + Actions */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-[#E5D5C5] rounded-sm">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-10 w-10 items-center justify-center text-[#6B6B6B] hover:text-[#1C1C1C] hover:bg-[#FFF0E8] transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex h-10 w-12 items-center justify-center text-sm font-medium text-[#1C1C1C]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(quantity + 1, effectiveVariant?.stock ?? 10, 10))}
                    disabled={!effectiveVariant || quantity >= Math.min(effectiveVariant.stock, 10)}
                    className="flex h-10 w-10 items-center justify-center text-[#6B6B6B] hover:text-[#1C1C1C] hover:bg-[#FFF0E8] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={addToCart}
                  disabled={allOutOfStock}
                  className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-[#800020] px-6 py-3 text-sm font-medium text-white hover:bg-[#66001A] transition-colors disabled:bg-[#BDBDBD] disabled:cursor-not-allowed"
                  aria-label={addedToCart ? "Added to cart" : "Add to cart"}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {addedToCart ? "Added!" : allOutOfStock ? "Sold Out" : "Add to Cart"}
                </button>
              </div>

              {!allOutOfStock && (
                <button
                  type="button"
                  onClick={buyNow}
                  className="w-full rounded-sm border border-[#800020] px-6 py-3 text-sm font-medium text-[#800020] hover:bg-[#FFF0E8] transition-colors disabled:border-[#BDBDBD] disabled:text-[#BDBDBD] disabled:cursor-not-allowed"
                >
                  Buy Now
                </button>
              )}
            </div>

            {/* Trust badges */}
            <div className="mt-8 space-y-3 border-t border-[#E5D5C5]/50 pt-6">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-4 w-4 text-[#800020]" />
                <div>
                  <p className="text-sm font-medium text-[#1C1C1C]">Premium Quality</p>
                  <p className="text-xs text-[#6B6B6B]">Handcrafted with care using the finest materials</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 h-4 w-4 text-[#800020]" />
                <div>
                  <p className="text-sm font-medium text-[#1C1C1C]">Ships Across India</p>
                  <p className="text-xs text-[#6B6B6B]">Fast, reliable delivery to your doorstep</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RotateCcw className="mt-0.5 h-4 w-4 text-[#800020]" />
                <div>
                  <p className="text-sm font-medium text-[#1C1C1C]">Easy Exchange</p>
                  <p className="text-xs text-[#6B6B6B]">Swap to a different product within 3 days of delivery (₹99 fee)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 text-[#800020]" />
                <div>
                  <p className="text-sm font-medium text-[#1C1C1C]">Secure Checkout</p>
                  <p className="text-xs text-[#6B6B6B]">100% secure payment gateway</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-4 w-4 text-[#800020]" />
                <div>
                  <p className="text-sm font-medium text-[#1C1C1C]">Signature Packaging</p>
                  <p className="text-xs text-[#6B6B6B]">Every order arrives in our signature gift-worthy packaging</p>
                </div>
              </div>
            </div>

            {/* Fabric & Care */}
            {product.fabric && (
              <div className="mt-6 border-t border-[#E5D5C5]/50 pt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#800020]">Fabric & Care</p>
                <p className="mt-2 text-sm text-[#6B6B6B]">{product.fabric}</p>
              </div>
            )}
            {product.wash_care && (
              <div className="mt-3">
                <p className="text-xs text-[#6B6B6B] leading-relaxed">{product.wash_care}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section id="customer-reviews" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 border-t border-[#E5D5C5]/30">
        <h2 className="text-2xl font-semibold text-[#1C1C1C] mb-8">Customer Reviews</h2>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <ProductReviews reviews={reviews} />
          <div className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-[#1C1C1C] mb-4">Write a Review</h3>
            <ReviewForm productId={product.id} productName={product.name} />
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 border-t border-[#E5D5C5]/30">
          <h2 className="text-2xl font-semibold text-[#1C1C1C] mb-8">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 max-[360px]:grid-cols-1">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed */}
      <div className="pb-12">
        <RecentlyViewed />
      </div>
    </>
  );
}