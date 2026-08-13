import "server-only";

import {
  createServerClient,
  type SetAllCookies,
} from "@supabase/ssr";
import { cookies } from "next/headers";
import { getRequiredServerEnv } from "@/lib/env";

async function getCookieContext() {
  try {
    const store = await cookies();
    return { store, ok: true as const };
  } catch {
    return { store: null, ok: false as const };
  }
}

const safeFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch {
    return new Response(null, { status: 503 });
  }
};

export async function createClient() {
  const { store } = await getCookieContext();
  const supabaseUrl = getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return store?.getAll() ?? [];
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          if (!store) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          } catch {
            // setAll called from Server Component — safe to ignore
          }
        },
      },
      global: { fetch: safeFetch },
    }
  );
}

export async function createServiceClient() {
  const { store } = await getCookieContext();
  const supabaseUrl = getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createServerClient(
    supabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return store?.getAll() ?? [];
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          if (!store) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          } catch {
            // safe to ignore
          }
        },
      },
      global: { fetch: safeFetch },
    }
  );
}
