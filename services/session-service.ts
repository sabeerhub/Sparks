/**
 * services/session-service.ts
 * ─────────────────────────────────────────────────────────────────────────
 * App-level session registry on top of Supabase Auth's own session
 * management. Supabase handles tokens/JWTs; this table tracks which
 * devices are signed in with enough metadata to power the
 * Settings → Security → Device Management screen.
 *
 * Calling pattern:
 *   1. Call recordSession() immediately after a successful signIn.
 *   2. Call listSessions() to render the device list.
 *   3. Call revokeSession(id) / revokeAllOtherSessions() from the UI.
 */

import { createClient } from "@/lib/supabase";
import { parseUserAgent, formatDeviceLabel } from "@/lib/user-agent";
import type { DeviceSessionItem, UserSession } from "@/types";

const supabase = createClient();

// ─── Record a new session ───────────────────────────────────────────────────

/**
 * Writes a row to user_sessions capturing the current device's metadata.
 * Called right after signInWithPassword succeeds. Never throws — if this
 * fails, the user is still logged in; they just won't see this device in
 * the list until next login.
 */
export async function recordSession(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!session || !user) return;

    const ua = navigator.userAgent;
    const parsed = parseUserAgent(ua);
    const label = formatDeviceLabel(parsed);

    // Best-effort IP geolocation — never blocks session recording if it
    // fails or times out.
    let city: string | null = null;
    let country: string | null = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const geoRes = await fetch("https://ipapi.co/json/", {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (geoRes.ok) {
        const geo = await geoRes.json() as { city?: string; country_name?: string };
        city = geo.city ?? null;
        country = geo.country_name ?? null;
      }
    } catch {
      // Geolocation is purely decorative — never block login for it.
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("user_sessions") as any).insert({
      user_id: user.id,
      device_label: label,
      refresh_token_id: session.refresh_token,
      browser: parsed.browser,
      os_name: parsed.osName,
      device_type: parsed.deviceType,
      user_agent: ua,
      location_city: city,
      location_country: country,
      last_active_at: new Date().toISOString(),
    });
  } catch {
    // Non-fatal — session still exists even if we couldn't log it.
  }
}

/**
 * Bumps last_active_at on the current session row without creating a new
 * one. Call on route changes to keep "last active" fresh. Non-fatal.
 */
export async function touchSession(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!session || !user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("user_sessions") as any)
      .update({ last_active_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("refresh_token_id", session.refresh_token)
      .is("revoked_at", null);
  } catch {
    // Non-fatal.
  }
}

// ─── List sessions ──────────────────────────────────────────────────────────

/**
 * Returns all active (non-revoked) sessions for the current user, sorted
 * most-recently-active first, with isCurrent flagged on the one matching
 * the live session's refresh token.
 */
export async function listSessions(): Promise<DeviceSessionItem[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("user_sessions") as any)
    .select("*")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("last_active_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as UserSession[];
  const currentRefreshToken = session?.refresh_token ?? null;

  return rows.map((row): DeviceSessionItem => ({
    ...row,
    isCurrent: !!currentRefreshToken && row.refresh_token_id === currentRefreshToken,
  }));
}

// ─── Revoke sessions ────────────────────────────────────────────────────────

/**
 * Soft-revokes a single session by setting revoked_at. The device will be
 * signed out on its next request. RLS also enforces ownership at the DB level.
 */
export async function revokeSession(sessionId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("user_sessions") as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) throw error;
}

/**
 * Revokes every session except the one currently in use. Pairs with
 * supabase.auth.signOut({ scope: "others" }) to also invalidate the
 * underlying Supabase tokens on those devices.
 */
export async function revokeAllOtherSessions(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) throw new Error("Not authenticated");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (supabase.from("user_sessions") as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .neq("refresh_token_id", session?.refresh_token ?? "");

  if (dbError) throw dbError;

  const { error: authError } = await supabase.auth.signOut({ scope: "others" });
  if (authError) throw authError;
}
