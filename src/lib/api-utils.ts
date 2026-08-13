import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// In-memory rate limiter — works within a single serverless instance.
// NOTE: In serverless (Vercel), each cold start gets a fresh Map, so this
// provides best-effort protection only. For distributed rate limiting,
// use Upstash Redis with @upstash/ratelimit.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;

function rateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= max) return false;
  hits.set(key, [...timestamps, now]);
  // Lazy cleanup: if map grows large, purge stale entries
  if (hits.size > 10_000) {
    for (const [k, v] of hits) {
      if (v.every((t) => t < windowStart)) hits.delete(k);
    }
  }
  return true;
}

export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const { data: admin } = await supabase.from("admin_users").select("id").eq("id", user.id).single();
  if (!admin) return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  return null;
}

export async function requireSuperAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (!admin) return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
  if (admin.role !== "superadmin") {
    return NextResponse.json({ success: false, error: "Super admin access required" }, { status: 403 });
  }
  return null;
}

function isSameOrigin(origin: string, host: string): boolean {
  try {
    // Compare hostnames only: dev servers and some proxies send the origin on
    // a different port (e.g. 3001 vs the Host header), which is still the same
    // origin as far as CSRF is concerned.
    const originHost = new URL(origin).hostname;
    const hostHost = host.split(":")[0];
    if (originHost === hostHost) return true;
    // Localhost origin is only acceptable when the site itself is served from
    // localhost (local dev); never trust a localhost Origin on a public host.
    const isLocalHost = hostHost === "localhost" || hostHost === "127.0.0.1";
    return isLocalHost && (originHost === "localhost" || originHost === "127.0.0.1");
  } catch {
    return false;
  }
}

export async function validateRequest<T>(
  request: NextRequest,
  schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { issues: Array<{ message: string }> } } },
  isAdmin = false,
): Promise<NextResponse | T> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`${isAdmin ? "admin" : "public"}:${ip}`, isAdmin ? 30 : 10)) {
    return NextResponse.json({ success: false, error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && !isSameOrigin(origin, host)) {
    return NextResponse.json({ success: false, error: "Invalid request origin" }, { status: 403 });
  }

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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues.map((i) => i.message).join(", ") }, { status: 400 });
  }

  return parsed.data;
}
