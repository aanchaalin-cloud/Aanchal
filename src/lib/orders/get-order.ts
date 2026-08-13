import { createServiceClient } from "@/lib/supabase/server";

const DEFAULT_SELECT = "id, order_number, customer_name, customer_email, customer_phone, payment_method, payment_status, order_status, total_amount, prepaid_amount, paytm_order_id, razorpay_order_id, order_items(variant_id, quantity)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrderSupabaseClient = any; // Relaxed type to avoid strict supabase generics in helper

export async function getOrderById(orderId: string, supabase?: OrderSupabaseClient, select = DEFAULT_SELECT) {
  const client = supabase ?? (await createServiceClient());
  const res = await client.from("orders").select(select).eq("id", orderId).maybeSingle();
  return res;
}

export async function getOrderByProviderOrderId(provider: "paytm" | "razorpay", providerOrderId: string, supabase?: OrderSupabaseClient, select = DEFAULT_SELECT) {
  const client = supabase ?? (await createServiceClient());
  const column = provider === "paytm" ? "paytm_order_id" : "razorpay_order_id";
  const res = await client.from("orders").select(select).eq(column, providerOrderId).maybeSingle();
  return res;
}
