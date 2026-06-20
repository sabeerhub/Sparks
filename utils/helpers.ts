/**
 * utils/helpers.ts — small, pure, dependency-free helpers shared by
 * components and services. Anything that touches Supabase or Web Crypto
 * belongs in lib/ or services/, not here.
 */

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatLastSeen(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatChatListTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "short" });

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username.toLowerCase());
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Truncates a decrypted message preview for the chat list — never logs/persists the full text elsewhere. */
export function truncatePreview(text: string, maxLength = 40): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Generates a stable color from a string, used for avatar fallback backgrounds. */
export function colorFromString(str: string): string {
  const palette = ["#007AFF", "#34C759", "#FF9500", "#FF3B30", "#AF52DE", "#5AC8FA"];
  const index = str.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % palette.length;
  return palette[index] ?? palette[0]!;
}
