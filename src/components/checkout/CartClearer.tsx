"use client";

import { useEffect } from "react";
import { useCart } from "@/context/CartContext";

const PENDING_ORDER_KEY = "aanchal_pending_order";

/**
 * Clears the cart once an order is confirmed.
 *
 * The Paytm flow redirects to the payment page BEFORE payment is confirmed, so
 * the checkout page intentionally does NOT clear the cart on redirect (a
 * failed/abandoned payment would destroy the cart). Instead the checkout page
 * records the pending order id in sessionStorage; once this page sees the order
 * is actually paid (or 50% pre-paid), the cart is cleared.
 */
export default function CartClearer({
  orderId,
  confirmed,
}: {
  orderId: string;
  confirmed: boolean;
}) {
  const { clearCart } = useCart();

  useEffect(() => {
    if (!confirmed) return;
    try {
      if (sessionStorage.getItem(PENDING_ORDER_KEY) === orderId) {
        sessionStorage.removeItem(PENDING_ORDER_KEY);
        clearCart();
      }
    } catch {
      // sessionStorage unavailable — the cart will simply be cleared at the
      // next successful checkout.
    }
  }, [confirmed, orderId, clearCart]);

  return null;
}
