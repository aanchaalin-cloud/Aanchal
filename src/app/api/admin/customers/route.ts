import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/api-utils";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const supabase = await createServiceClient();

  let query = supabase
    .from("customers")
    .select("id, full_name, email, phone, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data: customers, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: "Unable to load customers." }, { status: 500 });
  }

  const customerEmails = (customers ?? []).map((c: { email: string }) => c.email.toLowerCase());

  const { data: orders } = await supabase
    .from("orders")
    .select("customer_email, total_amount, payment_status")
    .in("customer_email", customerEmails.length ? customerEmails : ["__none__"]);

  const stats = new Map<string, { orders: number; spent: number }>();
  for (const row of orders ?? []) {
    const key = (row.customer_email ?? "").toLowerCase();
    const current = stats.get(key) ?? { orders: 0, spent: 0 };
    if (row.payment_status !== "refunded") {
      current.orders += 1;
      current.spent += Number(row.total_amount ?? 0);
    }
    stats.set(key, current);
  }

  const data = (customers ?? []).map((c: { id: string; full_name: string; email: string; phone: string | null; created_at: string }) => ({
    ...c,
    orders: stats.get(c.email.toLowerCase())?.orders ?? 0,
    total_spent: stats.get(c.email.toLowerCase())?.spent ?? 0,
  }));

  return NextResponse.json({ success: true, data });
}
