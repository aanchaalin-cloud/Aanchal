import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Messages } from "@/lib/messages";
import type { ProductWithDetails } from "@/types";

export type ProductQueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

function filterActiveVariants<T extends ProductWithDetails>(product: T): T {
  return {
    ...product,
    product_variants: product.product_variants.filter(
      (v) => v.is_active !== false
    ),
  };
}

const productDetailsSelect = `
  *,
  product_images ( id, product_id, url, alt_text, position, created_at ),
  product_variants (
    id, product_id, size, color, color_hex, sku, stock, is_active, created_at, updated_at
  )
`;

export async function getActiveProductCatalog(): Promise<
  ProductQueryResult<ProductWithDetails[]>
> {
  if (!isSupabaseConfigured()) {
    return {
      data: null,
      error: Messages.productLoadError,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(productDetailsSelect)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[getActiveProductCatalog]", error.message);
    return { data: null, error: Messages.productLoadError };
  }

  const products = (data as ProductWithDetails[]) ?? [];
  return { data: products.map(filterActiveVariants), error: null };
}

export const getActiveProductBySlug = cache(async function getActiveProductBySlug(
  slug: string
): Promise<ProductQueryResult<ProductWithDetails>> {
  if (!isSupabaseConfigured()) {
    return {
      data: null,
      error: Messages.productNotFound,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(productDetailsSelect)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.warn("[getActiveProductBySlug]", error.message);
    return { data: null, error: Messages.productNotFound };
  }
  if (!data) {
    return { data: null, error: "PRODUCT_NOT_FOUND" };
  }

  return { data: filterActiveVariants(data as ProductWithDetails), error: null };
});

/**
 * Fetch all active product slugs for static generation.
 * Lightweight query — only the slug column is needed.
 */
export async function getActiveProductSlugs(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("is_active", true);

  if (error) {
    console.warn("[getActiveProductSlugs]", error.message);
    return [];
  }

  return ((data ?? []) as Array<{ slug: string }>).map((p) => p.slug);
}

/**
 * Fetch slug + timestamps for active products (used by sitemap).
 * Lightweight query — only the columns needed for sitemap entries.
 */
export async function getActiveProductSitemapEntries(): Promise<
  Array<{ slug: string; updated_at: string | null; created_at: string }>
> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("slug, updated_at, created_at")
    .eq("is_active", true);

  if (error) {
    console.warn("[getActiveProductSitemapEntries]", error.message);
    return [];
  }

  return (data ?? []) as Array<{
    slug: string;
    updated_at: string | null;
    created_at: string;
  }>;
}

/**
 * Fetch featured active products for homepage.
 */
export async function getFeaturedProducts(): Promise<ProductWithDetails[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_images ( id, url, alt_text, position ),
      product_variants ( id, size, color, color_hex, sku, stock, is_active )
    `
    )
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    console.warn("[getFeaturedProducts]", error.message);
    return [];
  }

  return ((data as ProductWithDetails[]) ?? []).map(filterActiveVariants);
}

/**
 * Fetch all products (active + inactive) for admin.
 * Uses server client with admin session — RLS allows admin to read all.
 */
export async function getAllProductsAdmin(): Promise<ProductWithDetails[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_images ( id, url, alt_text, position ),
      product_variants ( id, size, color, color_hex, sku, stock, is_active )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[getAllProductsAdmin]", error.message);
    return [];
  }

  return (data as ProductWithDetails[]) ?? [];
}

/**
 * Fetch a single product by ID for admin editing.
 * Admin can access inactive products.
 */
export async function getProductByIdAdmin(
  id: string
): Promise<ProductWithDetails | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_images ( id, url, alt_text, position ),
      product_variants ( id, size, color, color_hex, sku, stock, is_active )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.warn("[getProductByIdAdmin]", error.message);
    return null;
  }

  return data as ProductWithDetails;
}

/**
 * Fetch related products (same category, excluding current product).
 */
export async function getRelatedProducts(
  currentProductId: string,
  category: string,
  limit = 4
): Promise<ProductWithDetails[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data: sameCategory } = await supabase
    .from("products")
    .select(`
      *,
      product_images ( id, url, alt_text, position ),
      product_variants ( id, size, color, color_hex, sku, stock, is_active )
    `)
    .eq("is_active", true)
    .eq("category", category)
    .neq("id", currentProductId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((sameCategory ?? []) as ProductWithDetails[]).map(filterActiveVariants);
}
