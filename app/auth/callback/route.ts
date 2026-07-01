/**
 * app/auth/callback/route.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Handles all Supabase Auth redirect callbacks:
 *
 *   1. Email verification (type = "signup" or "email"):
 *      User clicks the link in their verification email → session is
 *      established → redirect to /login?verified=1 so the login page
 *      can show "Your email is verified — please log in."
 *
 *   2. Password reset (type = "recovery"):
 *      User clicks the link in their password-reset email → session is
 *      established → redirect to /reset-password where they pick a new
 *      password. The session here is a short-lived recovery token.
 *
 *   3. OAuth sign-in (code / pkce flow):
 *      Kept for future Google OAuth use. Routes to /signup/profile-setup
 *      for brand-new accounts or /chats for returning ones.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "signup"
    | "email"
    | "recovery"
    | "magiclink"
    | null;
  const next = searchParams.get("next") ?? null;

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}/login?error=invalid_callback`);
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  let sessionError: Error | null = null;
  let userId: string | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    sessionError = error;
    userId = data?.user?.id ?? null;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    sessionError = error;
    userId = data?.user?.id ?? null;
  }

  if (sessionError || !userId) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Password reset: send to /reset-password to pick a new password.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  // Email verification: confirmed, now ask them to log in with their password.
  if (type === "signup" || type === "email") {
    return NextResponse.redirect(`${origin}/login?verified=1`);
  }

  // OAuth / generic: route to profile setup (new) or chats (returning).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingProfile } = await (supabase.from("profiles") as any)
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(
    existingProfile ? `${origin}/chats` : `${origin}/signup/profile-setup`
  );
}
