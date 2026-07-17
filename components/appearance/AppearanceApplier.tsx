"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";

const supabase = createClient();

/**
 * Mounted once at the app root. Reads the signed-in user's appearance
 * preferences and applies them as attributes on <html>, which globals.css
 * uses to drive font scale and message bubble sizing everywhere at once —
 * no per-component prop drilling needed. Re-runs on auth change so
 * switching accounts on the same device picks up the right preferences.
 */
export function AppearanceApplier() {
  useEffect(() => {
    const apply = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from("profiles") as any)
        .select("theme_preference, font_size, bubble_size")
        .eq("id", user.id)
        .maybeSingle();

      if (!data) return;
      document.documentElement.setAttribute("data-theme", data.theme_preference ?? "light");
      document.documentElement.setAttribute("data-font-size", data.font_size ?? "medium");
      document.documentElement.setAttribute("data-bubble-size", data.bubble_size ?? "standard");
    };

    apply();

    const { data: sub } = supabase.auth.onAuthStateChange(() => apply());
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
