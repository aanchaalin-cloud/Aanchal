"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import type { CartItem } from "@/types";

type CartState = {
  items: CartItem[];
  isOpen: boolean;
};

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { productId: string; variantId: string } }
  | {
      type: "UPDATE_QUANTITY";
      payload: { productId: string; variantId: string; quantity: number };
    }
  | { type: "CLEAR_CART" }
  | { type: "OPEN_CART" }
  | { type: "CLOSE_CART" }
  | { type: "LOAD_CART"; payload: CartItem[] };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "LOAD_CART":
      return { ...state, items: action.payload };

    case "ADD_ITEM": {
      const existing = state.items.find(
        (item) =>
          item.product_id === action.payload.product_id &&
          item.variant_id === action.payload.variant_id
      );

      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.product_id === action.payload.product_id &&
            item.variant_id === action.payload.variant_id
              ? {
                  ...item,
                  quantity: Math.min(
                    item.quantity + action.payload.quantity,
                    item.available_stock,
                    10
                  ),
                }
              : item
          ),
        };
      }

      return { ...state, items: [...state.items, action.payload] };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter(
          (item) =>
            !(
              item.product_id === action.payload.productId &&
              item.variant_id === action.payload.variantId
            )
        ),
      };

    case "UPDATE_QUANTITY":
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (item) =>
              !(
                item.product_id === action.payload.productId &&
                item.variant_id === action.payload.variantId
              )
          ),
        };
      }

      return {
        ...state,
        items: state.items.map((item) =>
          item.product_id === action.payload.productId &&
          item.variant_id === action.payload.variantId
            ? {
                ...item,
                quantity: Math.min(
                  action.payload.quantity,
                  item.available_stock,
                  10
                ),
              }
            : item
        ),
      };

    case "CLEAR_CART":
      return { ...state, items: [] };
    case "OPEN_CART":
      return { ...state, isOpen: true };
    case "CLOSE_CART":
      return { ...state, isOpen: false };
    default:
      return state;
  }
}

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  isHydrated: boolean;
  itemCount: number;
  displayTotal: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (
    productId: string,
    variantId: string,
    quantity: number
  ) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const CART_STORAGE_KEY = "vastra_cart_v2";

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;

  return (
    typeof item.product_id === "string" &&
    typeof item.variant_id === "string" &&
    typeof item.product_name === "string" &&
    typeof item.product_slug === "string" &&
    typeof item.display_price === "number" &&
    Number.isFinite(item.display_price) &&
    typeof item.available_stock === "number" &&
    Number.isInteger(item.available_stock) &&
    item.available_stock > 0 &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          dispatch({
            type: "LOAD_CART",
            payload: parsed
              .filter(isCartItem)
              .map((item) => ({
                ...item,
                quantity: Math.min(item.quantity, item.available_stock, 10),
              })),
          });
        }
      }
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Continue without persistence when browser storage is unavailable.
    }
  }, [isHydrated, state.items]);

  const addItem = useCallback((item: CartItem) => {
    dispatch({ type: "ADD_ITEM", payload: item });
  }, []);

  const removeItem = useCallback((productId: string, variantId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { productId, variantId } });
  }, []);

  const updateQuantity = useCallback(
    (productId: string, variantId: string, quantity: number) => {
      dispatch({
        type: "UPDATE_QUANTITY",
        payload: { productId, variantId, quantity },
      });
    },
    []
  );

  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);
  const openCart = useCallback(() => dispatch({ type: "OPEN_CART" }), []);
  const closeCart = useCallback(() => dispatch({ type: "CLOSE_CART" }), []);

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const displayTotal = state.items.reduce(
    (sum, item) => sum + item.display_price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        isOpen: state.isOpen,
        isHydrated,
        itemCount,
        displayTotal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
