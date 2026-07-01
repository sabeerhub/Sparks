/**
 * lib/user-agent.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Minimal User-Agent parsing for the device management screen. Deliberately
 * not a full library (no new npm dependency) — covers the browsers/platforms
 * people actually use, with honest "Unknown" fallbacks rather than guessing
 * wrong. This is display-only data shown to the user about their own
 * sessions, not a security boundary.
 */

export interface ParsedUserAgent {
  browser: string;
  osName: string;
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
}

export function parseUserAgent(ua: string): ParsedUserAgent {
  if (!ua) {
    return { browser: "Unknown", osName: "Unknown", deviceType: "unknown" };
  }

  return {
    browser: detectBrowser(ua),
    osName: detectOs(ua),
    deviceType: detectDeviceType(ua),
  };
}

function detectBrowser(ua: string): string {
  // Order matters: many browsers include "Safari" or "Chrome" tokens in
  // their UA string for legacy compatibility, so more specific checks run first.
  if (/EdgA|Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Firefox\/|FxiOS/.test(ua)) return "Firefox";
  if (/CriOS/.test(ua)) return "Chrome";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Version\/.*Safari/.test(ua)) return "Safari";
  if (/MSIE|Trident/.test(ua)) return "Internet Explorer";
  return "Unknown browser";
}

function detectOs(ua: string): string {
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown OS";
}

function detectDeviceType(ua: string): ParsedUserAgent["deviceType"] {
  if (/iPad/.test(ua)) return "tablet";
  if (/Android/.test(ua) && !/Mobile/.test(ua)) return "tablet";
  if (/Mobile|iPhone|iPod/.test(ua)) return "mobile";
  if (/Windows|Macintosh|Linux|X11/.test(ua)) return "desktop";
  return "unknown";
}

/** Short human-friendly label for the device list — "Chrome on Android" etc. */
export function formatDeviceLabel(parsed: ParsedUserAgent): string {
  return `${parsed.browser} on ${parsed.osName}`;
}
