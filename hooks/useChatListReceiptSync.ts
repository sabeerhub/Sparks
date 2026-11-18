/**
 * hooks/useChatListReceiptSync.ts
 * ─────────────────────────────────────────────────────────────────────────
 * v1.8.3 — keeps the chat list's unread badges honest.
 *
 * The bug it fixes: opening a thread writes read receipts to
 * message_receipts, but nothing ever told the chat list. The list's
 * unread counts live in the zustand store, filled only by fetchChatList
 * on the list's first mount — and the list's only realtime subscription
 * listened to the `notifications` table, never `message_receipts`. So
 * going back from a thread showed the stale badge until a manual
 * long-press "mark as read" (which updates the store directly) or a
 * full reload. The thread now also clears the store itself on open;
 * this hook is the second half: any receipt write anywhere (either
 * phone, any chat) refreshes the list, and switching back to the app
 * refetches too.
 *
 * One hook instance per mounted list (mobile Chats page, desktop
 * sidebar — both can be mounted at once). A module-level guard makes
 * sure a burst of receipt events triggers at most one refetch per
 * ~800ms across the whole app.
 */
"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { fetchChatList } from "@/services/chat-service";
import { useChatStore } from "@/store/chat-store";
import { chatCache } from "@/lib/storage";

const supabase = createClient();

let lastSyncAt = 0;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

export function useChatListReceiptSync(userId: string | null, scope: "mobile" | "desktop") {
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!userId) return;

    const refetch = () => {
      const now = Date.now();
      if (now - lastSyncAt < 800) return;
      lastSyncAt = now;
      const uid = userIdRef.current;
      if (!uid) return;
      fetchChatList(uid)
        .then(async (fresh) => {
          useChatStore.getState().setChatList(fresh);
          await chatCache.setChatList(fresh as never).catch(() => {});
        })
        .catch(() => {});
    };

    const debounced = () => {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(refetch, 500);
    };

    const channel = supabase
      .channel(`chat-list-receipts-${scope}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_receipts" }, debounced)
      .subscribe();

    // Returning to the app (from a thread, another app, a locked
    // screen) re-checks the counts — the mount fetch alone only runs
    // the first time the list appears.
    const onVisible = () => {
      if (!document.hidden) refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = null;
      }
    };
  }, [userId, scope]);
}
