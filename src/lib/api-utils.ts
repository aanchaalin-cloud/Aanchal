import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// In-memory rate limiter
const hits = new Map<string, number[]>();
setInterval(() => {
  const n = Date.now();
  for (const [k, v] of hits) if (v.every((t) => t < n - 60000)) hits.delete(k);
}, 60000);

function rateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const windowStart = now - 60000;
  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= max) return false;
  hits.set(key, [...timestamps, now]);
  return true;
}

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const { data: admin } = await supabase.from("admin_users").select("id").eq("id", user.id).single();
  if (!admin) return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
}

export async function validateRequest<T>(
  request: NextRequest,
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } } },
  isAdmin = false,
): Promise<NextResponse | T> {
  // Rate limit
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`${isAdmin ? "admin" : "public"}:${ip}`, isAdmin ? 30 : 10)) {
    return NextResponse.json({ success: false, error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  // Origin check
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && !origin.includes(host) && !origin.includes("localhost")) {
    return NextResponse.json({ success: false, error: "Invalid request origin" }, { status: 403 });
  }

  // Parse body
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > (isAdmin ? 1_048_576 : 524_288)) {
      return NextResponse.json({ success: false, error: "Request body too large" }, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON in request body" }, { status: 400 });
  }

  // Validate
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
  }

  return parsed.data;
}
