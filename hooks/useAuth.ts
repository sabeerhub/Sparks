/**
 * hooks/useAuth.ts
 * ─────────────────────────────────────────────────────────────────────────
 * React state wrapper around services/auth-service.ts and
 * services/session-service.ts. The business logic lives in those services;
 * this hook adds session state tracking, key-pair lifecycle management, and
 * the React-friendly ergonomics the UI layer expects.
 *
 * OTP/magic-link auth is REMOVED. Flow is now:
 *   Signup  → email + password → email verification → login
 *   Login   → email or username + password
 *   Reset   → forgot-password email → reset link → new password → login
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { importPrivateKeyJwk } from "@/lib/crypto";
import { keyManager } from "@/lib/encryption";
import { chatCache } from "@/lib/storage";
import {
  signUp as authSignUp,
  signInWithEmailOrUsername,
  requestPasswordReset as authRequestReset,
  confirmPasswordReset as authConfirmReset,
  resendVerificationEmail as authResendVerification,
  type SignUpInput,
} from "@/services/auth-service";
import { recordSession, revokeAllOtherSessions } from "@/services/session-service";

const PRIVATE_KEY_SESSION_KEY = "sparks_private_key_jwk";

const supabase = createClient();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null);
      if (data.user) await restorePrivateKey();
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        keyManager.clear();
        sessionStorage.removeItem(PRIVATE_KEY_SESSION_KEY);
        await chatCache.clearAll();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Private key lifecycle ──────────────────────────────────────────────

  /**
   * Re-loads the in-memory ECDH private key from sessionStorage after a
   * same-tab refresh. sessionStorage survives a refresh within the same
   * browser tab but not an app restart or new tab — matching the intended
   * "keys only live as long as the browsing session" security posture.
   *
   * MVP note: stores raw JWK in sessionStorage. Upgrade path is
   * passphrase-based wrapping — see lib/encryption.ts.
   */
  async function restorePrivateKey() {
    const stored = sessionStorage.getItem(PRIVATE_KEY_SESSION_KEY);
    if (!stored) return;
    try {
      const jwk = JSON.parse(stored) as JsonWebKey;
      await importPrivateKeyJwk(jwk); // validates the key shape
      await keyManager.setPrivateKey(jwk);
    } catch {
      sessionStorage.removeItem(PRIVATE_KEY_SESSION_KEY);
    }
  }

  function persistPrivateKey(jwk: JsonWebKey) {
    sessionStorage.setItem(PRIVATE_KEY_SESSION_KEY, JSON.stringify(jwk));
  }

  // ── Auth actions ───────────────────────────────────────────────────────

  /**
   * Creates a new account. Stores the private key immediately so it
   * survives until the person confirms their email and logs in for
   * the first time — at which point restorePrivateKey() picks it up.
   */
  const signUp = useCallback(async (input: SignUpInput) => {
    const { privateKeyJwk, emailConfirmationRequired } = await authSignUp(input);
    persistPrivateKey(privateKeyJwk);
    await keyManager.setPrivateKey(privateKeyJwk);
    return { emailConfirmationRequired };
  }, []);

  /**
   * Signs in with email-or-username + password. Records the device in
   * the session registry (non-blocking) and restores the private key.
   */
  const signIn = useCallback(async (identifier: string, password: string) => {
    const data = await signInWithEmailOrUsername(identifier, password);
    setUser(data.user);
    recordSession().catch(() => {});
    await restorePrivateKey();
    return data;
  }, []);

  const resendVerificationEmail = useCallback(async (email: string) => {
    await authResendVerification(email);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await authRequestReset(email);
  }, []);

  const confirmPasswordReset = useCallback(async (newPassword: string) => {
    await authConfirmReset(newPassword);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    keyManager.clear();
    sessionStorage.removeItem(PRIVATE_KEY_SESSION_KEY);
    await chatCache.clearAll();
  }, []);

  /** Removes all other devices but keeps the current session active. */
  const logoutAllDevices = useCallback(async () => {
    await revokeAllOtherSessions();
  }, []);

  /** Signs out everywhere including the current device. */
  const logoutEverywhere = useCallback(async () => {
    await supabase.auth.signOut({ scope: "global" });
    keyManager.clear();
    sessionStorage.removeItem(PRIVATE_KEY_SESSION_KEY);
    await chatCache.clearAll();
  }, []);

  return {
    user,
    loading,
    signUp,
    signIn,
    resendVerificationEmail,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
    logoutAllDevices,
    logoutEverywhere,
  };
}
