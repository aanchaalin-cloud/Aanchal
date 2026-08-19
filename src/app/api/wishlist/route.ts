import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateRequest } from "@/lib/api-utils";
import { z } from "zod";

const wishlistSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
});

async function ensureCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }
): Promise<void> {
  try {
    const fullName =
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
    const { error } = await supabase
      .from("customers")
      .upsert(
        { id: user.id, email: (user.email ?? "").toLowerCase(), full_name: fullName },
        { onConflict: "id", ignoreDuplicates: true }
      );
    if (error) {
      console.warn("[wishlist] ensureCustomer failed:", error.message);
    }
  } catch (err) {
    console.warn("[wishlist] ensureCustomer exception:", err);
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json({ success: true, data: [] });
    }

    let user;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      return NextResponse.json({ success: true, data: [] });
    }

    if (!user) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data, error } = await supabase
      .from("wishlist_items")
      .select("id, product_id, created_at")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[wishlist] GET query error:", error.message);
      return NextResponse.json({ success: true, data: [] });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const productIds = data.map((item) => item.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug, price, discount_price, category, is_active")
      .in("id", productIds);

    const productMap = new Map((products ?? []).map((p) => [p.id, p]));

    const result = data
      .map((item) => ({
        ...item,
        products: productMap.get(item.product_id) ?? null,
      }))
      .filter((item) => item.products !== null);

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[wishlist] GET exception:", err);
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await validateRequest(request, wishlistSchema);
  if (body instanceof NextResponse) return body;

  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json({ success: false, error: "Service unavailable" }, { status: 503 });
    }

    let user;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      return NextResponse.json({ success: false, error: "Auth service unavailable" }, { status: 503 });
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Please sign in to save items to your wishlist" },
        { status: 401 }
      );
    }

    await ensureCustomer(supabase, user);

    const { error } = await supabase
      .from("wishlist_items")
      .upsert(
        { customer_id: user.id, product_id: body.productId },
        { onConflict: "customer_id,product_id", ignoreDuplicates: true }
      );

    if (error) {
      console.error("[wishlist] POST error:", error.message);
      return NextResponse.json({ success: false, error: "Failed to update wishlist" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[wishlist] POST exception:", err);
    return NextResponse.json({ success: false, error: "Failed to update wishlist" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const body = await validateRequest(request, wishlistSchema);
  if (body instanceof NextResponse) return body;

  try {
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json({ success: false, error: "Service unavailable" }, { status: 503 });
    }

    let user;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      return NextResponse.json({ success: false, error: "Auth service unavailable" }, { status: 503 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    await ensureCustomer(supabase, user);

    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("customer_id", user.id)
      .eq("product_id", body.productId);

    if (error) {
      console.error("[wishlist] DELETE error:", error.message);
      return NextResponse.json({ success: false, error: "Failed to update wishlist" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[wishlist] DELETE exception:", err);
    return NextResponse.json({ success: false, error: "Failed to update wishlist" }, { status: 500 });
  }
}
