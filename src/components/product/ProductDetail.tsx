"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Minus, Plus, ShoppingBag, Shield, Truck, RotateCcw,
  X, Ruler, Check, AlertTriangle
} from "lucide-react";
import type { ProductWithDetails } from "@/types";
import { useCart } from "@/context/CartContext";
import { ProductCard } from "@/components/product/ProductCard";

interface ProductDetailProps {
  product: ProductWithDetails;
  relatedProducts?: ProductWithDetails[];
}

const SIZE_GUIDE_DATA = [
  { size: "XS", bust: "30-31", waist: "24-25", hip: "33-34", length: "Approx. 42" },
  { size: "S", bust: "32-33", waist: "26-27", hip: "35-36", length: "Approx. 42" },
  { size: "M", bust: "34-35", waist: "28-29", hip: "37-38", length: "Approx. 43" },
  { size: "L", bust: "36-37", waist: "30-31", hip: "39-40", length: "Approx. 43" },
  { size: "XL", bust: "38-40", waist: "32-34", hip: "41-43", length: "Approx. 44" },
  { size: "XXL", bust: "41-43", waist: "35-37", hip: "44-46", length: "Approx. 44" },
];

export function ProductDetail({ product, relatedProducts = [] }: ProductDetailProps) {
  const { addItem } = useCart();
  const router = useRouter();

  const images = product.product_images?.length
    ? product.product_images
    : [{ id: "placeholder", url: "/images/product-placeholder.svg", alt_text: product.name }];

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const activeVariants = product.product_variants?.filter((v) => v.is_active) ?? [];
  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) ?? null;
  const currentPrice = product.discount_price || product.price;
  const discountPercent = product.discount_price
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;

  const category = product.category;
  const uniqueColors = [...new Set(activeVariants.map((v) => v.color).filter(Boolean))];
  const uniqueSizes = [...new Set(activeVariants.map((v) => v.size).filter(Boolean))];
  const isLowStock = selectedVariant ? selectedVariant.stock > 0 && selectedVariant.stock <= 3 : false;

  const addToCart = () => {
    const variant = selectedVariant || activeVariants[0];
    if (!variant || variant.stock <= 0) return;

    addItem({
      variant_id: variant.id,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      image_url: images[0]?.url || null,
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
    const variant = selectedVariant || activeVariants[0];
    if (!variant || variant.stock <= 0) return;

    addItem({
      variant_id: variant.id,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      image_url: images[0]?.url || null,
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

  const firstAvailable = activeVariants.find((v) => v.stock > 0);
  const allOutOfStock = !firstAvailable;

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

            <div className="mt-4 flex items-baseline gap-3">
              {product.discount_price ? (
                <>
                  <span className="text-2xl font-semibold text-[#C41E3A]">
                    ₹{product.discount_price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-lg text-[#6B6B6B] line-through">
                    ₹{product.price.toLocaleString("en-IN")}
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
              <p className="mt-6 text-sm leading-relaxed text-[#6B6B6B]">
                {product.description}
              </p>
            )}

            <div className="mt-6 space-y-5">
              {/* Color selector */}
              {uniqueColors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                    Colour
                    {selectedVariant?.color && (
                      <span className="ml-1 lowercase normal-case text-[#1C1C1C]">— {selectedVariant.color}</span>
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Colour selection">
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
                          aria-label={`Colour: ${color}${isDisabled ? " (sold out)" : ""}`}
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

              {/* Size selector */}
              {uniqueSizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                      Size
                      {selectedVariant?.size && (
                        <span className="ml-1 lowercase normal-case text-[#1C1C1C]">— {selectedVariant.size}</span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowSizeGuide(true)}
                      className="flex items-center gap-1 text-xs text-[#800020] hover:underline focus:outline-none focus:ring-2 focus:ring-[#800020] rounded"
                      aria-label="Open size guide"
                    >
                      <Ruler className="h-3 w-3" />
                      Size Guide
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Size selection">
                    {uniqueSizes.map((size) => {
                      const variant = activeVariants.find(
                        (v) => v.size === size && (!selectedVariant?.color || v.color === selectedVariant.color)
                      );
                      const isDisabled = !variant || variant.stock <= 0;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            if (!isDisabled && variant) {
                              handleVariantSelect(variant.id);
                            }
                          }}
                          disabled={isDisabled}
                          role="radio"
                          aria-checked={selectedVariant?.size === size}
                          aria-label={`Size ${size}${isDisabled ? " (sold out)" : ""}`}
                          className={`relative flex h-10 w-10 items-center justify-center rounded-sm border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#800020] ${
                            isDisabled
                              ? "border-[#E5D5C5] text-[#BDBDBD] cursor-not-allowed line-through"
                              : selectedVariant?.size === size
                              ? "border-[#800020] bg-[#800020] text-white"
                              : "border-[#E5D5C5] text-[#1C1C1C] hover:border-[#800020]"
                          }`}
                        >
                          {size}
                          {isDisabled && <span className="sr-only"> (sold out)</span>}
                        </button>
                      );
                    })}
                  </div>
                  {isLowStock && selectedVariant && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-[#C41E3A]">
                      <AlertTriangle className="h-3 w-3" />
                      Only {selectedVariant.stock} left in stock
                    </p>
                  )}
                </div>
              )}

              {!selectedVariantId && uniqueSizes.length > 0 && !allOutOfStock && (
                <p className="text-xs text-[#6B6B6B]">Please select a size to continue.</p>
              )}
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
                    onClick={() => setQuantity(Math.min(quantity + 1, selectedVariant?.stock ?? 10, 10))}
                    disabled={!selectedVariant || quantity >= Math.min(selectedVariant.stock, 10)}
                    className="flex h-10 w-10 items-center justify-center text-[#6B6B6B] hover:text-[#1C1C1C] hover:bg-[#FFF0E8] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={addToCart}
                  disabled={allOutOfStock || (!selectedVariantId && uniqueSizes.length > 0)}
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
                  disabled={!selectedVariantId && uniqueSizes.length > 0}
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
                  <p className="text-sm font-medium text-[#1C1C1C]">Free Shipping</p>
                  <p className="text-xs text-[#6B6B6B]">On orders above ₹999. Shipped across India.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RotateCcw className="mt-0.5 h-4 w-4 text-[#800020]" />
                <div>
                  <p className="text-sm font-medium text-[#1C1C1C]">Easy Returns</p>
                  <p className="text-xs text-[#6B6B6B]">Exchange or return within 7 days of delivery</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 text-[#800020]" />
                <div>
                  <p className="text-sm font-medium text-[#1C1C1C]">Secure Checkout</p>
                  <p className="text-xs text-[#6B6B6B]">100% secure payment via Razorpay</p>
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

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 border-t border-[#E5D5C5]/30">
          <h2 className="text-2xl font-semibold text-[#1C1C1C] mb-8">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} product={rp} />
            ))}
          </div>
        </section>
      )}

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1C1C]/50 p-4"
          onClick={() => setShowSizeGuide(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Size guide"
        >
          <div
            className="w-full max-w-lg rounded-sm bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#1C1C1C]">Size Guide</h3>
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                className="rounded p-1 text-[#6B6B6B] hover:text-[#1C1C1C] hover:bg-[#FFF0E8] transition-colors"
                aria-label="Close size guide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs text-[#6B6B6B]">
              Measurements are in inches. This is a general guide — actual fit may vary by style.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E5D5C5]">
                    <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Size</th>
                    <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Bust</th>
                    <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Waist</th>
                    <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Hip</th>
                    <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Length</th>
                  </tr>
                </thead>
                <tbody>
                  {SIZE_GUIDE_DATA.map((row) => (
                    <tr key={row.size} className="border-b border-[#E5D5C5]/30 last:border-0">
                      <td className="py-2 pr-4 font-medium text-[#1C1C1C]">{row.size}</td>
                      <td className="py-2 pr-4 text-[#6B6B6B]">{row.bust}</td>
                      <td className="py-2 pr-4 text-[#6B6B6B]">{row.waist}</td>
                      <td className="py-2 pr-4 text-[#6B6B6B]">{row.hip}</td>
                      <td className="py-2 text-[#6B6B6B]">{row.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-[#6B6B6B] italic">
              This is a placeholder size chart. Please refer to individual product measurements or contact us for exact sizing assistance.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                className="w-full rounded bg-[#800020] px-4 py-2 text-sm font-medium text-white hover:bg-[#66001A] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}