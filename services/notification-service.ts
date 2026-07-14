/**
 * services/notification-service.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Notifications are populated server-side by Postgres triggers (new
 * message, Spark request received/accepted — see migration). This file is
 * just read/update access from the client: fetch, mark read, clear.
 */

import { createClient } from "@/lib/supabase";
import type { AppNotification } from "@/types";

const supabase = createClient();

export async function fetchNotifications(limit = 50): Promise<AppNotification[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("notifications") as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("notifications") as any).update({ is_read: true }).eq("id", id);
}

export async function markAllNotificationsRead() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("notifications") as any).update({ is_read: true }).eq("is_read", false);
}

export async function deleteNotification(id: string) {
  await supabase.from("notifications").delete().eq("id", id);
}

export async function clearAllNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").delete().eq("user_id", user.id);
}
