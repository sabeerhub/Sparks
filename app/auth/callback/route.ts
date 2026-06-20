/**
 * app/auth/callback/route.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Google OAuth redirects here with a `code` param after consent. Exchanges
 * it for a session, then routes to onboarding (new account) or the chat
 * list (returning user) — same fork as the OTP flow in useAuth.verifyOtp.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  // Note: ECDH key-pair provisioning for brand-new Google sign-ups happens
  // client-side (see hooks/useAuth.ts) since Web Crypto isn't available in
  // this server route — the onboarding screen triggers it on first render
  // when it detects no profile + no pending key in sessionStorage.
  return NextResponse.redirect(existingProfile ? `${origin}/chats` : `${origin}/onboarding/welcome`);
}
