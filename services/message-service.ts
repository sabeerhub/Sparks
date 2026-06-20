/**
 * services/message-service.ts
 * ─────────────────────────────────────────────────────────────────────────
 * The only place in the app that should call encryptMessage/decryptMessage
 * around a Supabase read or write. Keeping that pairing centralized here —
 * rather than letting components encrypt/decrypt inline — means there's
 * exactly one place to audit for "does plaintext ever leave the device."
 */

import { createClient } from "@/lib/supabase";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import { keyManager } from "@/lib/encryption";
import { canSendMessage, msUntilNextMessageSlot, RateLimitError } from "@/lib/rateLimit";
import { chatCache } from "@/lib/storage";
import type { DecryptedMessage, QueuedMessage } from "@/types";

const supabase = createClient();

interface SendParams {
  chatId: string;
  plaintext: string;
  theirPublicKeyJwk: JsonWebKey;
  replyToId?: string | null;
}

/**
 * Full send path: client-side rate check -> encrypt -> RPC insert (which
 * re-checks the rate limit server-side) -> return the row the UI should
 * render. Throws RateLimitError if the client-side throttle trips, so the
 * caller can show "slow down" without a round trip.
 */
export async function sendMessage({
  chatId,
  plaintext,
  theirPublicKeyJwk,
  replyToId = null,
}: SendParams): Promise<DecryptedMessage> {
  if (!canSendMessage(chatId)) {
    throw new RateLimitError(msUntilNextMessageSlot(chatId));
  }

  const sharedKey = await keyManager.getSharedKey(chatId, theirPublicKeyJwk);
  const { ciphertext, iv } = await encryptMessage(plaintext, sharedKey);

  const { data, error } = await supabase.rpc("send_message", {
    p_chat_id: chatId,
    p_ciphertext: ciphertext,
    p_iv: iv,
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
 * Fetches and decrypts a page of message history for a chat. Pass `before`
 * (an ISO timestamp) to paginate backwards for infinite scroll.
 */
export async function fetchMessages(
  chatId: string,
  theirPublicKeyJwk: JsonWebKey,
  opts: { before?: string; limit?: number } = {}
): Promise<DecryptedMessage[]> {
  let query = supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.before) query = query.lt("created_at", opts.before);

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return [];

  const sharedKey = await keyManager.getSharedKey(chatId, theirPublicKeyJwk);

  const decrypted = await Promise.all(
    data.map(async (row): Promise<DecryptedMessage> => {
      if (row.deleted_at) {
        return {
          id: row.id,
          chat_id: row.chat_id,
          sender_id: row.sender_id,
          text: "",
          content_type: row.content_type,
          reply_to_id: row.reply_to_id,
          edited_at: row.edited_at,
          deleted_at: row.deleted_at,
          created_at: row.created_at,
          status: "sent",
        };
      }
      const text = await decryptMessage({ ciphertext: row.ciphertext, iv: row.iv }, sharedKey);
      return {
        id: row.id,
        chat_id: row.chat_id,
        sender_id: row.sender_id,
        text,
        content_type: row.content_type,
        media_url: row.media_path ?? undefined,
        reply_to_id: row.reply_to_id,
        edited_at: row.edited_at,
        deleted_at: row.deleted_at,
        created_at: row.created_at,
        status: "sent",
      };
    })
  );

  return decrypted.reverse(); // oldest first for rendering top-to-bottom
}

export async function editMessage(messageId: string, chatId: string, newPlaintext: string, theirPublicKeyJwk: JsonWebKey) {
  const sharedKey = await keyManager.getSharedKey(chatId, theirPublicKeyJwk);
  const { ciphertext, iv } = await encryptMessage(newPlaintext, sharedKey);

  const { error } = await supabase
    .from("messages")
    .update({ ciphertext, iv, edited_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) throw error;
}

/** Soft-delete: wipes ciphertext, keeps the row as a tombstone for "message deleted" UI. */
export async function deleteMessage(messageId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ ciphertext: "", iv: "", deleted_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) throw error;
}

export async function reactToMessage(messageId: string, emoji: string) {
  const { error } = await supabase
    .from("message_reactions")
    .upsert({ message_id: messageId, emoji }, { onConflict: "message_id,user_id" });
  if (error) throw error;
}

export async function removeReaction(messageId: string) {
  const { error } = await supabase.from("message_reactions").delete().eq("message_id", messageId);
  if (error) throw error;
}

export async function markDelivered(messageIds: string[]) {
  if (!messageIds.length) return;
  const rows = messageIds.map((id) => ({ message_id: id, status: "delivered" as const }));
  const { error } = await supabase.from("message_receipts").upsert(rows, { onConflict: "message_id,user_id" });
  if (error) throw error;
}

export async function markRead(messageIds: string[]) {
  if (!messageIds.length) return;
  const rows = messageIds.map((id) => ({ message_id: id, status: "read" as const }));
  const { error } = await supabase.from("message_receipts").upsert(rows, { onConflict: "message_id,user_id" });
  if (error) throw error;
}

export async function setTyping(chatId: string, isTyping: boolean) {
  if (isTyping) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("typing_status").upsert({ chat_id: chatId, user_id: user!.id });
  } else {
    await supabase.from("typing_status").delete().eq("chat_id", chatId);
  }
}
