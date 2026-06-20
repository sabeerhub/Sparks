import { createBrowserClient } from "@supabase/ssr";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types";

/**
 * Browser client — used in Client Components and hooks. Safe to call
 * repeatedly; @supabase/ssr handles singleton-ish reuse internally.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Server client — used in Server Components, Route Handlers, and Server
 * Actions. Reads/writes the auth cookie so SSR pages render in a logged-in
 * state without a client-side flash.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — middleware handles refresh instead.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above.
          }
        },
      },
    }
  );
}

/**
 * IMPORTANT: never construct a client with the service_role key anywhere
 * under /app or /components. The service role key bypasses RLS entirely
 * and must only ever be read from a trusted server context (e.g. a Vercel
 * cron route) via process.env.SUPABASE_SERVICE_ROLE_KEY, never exposed
 * with the NEXT_PUBLIC_ prefix.
 */
