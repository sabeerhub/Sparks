"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import {
  applyTheme,
  getStoredThemePreference,
  hasStoredThemePreference,
  type ThemePreference,
} from "@/lib/theme";

const supabase = createClient();

/**
 * Mounted once at the app root. Reads the signed-in user's appearance
 * preferences and applies them as attributes on <html>, which globals.css
 * uses to drive font scale, message bubble sizing and (v1.7.0) the
 * Light/Dark theme everywhere at once — no per-component prop drilling.
 * Re-runs on auth change so switching accounts on the same device picks
 * up the right preferences.
 *
 * Theme precedence (v1.7.0): the choice stored on THIS device wins —
 * the blocking script in the root layout already painted it before
 * first paint. The server profile is only consulted when this device
 * has never picked a theme, so a theme chosen on another device still
 * carries over. NOTE: the profiles table has no theme_preference /
 * font_size / bubble_size columns in migrations 0001–0007, so the
 * server read below currently finds nothing — the theme works fully
 * from localStorage, and font/bubble size keep working from the same
 * local fallback. If cross-device sync is ever wanted, a small
 * migration adding those three columns is the follow-up; nothing here
 * breaks without it.
 */
export function AppearanceApplier() {
  useEffect(() => {
    // The device's own choice is already painted by the head script;
    // this just (re)applies it through the same path so the "system"
    // listener starts when the preference is System.
    applyTheme(getStoredThemePreference());

    const apply = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("profiles") as any)
        .select("theme_preference, font_size, bubble_size")
        .eq("id", user.id)
        .maybeSingle();

      if (!data) return;
      // Theme: only the server value may fill a gap — never override
      // a choice this device already made.
      if (!hasStoredThemePreference() && (data.theme_preference === "light" || data.theme_preference === "dark")) {
        applyTheme(data.theme_preference as ThemePreference);
      }
      document.documentElement.setAttribute("data-font-size", data.font_size ?? "medium");
      document.documentElement.setAttribute("data-bubble-size", data.bubble_size ?? "standard");
    };

    apply();

    const { data: sub } = supabase.auth.onAuthStateChange(() => apply());
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
