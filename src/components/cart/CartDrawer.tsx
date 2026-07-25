"use client";

import { X, ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function CartDrawer() {
  const {
    items,
    isOpen,
    isHydrated,
    itemCount,
    closeCart,
    removeItem,
    updateQuantity,
    displayTotal,
  } = useCart();

  if (!isOpen || !isHydrated) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[#1C1C1C]/40 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden="true"
      />

      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-[#FFF8F3] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5D5C5]/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#1C1C1C]" />
            <h2 className="font-medium text-[#1C1C1C]">
              Your Cart ({itemCount})
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="flex h-8 w-8 items-center justify-center rounded text-[#6B6B6B] hover:bg-[#FFF0E8] hover:text-[#1C1C1C] transition-colors"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <ShoppingBag className="h-12 w-12 text-[#95271D]" />
              <p className="text-sm text-[#6B6B6B]">Your cart is empty</p>
              <Button variant="outline" size="sm" onClick={closeCart} asChild>
                <Link href="/shop">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={`${item.product_id}-${item.variant_id}`}
                  className="flex gap-3"
                >
                  <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-sm bg-[#FFF0E8]">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-[#95271D]" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <h3 className="text-sm font-medium text-[#1C1C1C] leading-snug line-clamp-2">
                      {item.product_name}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs text-[#6B6B6B]">
                      {item.selected_size && (
                        <span>Size: {item.selected_size}</span>
                      )}
                      {item.selected_color && (
                        <span>Colour: {item.selected_color}</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[#1C1C1C]">
                      {formatPrice(item.display_price)}
                    </p>

                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center border border-[#E5D5C5] rounded-sm">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.product_id,
                              item.variant_id,
                              item.quantity - 1
                            )
                          }
                          className="flex h-7 w-7 items-center justify-center text-[#6B6B6B] hover:bg-[#FFF0E8] transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-medium text-[#1C1C1C]">
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
                          className="flex h-7 w-7 items-center justify-center text-[#6B6B6B] hover:bg-[#FFF0E8] transition-colors disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        onClick={() =>
                          removeItem(item.product_id, item.variant_id)
                        }
                        className="flex items-center gap-1 text-xs text-[#C41E3A] hover:text-[#A03024] transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-[#E5D5C5]/50 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B6B6B]">Subtotal (approx.)</span>
              <span className="font-semibold text-[#1C1C1C]">
                {formatPrice(displayTotal)}
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B]">
              Shipping & final total calculated at checkout.
            </p>
            <Button fullWidth asChild onClick={closeCart}>
              <Link href="/checkout">Proceed to Checkout</Link>
            </Button>
            <Button fullWidth variant="outline" onClick={closeCart} asChild>
              <Link href="/cart">View Cart</Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}