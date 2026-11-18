/**
 * services/message-service.ts
 * ─────────────────────────────────────────────────────────────────────────
 * V1: plain-text messages, secured by Supabase Auth + RLS + HTTPS +
 * Supabase's server-side encryption at rest. Client-side E2E encryption
 * (private key wrapped by a password-derived key, with all the
 * "sessionStorage clears the key" fragility that came with it) has been
 * removed for V1 reliability. True E2E with a proper recovery-key flow is
 * planned for a future version (V4/V5) without changing this auth model.
 */

import { createClient } from "@/lib/supabase";
import { canSendMessage, msUntilNextMessageSlot, RateLimitError } from "@/lib/rateLimit";
import { chatCache } from "@/lib/storage";
import { sendMediaMessage, getMediaUrl } from "@/services/media-service";
import type { DecryptedMessage, QueuedMessage, MessageReaction } from "@/types";

const supabase = createClient();

interface SendParams {
  chatId: string;
  plaintext: string;
  replyToId?: string | null;
}

/**
 * Full send path: client-side rate check -> RPC insert (which re-checks
 * the rate limit server-side) -> return the row the UI should render.
 * Throws RateLimitError if the client-side throttle trips, so the caller
 * can show "slow down" without a round trip.
 */
export async function sendMessage({
  chatId,
  plaintext,
  replyToId = null,
}: SendParams): Promise<DecryptedMessage> {
  if (!canSendMessage(chatId)) {
    throw new RateLimitError(msUntilNextMessageSlot(chatId));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("send_message", {
    p_chat_id: chatId,
    p_content: plaintext,
    p_content_type: "text",
    p_reply_to_id: replyToId,
  });

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();

  return {
    id: data as string,
    chat_id: chatId,
    sender_id: user!.id,
    text: plaintext,
    content_type: "text",
    reply_to_id: replyToId,
    is_forwarded: false,
    edited_at: null,
    deleted_at: null,
    created_at: new Date().toISOString(),
    status: "sent",
  };
}

/**
 * Sends with full offline support: writes an optimistic row to the cache
 * immediately (status "pending"), then attempts the real send. On failure
 * (offline, rate-limited, etc.) the message stays queued in the outbox and
 * lib/storage.ts's reconnect listener retries it automatically.
 */
export async function sendMessageOptimistic(params: SendParams & { clientId: string }) {
  const optimisticRow: DecryptedMessage = {
    id: params.clientId,
    chat_id: params.chatId,
    sender_id: (await supabase.auth.getUser()).data.user!.id,
    text: params.plaintext,
    content_type: "text",
    reply_to_id: params.replyToId ?? null,
    is_forwarded: false,
    edited_at: null,
    deleted_at: null,
    created_at: new Date().toISOString(),
    status: "pending",
  };

  await chatCache.addOptimisticMessage(params.chatId, optimisticRow);

  try {
    const serverMessage = await sendMessage(params);
    await chatCache.resolveMessage(params.chatId, params.clientId, serverMessage);
    return serverMessage;
  } catch (err) {
    const queued: QueuedMessage = {
      client_id: params.clientId,
      chat_id: params.chatId,
      plaintext: params.plaintext,
      reply_to_id: params.replyToId ?? null,
      created_at: optimisticRow.created_at,
      attempts: 1,
      status: "failed",
    };
    await chatCache.enqueue(queued);
    await chatCache.markFailed(params.chatId, params.clientId);
    throw err;
  }
}

/**
 * Fetches a page of message history for a chat. Pass `before` (an ISO
 * timestamp) to paginate backwards for infinite scroll.
 */
export async function fetchMessages(
  chatId: string,
  opts: { before?: string; limit?: number } = {}
): Promise<DecryptedMessage[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from("messages") as any)
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.before) query = query.lt("created_at", opts.before);

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return [];

  const messages: DecryptedMessage[] = data.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row: any): DecryptedMessage => ({
      id: row.id,
      chat_id: row.chat_id,
      sender_id: row.sender_id,
      text: row.deleted_at ? "" : (row.content ?? ""),
      content_type: row.content_type,
      media_url: row.media_path ?? undefined,
      reply_to_id: row.reply_to_id,
      is_forwarded: row.is_forwarded ?? false,
      edited_at: row.edited_at,
      deleted_at: row.deleted_at,
      created_at: row.created_at,
      status: "sent",
    })
  );

  return messages.reverse(); // oldest first for rendering top-to-bottom
}

/**
 * Server-side search inside one chat: matches message text (and media
 * file names — media rows store the file name in `content`) with a
 * case-insensitive substring match, across the chat's whole history
 * (RLS scopes it to chats the caller belongs to). Deleted messages
 * never match. Returns at most 100 rows, oldest first, so the thread
 * can render them in order with day separators. The caller says
 * "first 100 matches" when the cap is hit — never a fake total.
 */
export async function searchMessages(
  chatId: string,
  query: string
): Promise<DecryptedMessage[]> {
  const q = query.trim();
  if (!q) return [];

  // Escape the LIKE wildcards so a query like "100%" matches literally.
  const escaped = q.replace(/[%_\\]/g, (c) => `\\${c}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("messages") as any)
    .select("*")
    .eq("chat_id", chatId)
    .is("deleted_at", null)
    .ilike("content", `%${escaped}%`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  if (!data?.length) return [];

  const messages: DecryptedMessage[] = data.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row: any): DecryptedMessage => ({
      id: row.id,
      chat_id: row.chat_id,
      sender_id: row.sender_id,
      text: row.content ?? "",
      content_type: row.content_type,
      media_url: row.media_path ?? undefined,
      reply_to_id: row.reply_to_id,
      is_forwarded: row.is_forwarded ?? false,
      edited_at: row.edited_at,
      deleted_at: row.deleted_at,
      created_at: row.created_at,
      status: "sent",
    })
  );

  return messages.reverse(); // oldest first
}

export async function editMessage(messageId: string, newPlaintext: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("messages") as any)
    .update({ content: newPlaintext, edited_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) throw error;
}

/** Soft-delete: wipes content, keeps the row as a tombstone for "message deleted" UI. */
export async function deleteMessage(messageId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("messages") as any)
    .update({ content: "", deleted_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) throw error;
}

/**
 * Marks a message I sent as forwarded. Returns true only when the flag
 * actually stuck. It returns false (never throws) when the column does
 * not exist yet — migration 0007 has not been run on the live project —
 * so forwarding still delivers the message, just without the label
 * until the migration lands. The caller reports the label from the
 * return value, never by guessing.
 */
export async function markForwarded(messageId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("messages") as any)
    .update({ is_forwarded: true })
    .eq("id", messageId)
    .eq("sender_id", user.id);
  return !error;
}

/** Best-effort MIME guess from a file name, for re-sending a forwarded file. */
function mimeFromFileName(fileName: string, contentType: DecryptedMessage["content_type"]): string {
  if (contentType === "voice") return "audio/webm";
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    csv: "text/csv",
    zip: "application/zip",
  };
  return byExt[ext] ?? "application/octet-stream";
}

/**
 * Forwards a message to another chat, for real. Text is re-sent through
 * the normal send path; media is downloaded from its signed URL and
 * re-uploaded into the target chat's Storage folder — a forward by
 * reference would not work, because Storage RLS only lets a chat's
 * members read objects under that chat's folder, and the target chat's
 * members are not members of the source chat. The new row is marked
 * forwarded (see markForwarded) so it shows a "Forwarded" label.
 * Throws on send failure so the caller can report which chat failed.
 */
export async function forwardMessage(
  source: DecryptedMessage,
  targetChatId: string
): Promise<DecryptedMessage> {
  let sent: DecryptedMessage;

  if (source.content_type === "text" || !source.media_url) {
    sent = await sendMessage({ chatId: targetChatId, plaintext: source.text });
  } else {
    const url = await getMediaUrl(source.media_url);
    if (!url) throw new Error("Couldn't load the file to forward it.");
    const res = await fetch(url);
    if (!res.ok) throw new Error("Couldn't load the file to forward it.");
    const blob = await res.blob();
    sent = await sendMediaMessage({
      chatId: targetChatId,
      file: blob,
      fileName: source.text || "File",
      mimeType: mimeFromFileName(source.text || "", source.content_type),
    });
  }

  const labelled = await markForwarded(sent.id);
  return { ...sent, is_forwarded: labelled };
}

export async function reactToMessage(messageId: string, emoji: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("message_reactions") as any).upsert(
    { message_id: messageId, user_id: user.id, emoji },
    { onConflict: "message_id,user_id" }
  );
  if (error) throw error;
}

export async function removeReaction(messageId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  // Scoped to the current user: removing my reaction must never remove
  // the other person's reaction on the same message.
  const { error } = await supabase
    .from("message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", user.id);
  if (error) throw error;
}

/** Loads every reaction on the given messages, grouped by message id. */
export async function fetchReactions(messageIds: string[]): Promise<Record<string, MessageReaction[]>> {
  if (!messageIds.length) return {};
  const { data, error } = await supabase
    .from("message_reactions")
    .select("message_id, user_id, emoji, created_at")
    .in("message_id", messageIds);
  if (error) throw error;
  const map: Record<string, MessageReaction[]> = {};
  ((data ?? []) as MessageReaction[]).forEach((r) => {
    (map[r.message_id] ??= []).push(r);
  });
  return map;
}

export async function markDelivered(messageIds: string[]) {
  if (!messageIds.length) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const rows = messageIds.map((id) => ({ message_id: id, user_id: user.id, status: "delivered" as const }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("message_receipts") as any).upsert(rows, { onConflict: "message_id,user_id" });
  if (error) throw error;
}

export async function markRead(messageIds: string[]) {
  if (!messageIds.length) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const rows = messageIds.map((id) => ({ message_id: id, user_id: user.id, status: "read" as const }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("message_receipts") as any).upsert(rows, { onConflict: "message_id,user_id" });
  if (error) throw error;
}

export async function setTyping(chatId: string, isTyping: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (isTyping) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("typing_status") as any).upsert({ chat_id: chatId, user_id: user.id });
  } else {
    await supabase.from("typing_status").delete().eq("chat_id", chatId);
  }
}
