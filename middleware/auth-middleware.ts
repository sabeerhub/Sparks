/**
 * middleware/auth-middleware.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Re-exported from the root middleware.ts (Next.js only recognizes a
 * middleware file at the project root or src/ root — this file holds the
 * actual logic so it's organized under /middleware per the required
 * project structure, and middleware.ts just imports and re-exports it).
 *
 * Responsibilities:
 *   1. Refresh the Supabase session cookie on every request (required for
 *      SSR auth state to stay correct — @supabase/ssr needs this called
 *      somewhere on the request path).
 *   2. Redirect unauthenticated users away from protected routes.
 *   3. Redirect authenticated users away from auth screens back into the app.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/", "/login", "/otp", "/auth/callback"];

export async function authMiddleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + "/"));

  if (!user && !isPublicRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (path === "/login" || path === "/otp")) {
    return NextResponse.redirect(new URL("/chats", request.url));
  }

  return response;
}
