/**
 * hooks/useChat.ts
 * ─────────────────────────────────────────────────────────────────────────
 * The single hook the Chat Screen component talks to. Wires together:
 *   - IndexedDB cache (lib/storage.ts) for instant render + offline history
 *   - message-service.ts for encrypt/send/decrypt
 *   - useRealtimeMessages for live updates from the other participant
 *   - registerReconnectSync so queued offline sends flush automatically
 *
 * Key guard: all decrypt operations check keyManager.hasPrivateKey() before
 * attempting ECDH derivation. If the private key isn't loaded yet (e.g.
 * realtime event fires before restorePrivateKey() completes on mount), the
 * operation is retried after a short delay rather than silently failing.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { chatCache, registerReconnectSync } from "@/lib/storage";
import { fetchMessages, sendMessageOptimistic, editMessage, deleteMessage, markRead, setTyping } from "@/services/message-service";
import { sendMessage as rawSendMessage } from "@/services/message-service";
import { useRealtimeMessages, useTypingIndicator } from "@/hooks/useRealtime";
import { decryptMessage } from "@/lib/crypto";
import { keyManager } from "@/lib/encryption";
import type { DecryptedMessage } from "@/types";

const supabase = createClient();

/** Waits up to 5 seconds for the private key to be loaded into memory. */
async function waitForPrivateKey(maxWaitMs = 5000): Promise<boolean> {
  if (keyManager.hasPrivateKey()) return true;
  const interval = 200;
  let waited = 0;
  while (waited < maxWaitMs) {
    await new Promise((r) => setTimeout(r, interval));
    if (keyManager.hasPrivateKey()) return true;
    waited += interval;
  }
  return false;
}

export function useChat(chatId: string, theirPublicKeyJwk: JsonWebKey | null) {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Initial load: hydrate from cache instantly, then reconcile with server ──
  useEffect(() => {
    if (!chatId || !theirPublicKeyJwk) return;
    let cancelled = false;

    (async () => {
      const cached = await chatCache.hydrateChat(chatId);
      if (!cancelled) {
        setMessages(cached);
        setLoading(false);
      }

      // Wait for private key before attempting decryption
      const keyReady = await waitForPrivateKey();
      if (!keyReady || cancelled) return;

      try {
        const fresh = await fetchMessages(chatId, theirPublicKeyJwk);
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
  }, [chatId, theirPublicKeyJwk]);

  // ─── Reconnect sync for the offline outbox ─────────────────────────────
  useEffect(() => {
    if (!chatId || !theirPublicKeyJwk) return;
    return registerReconnectSync(chatId, (queued) =>
      rawSendMessage({
        chatId: queued.chat_id,
        plaintext: queued.plaintext,
        theirPublicKeyJwk,
        replyToId: queued.reply_to_id,
      })
    );
  }, [chatId, theirPublicKeyJwk]);

  // ─── Live updates from the other participant ───────────────────────────
  useRealtimeMessages({
    chatId,
    onInsert: async (payload) => {
      const row = payload.new as Record<string, unknown>;
      if (!theirPublicKeyJwk) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (row.sender_id === user?.id) return;

      // Wait for private key — realtime can fire before restorePrivateKey()
      // completes on mount, causing silent decryption failures.
      const keyReady = await waitForPrivateKey();
      if (!keyReady) return;

      try {
        const sharedKey = await keyManager.getSharedKey(chatId, theirPublicKeyJwk);
        const text = row.deleted_at ? "" : await decryptMessage(
          { ciphertext: row.ciphertext as string, iv: row.iv as string },
          sharedKey
        );

        const decrypted: DecryptedMessage = {
          id: row.id as string,
          chat_id: row.chat_id as string,
          sender_id: row.sender_id as string,
          text,
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
      } catch {
        // Decryption failed silently — key mismatch or corrupted ciphertext.
      }
    },
    onUpdate: async (payload) => {
      const row = payload.new as Record<string, unknown>;
      if (!theirPublicKeyJwk) return;

      const keyReady = await waitForPrivateKey();
      if (!keyReady) return;

      try {
        const sharedKey = await keyManager.getSharedKey(chatId, theirPublicKeyJwk);
        const text = row.deleted_at ? "" : await decryptMessage(
          { ciphertext: row.ciphertext as string, iv: row.iv as string },
          sharedKey
        );

        const existing = chatCache.getMessages(chatId).find((m) => m.id === row.id);
        await chatCache.upsertMessage(chatId, {
          ...(existing as DecryptedMessage),
          id: row.id as string,
          text,
          edited_at: row.edited_at as string | null,
          deleted_at: row.deleted_at as string | null,
        });
      } catch {
        // Silent failure.
      }
    },
  });

  useTypingIndicator(chatId, setTypingUserIds);

  // ─── Actions exposed to the component ──────────────────────────────────
  const send = useCallback(
    async (plaintext: string, replyToId: string | null = null) => {
      if (!theirPublicKeyJwk) throw new Error("Missing recipient public key");
      const clientId = crypto.randomUUID();
      await sendMessageOptimistic({
        chatId,
        plaintext,
        theirPublicKeyJwk,
        replyToId,
        clientId,
      });
      await setTyping(chatId, false);
    },
    [chatId, theirPublicKeyJwk]
  );

  const edit = useCallback(
    async (messageId: string, newText: string) => {
      if (!theirPublicKeyJwk) return;
      await editMessage(messageId, chatId, newText, theirPublicKeyJwk);
      const existing = chatCache.getMessages(chatId).find((m) => m.id === messageId);
      if (existing) {
        await chatCache.upsertMessage(chatId, {
          ...existing,
          text: newText,
          edited_at: new Date().toISOString(),
        });
      }
    },
    [chatId, theirPublicKeyJwk]
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
