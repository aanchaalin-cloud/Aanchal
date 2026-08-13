import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { OrderWithItems, ProductWithDetails } from "@/types";

export type CustomerProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
};

export type CustomerAddress = {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
  created_at: string;
};

export type InfluencerEarningRow = {
  id: string;
  order_id: string;
  order_amount: number;
  commission_amount: number;
  status: "pending" | "paid" | "cancelled";
  paid_at: string | null;
  created_at: string;
  order: {
    id: string;
    created_at: string;
    total_amount: number;
    order_status: string;
  } | null;
};

export type InfluencerStatus = {
  status: string;
  referral_code: string | null;
  created_at: string;
  earnings?: { total: number; pending: number; paid: number; orders: number };
};

export async function getCustomerProfile(userId: string): Promise<CustomerProfile | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const { data } = await supabase
    .from("customers")
    .select("id, full_name, email, phone, created_at")
    .eq("id", userId)
    .single();

  return (data as CustomerProfile) ?? null;
}

export async function getCustomerAddresses(userId: string): Promise<CustomerAddress[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customer_addresses")
    .select(
      "id, label, full_name, phone, address_line1, address_line2, city, state, pincode, country, is_default, created_at"
    )
    .eq("customer_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[getCustomerAddresses]", error.message);
    return [];
  }

  return (data as CustomerAddress[]) ?? [];
}

export async function getInfluencerEarningsDetail(
  userId: string
): Promise<InfluencerEarningRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("influencer_earnings")
    .select(
      `
      id, order_id, order_amount, commission_amount, status, paid_at, created_at,
      orders ( id, created_at, total_amount, order_status )
    `
    )
    .eq("influencer_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.warn("[getInfluencerEarningsDetail]", error.message);
    return [];
  }

  return (data as unknown as InfluencerEarningRow[]) ?? [];
}

export async function getOrdersByEmail(email: string): Promise<OrderWithItems[]> {
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
    .eq("customer_email", email)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.warn("[getOrdersByEmail]", error.message);
    return [];
  }

  return (data as OrderWithItems[]) ?? [];
}

export async function getWishlistProducts(userId: string): Promise<ProductWithDetails[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("wishlist_items")
    .select(
      `
      product_id,
      products (
        id, name, slug, description, category, price, discount_price,
        fabric, wash_care, is_featured, is_active, created_at, updated_at,
        product_images ( id, product_id, url, alt_text, position, created_at ),
        product_variants ( id, product_id, size, color, color_hex, sku, stock, is_active, created_at, updated_at )
      )
    `
    )
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[getWishlistProducts]", error.message);
    return [];
  }

  const products = (data ?? [])
    .map((row: { products: ProductWithDetails[] }) => row.products?.[0])
    .filter((p: ProductWithDetails | undefined): p is ProductWithDetails => Boolean(p));

  return products ?? [];
}

export async function getInfluencerStatus(userId: string): Promise<InfluencerStatus | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const { data } = await supabase
    .from("influencer_profiles")
    .select("status, referral_code, created_at")
    .eq("id", userId)
    .maybeSingle();

  const profile = (data as InfluencerStatus | null) ?? null;
  if (!profile || profile.status !== "approved") return profile;

  const { data: earnings } = await supabase
    .from("influencer_earnings")
    .select("status, commission_amount")
    .eq("influencer_id", userId);

  const summary = { total: 0, pending: 0, paid: 0, orders: 0 };
  for (const row of earnings ?? []) {
    if (row.status === "cancelled") continue;
    summary.total += row.commission_amount;
    summary.orders += 1;
    if (row.status === "pending") summary.pending += row.commission_amount;
    if (row.status === "paid") summary.paid += row.commission_amount;
  }

  return { ...profile, earnings: summary };
}
