/**
 * hooks/useUsernameAvailability.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Debounced live username availability check for the signup form. Calls
 * the is_username_available() RPC (works for unauthenticated visitors)
 * and exposes a clean status value the form can render as ✓/✗ feedback.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { checkUsernameAvailable } from "@/services/auth-service";
import { isValidUsername } from "@/utils/helpers";

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const DEBOUNCE_MS = 400;

export function useUsernameAvailability(username: string): UsernameStatus {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<string>("");

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = username.trim().toLowerCase();

    if (!trimmed) {
      setStatus("idle");
      return;
    }

    if (!isValidUsername(trimmed)) {
      setStatus("invalid");
      return;
    }

    setStatus("checking");
    latestRef.current = trimmed;

    timerRef.current = setTimeout(async () => {
      const snapshot = trimmed;
      const available = await checkUsernameAvailable(snapshot);

      // Discard stale results if the user kept typing while this was in flight.
      if (latestRef.current !== snapshot) return;

      setStatus(available ? "available" : "taken");
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [username]);

  return status;
}
