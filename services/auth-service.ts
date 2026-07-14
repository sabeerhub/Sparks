/**
 * services/auth-service.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Pure Supabase Auth + profile calls — no React here, so this is testable
 * and reusable independent of hooks/useAuth.ts, which wraps these in state.
 *
 * V1 note: a public key is still generated and stored on profiles.public_key
 * at signup (harmless, world-readable) so a future version can introduce
 * true E2E encryption without a schema change. The private key is no
 * longer generated, persisted, or used anywhere client-side — see
 * services/message-service.ts header for the full reasoning.
 */

import { createClient } from "@/lib/supabase";
import { generateKeyPair, exportPublicKeyJwk } from "@/lib/crypto";
import type { Profile } from "@/types";

const supabase = createClient();

// ─── Username availability ──────────────────────────────────────────────────

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
 * a public key placeholder for future E2E support, and creates the
 * profiles row — in that order, with cleanup if a later step fails so a
 * half-created account can't silently block the username/email from ever
 * being used again.
 */
export async function signUp(input: SignUpInput): Promise<SignUpResult> {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .rpc("cleanup_failed_signup", { p_email: input.email.trim() })
      .catch(() => {});
    throw profileError;
  }

  return { userId, emailConfirmationRequired };
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
  });
  if (error) throw error;
}

// ─── Login ───────────────────────────────────────────────────────────────────

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
