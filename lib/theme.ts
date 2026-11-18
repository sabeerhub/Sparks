/**
 * lib/theme.ts
 * ─────────────────────────────────────────────────────────────────────────
 * v1.7.0 — real dark mode, opt-in only. Light is the default; nothing
 * changes for the user until they flip the switch in Settings →
 * Appearance.
 *
 * Two values are kept apart on purpose:
 *   - the PREFERENCE ("light" | "dark" | "system") — what the user
 *     chose. Stored in localStorage, so it works even before sign-in
 *     and even though the profiles table has no theme column yet (see
 *     the note in AppearanceApplier). "system" is local-only: it is
 *     never sent to the server.
 *   - the RESOLVED theme ("light" | "dark") — what is actually painted,
 *     written to `document.documentElement.dataset.theme`. "system"
 *     resolves through matchMedia, and follows the phone live.
 *
 * The no-flash trick: `THEME_INIT_SCRIPT` runs as a blocking inline
 * script in the root layout before first paint, so the correct theme
 * is on <html> before anything renders. `applyTheme` is the same logic
 * for runtime changes (Settings switch, system change).
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "sparks-theme";

/** The choice the user made, or "light" when nothing is stored. */
export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "system") return stored;
    return "light";
  } catch {
    return "light";
  }
}

/** True when the user has ever picked a theme on this device. */
export function hasStoredThemePreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Resolve a preference to the theme that is actually painted. */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let systemListener: { media: MediaQueryList; handler: () => void } | null = null;

/**
 * Paint a preference right now and remember it. When the preference is
 * "system", also start listening to the phone's setting so the theme
 * follows it live; any other preference stops that listener.
 */
export function applyTheme(preference: ThemePreference): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolveTheme(preference));
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode / storage blocked — the theme still applies for
    // this session; it just won't be remembered.
  }

  if (systemListener) {
    systemListener.media.removeEventListener("change", systemListener.handler);
    systemListener = null;
  }
  if (preference === "system") {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      document.documentElement.setAttribute("data-theme", resolveTheme("system"));
    };
    media.addEventListener("change", handler);
    systemListener = { media, handler };
  }
}

/**
 * The blocking inline script for the root layout. Same logic as
 * applyTheme, but it must run before React (and before first paint),
 * so it is a plain string — no imports, no helpers. Keep it tiny and
 * side-effect free apart from the data-theme attribute.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("sparks-theme")||"light";var d=p==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light":p;document.documentElement.setAttribute("data-theme",d);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
