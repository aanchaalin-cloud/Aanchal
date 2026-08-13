import { createServiceClient } from "@/lib/supabase/server";

export const INFLUENCER_COMMISSION_RATE = 0.1;

// Creates a pending commission entry for an order that has a valid referral code.
// Idempotent — a unique constraint on (order_id) prevents double crediting.
export async function createInfluencerEarnings(orderId: string): Promise<void> {
  try {
    const supabase = await createServiceClient();
    const { data: order } = await supabase
      .from("orders")
      .select("id, influencer_code, total_amount")
      .eq("id", orderId)
      .single();

    if (!order?.influencer_code || order.total_amount <= 0) return;

    const { data: influencer } = await supabase.rpc("get_influencer_by_code", {
      referral_code_input: order.influencer_code,
    });

    if (!influencer) return;

    const commissionAmount = Math.round(order.total_amount * INFLUENCER_COMMISSION_RATE);

    const { error } = await supabase.from("influencer_earnings").insert({
      influencer_id: influencer.id,
      order_id: order.id,
      order_amount: order.total_amount,
      commission_amount: commissionAmount,
      status: "pending",
    });

    if (error && error.code !== "23505") {
      console.warn("[influencer-earnings] insert failed:", error.message);
    }
  } catch (e) {
    console.warn("[influencer-earnings]", e instanceof Error ? e.message : "unknown");
  }
}

// Marks any commission linked to an order as cancelled (e.g. order cancelled).
export async function cancelInfluencerEarnings(orderId: string): Promise<void> {
  try {
    const supabase = await createServiceClient();
    await supabase
      .from("influencer_earnings")
      .update({ status: "cancelled" })
      .eq("order_id", orderId)
      .in("status", ["pending", "paid"]);
  } catch (e) {
    console.warn("[influencer-earnings] cancel failed:", e instanceof Error ? e.message : "unknown");
  }
}
