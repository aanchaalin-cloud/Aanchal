import "server-only";

import {
  createServerClient,
  type SetAllCookies,
} from "@supabase/ssr";
import { cookies } from "next/headers";

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

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
