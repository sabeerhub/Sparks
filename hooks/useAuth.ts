/**
 * hooks/useAuth.ts
 * ─────────────────────────────────────────────────────────────────────────
 * React state wrapper around services/auth-service.ts and
 * services/session-service.ts. The business logic lives in those services;
 * this hook adds session state tracking and the React-friendly ergonomics
 * the UI layer expects.
 *
 * V1: no client-side private key lifecycle — see services/message-service.ts
 * header for why. Messages are available immediately after login on any
 * device, with no key-loading step in this flow at all.
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

const supabase = createClient();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        await chatCache.clearAll();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Auth actions ───────────────────────────────────────────────────────

  const signUp = useCallback(async (input: SignUpInput) => {
    const { emailConfirmationRequired } = await authSignUp(input);
    return { emailConfirmationRequired };
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const data = await signInWithEmailOrUsername(identifier, password);
    setUser(data.user);
    recordSession().catch(() => {});
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
    await chatCache.clearAll();
  }, []);

  /** Removes all other devices but keeps the current session active. */
  const logoutAllDevices = useCallback(async () => {
    await revokeAllOtherSessions();
  }, []);

  /** Signs out everywhere including the current device. */
  const logoutEverywhere = useCallback(async () => {
    await supabase.auth.signOut({ scope: "global" });
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
