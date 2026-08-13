"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, AlertTriangle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export default function CartPage() {
  const { items, isHydrated, removeItem, updateQuantity, displayTotal } =
    useCart();

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center sm:px-6">
        <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[#800020]/20" />
        <p className="mt-4 text-sm text-[#6B6B6B]">Loading your cart…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <ShoppingBag className="mx-auto h-16 w-16 text-[#95271D]" />
        <h1 className="mt-4 text-2xl font-semibold text-[#1C1C1C]">
          Your cart is empty
        </h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          Discover our collection and add your favourite pieces.
        </p>
        <div className="mt-8">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded bg-[#800020] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#66001A] transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-semibold text-[#1C1C1C]">
        Your Cart
      </h1>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const isOverStock = item.quantity > item.available_stock;
            return (
              <div
                key={`${item.product_id}-${item.variant_id}`}
                className="flex gap-4 rounded-sm border border-[#E5D5C5]/50 bg-white p-4"
              >
                <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-sm bg-[#FFF0E8]">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.product_name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ShoppingBag className="h-6 w-6 text-[#95271D]" />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <Link
                    href={`/products/${item.product_slug}`}
                    className="text-sm font-medium text-[#1C1C1C] hover:text-[#800020] transition-colors line-clamp-2"
                  >
                    {item.product_name}
                  </Link>
                  <div className="flex flex-wrap gap-3 text-xs text-[#6B6B6B]">
                    {item.selected_size && (
                      <span>Size: {item.selected_size}</span>
                    )}
                    {item.selected_color && (
                      <span>Colour: {item.selected_color}</span>
                    )}
                    {item.sku && <span>SKU: {item.sku}</span>}
                  </div>

                  {isOverStock && (
                    <p className="flex items-center gap-1 text-xs text-[#C41E3A]">
                      <AlertTriangle className="h-3 w-3" />
                      Stock updated. Available: {item.available_stock}
                    </p>
                  )}

                  {!isOverStock && item.available_stock <= 3 && (
                    <p className="flex items-center gap-1 text-xs text-[#C41E3A]">
                      <AlertTriangle className="h-3 w-3" />
                      Only {item.available_stock} left in stock
                    </p>
                  )}

                  <p className="text-sm font-semibold text-[#1C1C1C]">
                    {formatPrice(item.display_price)}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                    <div className="flex items-center border border-[#E5D5C5] rounded">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.product_id,
                            item.variant_id,
                            item.quantity - 1
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center text-[#6B6B6B] hover:bg-[#FFF0E8] transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm text-[#1C1C1C]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.product_id,
                            item.variant_id,
                            item.quantity + 1
                          )
                        }
                        disabled={
                          item.quantity >= Math.min(item.available_stock, 10)
                        }
                        className="flex h-9 w-9 items-center justify-center text-[#6B6B6B] hover:bg-[#FFF0E8] transition-colors disabled:opacity-30"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[#1C1C1C]">
                        {formatPrice(item.display_price * item.quantity)}
                      </span>
                      <button
                        onClick={() =>
                          removeItem(item.product_id, item.variant_id)
                        }
                        className="p-1.5 text-[#6B6B6B] hover:text-[#C41E3A] transition-colors"
                        aria-label={`Remove ${item.product_name} from cart`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-sm border border-[#E5D5C5]/50 bg-white p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-[#1C1C1C]">
              Order Summary
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Subtotal</span>
                <span>{formatPrice(displayTotal)}</span>
              </div>
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Shipping</span>
                <span className="text-[#800020]">Calculated at checkout</span>
              </div>
              <div className="border-t border-[#E5D5C5]/50 pt-3 flex justify-between font-semibold text-[#1C1C1C]">
                <span>Estimated Total</span>
                <span>{formatPrice(displayTotal)}</span>
              </div>
            </div>

            <p className="mt-3 text-xs text-[#6B6B6B]">
              Final price verified at checkout. Standard shipping applies on all orders.
            </p>

            <div className="mt-5">
              <Button fullWidth size="lg" asChild>
                <Link href="/checkout">
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-4 text-center">
              <Link
                href="/shop"
                className="text-xs text-[#6B6B6B] underline hover:text-[#800020] transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}