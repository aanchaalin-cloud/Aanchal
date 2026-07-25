import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { OrderWithItems } from "@/types";

/**
 * Fetch all orders for admin order management.
 * Admin only — RLS enforced.
 */
export async function getAllOrdersAdmin(): Promise<OrderWithItems[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (
        id, product_id, variant_id,
        product_name, product_slug, image_url,
        size, color, sku,
        unit_price, quantity, line_total
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[getAllOrdersAdmin]", error.message);
    return [];
  }

  return (data as OrderWithItems[]) ?? [];
}

/**
 * Fetch a single order by ID for admin.
 */
export async function getOrderByIdAdmin(
  id: string
): Promise<OrderWithItems | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (
        id, product_id, variant_id,
        product_name, product_slug, image_url,
        size, color, sku,
        unit_price, quantity, line_total
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.warn("[getOrderByIdAdmin]", error.message);
    return null;
  }

  return data as OrderWithItems;
}
