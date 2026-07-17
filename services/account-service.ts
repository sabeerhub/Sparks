/**
 * services/account-service.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Account-level actions from Settings → Account: name/username/email/
 * password changes, data export, and account deletion.
 */

import { createClient } from "@/lib/supabase";
import { checkUsernameAvailable } from "@/services/auth-service";

const supabase = createClient();

export async function updateFullName(newName: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Name can't be empty");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("profiles") as any)
    .update({ full_name: trimmed })
    .eq("id", user.id);
  if (error) throw error;
}

export async function updateUsername(newUsername: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const cleaned = newUsername.trim().toLowerCase();
  if (!cleaned) throw new Error("Username can't be empty");

  const available = await checkUsernameAvailable(cleaned);
  if (!available) throw new Error("That username is already taken");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("profiles") as any)
    .update({ username: cleaned })
    .eq("id", user.id);
  if (error) throw error;
}

/**
 * Requests an email change. Supabase sends a confirmation link to the new
 * address; the email doesn't actually change until that link is clicked.
 */
export async function requestEmailChange(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
  if (error) throw error;
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Permanently deletes the current user's account via a security-definer
 * RPC (deletes from auth.users; every other table cascades via existing
 * foreign key constraints). Irreversible.
 */
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw error;
}

/**
 * Gathers the user's own data (profile, sent messages, Spark connections,
 * Spark point history) into a single JSON export, triggering a browser
 * download. Scoped to data the user themselves generated/owns — not other
 * people's messages in shared chats, out of respect for their privacy too.
 */
export async function exportAccountData(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: profile }, { data: messages }, { data: sparkRequests }, { data: sparkTransactions }] = await Promise.all([
    (supabase.from("profiles") as any).select("*").eq("id", user.id).maybeSingle(),
    (supabase.from("messages") as any).select("id, chat_id, content, content_type, created_at, edited_at, deleted_at").eq("sender_id", user.id),
    (supabase.from("spark_requests") as any).select("*").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
    (supabase.from("spark_transactions") as any).select("*").eq("user_id", user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile,
    messages_sent: messages ?? [],
    spark_requests: sparkRequests ?? [],
    spark_transactions: sparkTransactions ?? [],
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sparks-account-data-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
