/**
 * middleware/auth-middleware.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Re-exported from the root middleware.ts. Handles:
 *   1. Refreshing the Supabase session cookie on every request.
 *   2. Redirecting unauthenticated users away from protected routes.
 *   3. Redirecting authenticated users away from auth screens into the app.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/onboarding",
];

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
  const isPublicRoute = PUBLIC_ROUTES.some(
    (r) => path === r || path.startsWith(r + "/")
  );

  if (!user && !isPublicRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect logged-in users away from auth pages back into the app.
  if (
    user &&
    ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"].some(
      (p) => path === p
    )
  ) {
    return NextResponse.redirect(new URL("/chats", request.url));
  }

  return response;
}
