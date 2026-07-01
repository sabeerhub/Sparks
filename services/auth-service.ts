/**
 * services/auth-service.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Pure Supabase Auth + profile calls — no React here, so this is testable
 * and reusable independent of hooks/useAuth.ts, which wraps these in state.
 *
 * Replaces the OTP-based flow entirely: signup is email+password, with
 * email verification (a real confirmation link, not a magic-link login —
 * the user still must set and use a password afterward) and login accepts
 * either email or username.
 */

import { createClient } from "@/lib/supabase";
import { generateKeyPair, exportPublicKeyJwk, exportPrivateKeyJwk } from "@/lib/crypto";
import type { Profile } from "@/types";

const supabase = createClient();

// ─── Username availability ──────────────────────────────────────────────────

/**
 * Calls the is_username_available() Postgres function (see migration 0004),
 * which works for anonymous/unauthenticated visitors on the signup page.
 * Network/RPC failures resolve to false (unavailable) rather than throwing,
 * so a transient blip doesn't let the form treat a possibly-taken username
 * as available.
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  if (!username) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("is_username_available", {
      p_username: username,
    });
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

// ─── Signup ──────────────────────────────────────────────────────────────────

export interface SignUpInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export interface SignUpResult {
  userId: string;
  emailConfirmationRequired: boolean;
}

/**
 * Full signup: creates the Supabase Auth user (email+password), generates
 * an ECDH key pair, and creates the profiles row — in that order, with
 * cleanup if a later step fails so a half-created account can't silently
 * block the username/email from ever being used again.
 */
export async function signUp(
  input: SignUpInput
): Promise<SignUpResult & { privateKeyJwk: JsonWebKey }> {
  const username = input.username.toLowerCase().trim();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign up did not return a user");

  const userId = authData.user.id;
  const emailConfirmationRequired = authData.session === null;

  const keyPair = await generateKeyPair();
  const publicJwk = await exportPublicKeyJwk(keyPair.publicKey);
  const privateJwk = await exportPrivateKeyJwk(keyPair.privateKey);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (supabase.from("profiles") as any).insert({
    id: userId,
    username,
    full_name: input.fullName.trim(),
    bio: null,
    avatar_url: null,
    public_key: JSON.stringify(publicJwk),
  });

  if (profileError) {
    // Roll back: an auth user with no profile permanently occupies this
    // email/username with no way to retry. cleanup_failed_signup() is a
    // security-definer RPC that deletes the orphaned auth.users row.
    // Identified by email (not auth.uid()) since no session exists yet
    // when "Confirm email" is enabled — see migration 0004 for the full
    // security reasoning behind this design.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .rpc("cleanup_failed_signup", { p_email: input.email.trim() })
      .catch(() => {
        // Best-effort. If cleanup fails, retrying signup will give a clear
        // "email/username already in use" error rather than a silent hole.
      });
    throw profileError;
  }

  return { userId, emailConfirmationRequired, privateKeyJwk: privateJwk };
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
  });
  if (error) throw error;
}

// ─── Login ───────────────────────────────────────────────────────────────────

/**
 * Resolves email-or-username to an actual email, then signs in with password.
 * Username lookup uses email_for_username() RPC (see migration 0004) —
 * an anonymous-callable security-definer function that returns only the
 * email for a given username, nothing else about the profile.
 */
export async function signInWithEmailOrUsername(
  identifier: string,
  password: string
) {
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes("@");

  let email = trimmed;

  if (!isEmail) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc("email_for_username", {
      p_username: trimmed.toLowerCase(),
    });
    if (error || !data) {
      // Same generic message as wrong password — don't reveal whether a
      // username exists, which would allow username enumeration via login.
      throw new Error("Invalid email/username or password.");
    }
    email = data as string;
  }

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    throw new Error("Invalid email/username or password.");
  }

  return signInData;
}

// ─── Password reset ──────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
  });
  if (error) throw error;
}

/**
 * Called on /reset-password after the user arrives via the email link.
 * By that point Supabase has already exchanged the recovery token for a
 * temporary session (handled by auth/callback/route.ts), so this is just
 * a normal authenticated password update.
 */
export async function confirmPasswordReset(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ─── Profile lookup ──────────────────────────────────────────────────────────

export async function fetchOwnProfile(userId: string): Promise<Profile | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("profiles") as any)
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data as Profile | null;
}
