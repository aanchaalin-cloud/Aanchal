"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/context/AuthContext";

type WishlistContextValue = {
  productIds: string[];
  count: number;
  loading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<{ ok: boolean; requiresLogin: boolean }>;
};

const WishlistContext = createContext<WishlistContextValue>({
  productIds: [],
  count: 0,
  loading: true,
  isWishlisted: () => false,
  toggleWishlist: async () => ({ ok: false, requiresLogin: true }),
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [productIds, setProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);

    if (!user) {
      setProductIds([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch("/api/wishlist")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setProductIds((data.success ? data.data ?? [] : []).map((item: { product_id: string }) => item.product_id));
      })
      .catch(() => {
        if (!cancelled) setProductIds([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const isWishlisted = useCallback(
    (productId: string) => productIds.includes(productId),
    [productIds]
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!user) {
        return { ok: false, requiresLogin: true };
      }

      const inList = productIds.includes(productId);
      const res = await fetch("/api/wishlist", {
        method: inList ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      // Session is stale/dead server-side even though the client thinks the
      // user is signed in — send them back through login.
      if (res.status === 401) {
        return { ok: false, requiresLogin: true };
      }

      const data = await res.json();

      if (data.success) {
        setProductIds((prev) =>
          inList ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
        return { ok: true, requiresLogin: false };
      }
      return { ok: false, requiresLogin: false };
    },
    [user, productIds]
  );

  return (
    <WishlistContext.Provider
      value={{ productIds, count: productIds.length, loading, isWishlisted, toggleWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
