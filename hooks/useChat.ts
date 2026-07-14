/**
 * hooks/useChat.ts
 * ─────────────────────────────────────────────────────────────────────────
 * The single hook the Chat Screen component talks to. Wires together:
 *   - IndexedDB cache (lib/storage.ts) for instant render + offline history
 *   - message-service.ts for send/fetch
 *   - useRealtimeMessages for live updates from the other participant
 *   - registerReconnectSync so queued offline sends flush automatically
 *
 * V1: plain-text messages (see message-service.ts header for why E2E
 * client-side encryption was removed). No key-loading, no waiting, no
 * "Encryption key not ready" — messages are available immediately after
 * login, on any device, every time.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { chatCache, registerReconnectSync } from "@/lib/storage";
import { fetchMessages, sendMessageOptimistic, editMessage, deleteMessage, markRead, setTyping } from "@/services/message-service";
import { sendMessage as rawSendMessage } from "@/services/message-service";
import { useRealtimeMessages, useTypingIndicator } from "@/hooks/useRealtime";
import type { DecryptedMessage } from "@/types";

const supabase = createClient();

export function useChat(chatId: string) {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Initial load: hydrate from cache instantly, then reconcile with server ──
  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;

    (async () => {
      const cached = await chatCache.hydrateChat(chatId);
      if (!cancelled) {
        setMessages(cached);
        setLoading(false);
      }

      try {
        const fresh = await fetchMessages(chatId);
        if (!cancelled) {
          await chatCache.setMessages(chatId, fresh);
          setMessages(fresh);
        }
      } catch {
        // Offline or fetch failed — cached history (if any) is already shown.
      }
    })();

    const unsubscribe = chatCache.subscribe(() => {
      if (!cancelled) setMessages(chatCache.getMessages(chatId));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [chatId]);

  // ─── Reconnect sync for the offline outbox ─────────────────────────────
  useEffect(() => {
    if (!chatId) return;
    return registerReconnectSync(chatId, (queued) =>
      rawSendMessage({
        chatId: queued.chat_id,
        plaintext: queued.plaintext,
        replyToId: queued.reply_to_id,
      })
    );
  }, [chatId]);

  // ─── Live updates from the other participant ───────────────────────────
  useRealtimeMessages({
    chatId,
    onInsert: async (payload) => {
      const row = payload.new as Record<string, unknown>;

      const { data: { user } } = await supabase.auth.getUser();
      if (row.sender_id === user?.id) return;

      const decrypted: DecryptedMessage = {
        id: row.id as string,
        chat_id: row.chat_id as string,
        sender_id: row.sender_id as string,
        text: row.deleted_at ? "" : ((row.content as string) ?? ""),
        content_type: row.content_type as DecryptedMessage["content_type"],
        media_url: (row.media_path as string) ?? undefined,
        reply_to_id: row.reply_to_id as string | null,
        edited_at: row.edited_at as string | null,
        deleted_at: row.deleted_at as string | null,
        created_at: row.created_at as string,
        status: "delivered",
      };

      await chatCache.upsertMessage(chatId, decrypted);
      markRead([decrypted.id]).catch(() => {});
    },
    onUpdate: async (payload) => {
      const row = payload.new as Record<string, unknown>;
      const existing = chatCache.getMessages(chatId).find((m) => m.id === row.id);
      await chatCache.upsertMessage(chatId, {
        ...(existing as DecryptedMessage),
        id: row.id as string,
        text: row.deleted_at ? "" : ((row.content as string) ?? ""),
        edited_at: row.edited_at as string | null,
        deleted_at: row.deleted_at as string | null,
      });
    },
  });

  useTypingIndicator(chatId, setTypingUserIds);

  // ─── Actions exposed to the component ──────────────────────────────────
  const send = useCallback(
    async (plaintext: string, replyToId: string | null = null) => {
      const clientId = crypto.randomUUID();
      await sendMessageOptimistic({
        chatId,
        plaintext,
        replyToId,
        clientId,
      });
      await setTyping(chatId, false).catch(() => {});
    },
    [chatId]
  );

  const edit = useCallback(
    async (messageId: string, newText: string) => {
      await editMessage(messageId, newText);
      const existing = chatCache.getMessages(chatId).find((m) => m.id === messageId);
      if (existing) {
        await chatCache.upsertMessage(chatId, {
          ...existing,
          text: newText,
          edited_at: new Date().toISOString(),
        });
      }
    },
    [chatId]
  );

  const remove = useCallback(
    async (messageId: string) => {
      await deleteMessage(messageId);
      const existing = chatCache.getMessages(chatId).find((m) => m.id === messageId);
      if (existing) {
        await chatCache.upsertMessage(chatId, {
          ...existing,
          text: "",
          deleted_at: new Date().toISOString(),
        });
      }
    },
    [chatId]
  );

  const notifyTyping = useCallback(() => {
    setTyping(chatId, true).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(
      () => setTyping(chatId, false).catch(() => {}),
      3000
    );
  }, [chatId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return {
    messages,
    loading,
    typingUserIds,
    send,
    edit,
    remove,
    notifyTyping,
  };
}
