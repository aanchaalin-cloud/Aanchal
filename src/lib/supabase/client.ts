import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * Uses the public anon key — safe for client-side use.
 * Subject to RLS policies.
 *
 * Use this in:
 * - Client components ('use client')
 * - Product browsing
 * - Admin auth (login/logout only)
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
