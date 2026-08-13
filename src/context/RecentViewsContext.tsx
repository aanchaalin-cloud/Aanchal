"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const RECENT_VIEWS_KEY = "vastra_recent_views_v1";
const MAX_RECENT_VIEWS = 20;

type RecentViewsContextValue = {
  slugs: string[];
  isHydrated: boolean;
  recordView: (slug: string) => void;
};

const RecentViewsContext = createContext<RecentViewsContextValue | null>(null);

export function RecentViewsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_VIEWS_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSlugs(
            parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_RECENT_VIEWS)
          );
        }
      }
    } catch {
      localStorage.removeItem(RECENT_VIEWS_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    try {
      localStorage.setItem(RECENT_VIEWS_KEY, JSON.stringify(slugs));
    } catch {
      // Continue without persistence when browser storage is unavailable.
    }
  }, [isHydrated, slugs]);

  const recordView = useCallback((slug: string) => {
    setSlugs((prev) => [slug, ...prev.filter((s) => s !== slug)].slice(0, MAX_RECENT_VIEWS));
  }, []);

  return (
    <RecentViewsContext.Provider value={{ slugs, isHydrated, recordView }}>
      {children}
    </RecentViewsContext.Provider>
  );
}

export function useRecentViews(): RecentViewsContextValue {
  const context = useContext(RecentViewsContext);
  if (!context) {
    throw new Error("useRecentViews must be used within a RecentViewsProvider");
  }
  return context;
}
