// Supabase client typing can be noisy for simple helpers; use a relaxed any here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StockSupabaseClient = any; // Relaxed type to avoid strict supabase generics in helper

export type StockItem = { variant_id: string; quantity: number };
export type StockResult = { variantId: string; quantity: number; success: boolean; error?: string };

export async function decrementStockForItems(
  supabase: StockSupabaseClient,
  items: StockItem[]
): Promise<StockResult[]> {
  // Use non-async mapping into promises to keep intent explicit
  const promises = items.map((item) =>
    supabase.rpc("decrement_variant_stock", { p_variant_id: item.variant_id, p_quantity: item.quantity })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((res: any) => {
        const rpcResult = res.data;
        const rpcError = res.error;
        const result = Array.isArray(rpcResult) && rpcResult.length > 0 ? (rpcResult[0] as { success: boolean; message?: string }) : null;
        return {
          variantId: item.variant_id,
          quantity: item.quantity,
          success: result?.success ?? false,
          error: rpcError?.message ?? result?.message ?? "Stock update failed",
        } as StockResult;
      })
  );

  const results = await Promise.all(promises);
  return results;
}

export async function incrementStockForItems(
  supabase: StockSupabaseClient,
  items: Array<{ variantId: string; quantity: number }>
): Promise<void> {
  const promises = items.map((item) => supabase.rpc("increment_variant_stock", { p_variant_id: item.variantId, p_quantity: item.quantity }));
  await Promise.all(promises);
}
