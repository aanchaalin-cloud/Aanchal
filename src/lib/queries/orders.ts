import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { OrderWithItems, OrderWithMeasurements, OrderStatusHistoryEntry } from "@/types";

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
 * Fetch a single order by ID for admin, including measurements.
 */
export async function getOrderByIdAdmin(
  id: string
): Promise<OrderWithMeasurements | null> {
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
      ),
      order_measurements (
        id, chest, waist, full_height, unit, personalisation_request
      )
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    console.warn("[getOrderByIdAdmin]", error.message);
    return null;
  }

  const order = data as Record<string, unknown>;
  const measurements = order.order_measurements;
  const normalizedMeasurements = Array.isArray(measurements)
    ? (measurements[0] ?? null)
    : measurements;

  return {
    ...order,
    order_measurements: normalizedMeasurements,
  } as OrderWithMeasurements;
}

/**
 * Fetch order status history for admin.
 */
export async function getOrderStatusHistory(
  orderId: string
): Promise<OrderStatusHistoryEntry[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("order_status_history")
    .select("id, order_id, old_status, new_status, changed_by, notes, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[getOrderStatusHistory]", error.message);
    return [];
  }

  return (data as OrderStatusHistoryEntry[]) ?? [];
}
