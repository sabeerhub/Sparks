/**
 * hooks/useRealtime.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Thin wrapper around Supabase Realtime channels. Each subscription is
 * scoped to a single chat_id filter — combined with RLS on the underlying
 * tables, a client can't subscribe its way into another chat's stream even
 * if it guesses a chat_id, because Realtime still enforces the same RLS
 * policies on the change feed.
 */

"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

const supabase = createClient();

interface UseRealtimeMessagesOptions {
  chatId: string;
  onInsert: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onUpdate: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

export function useRealtimeMessages({ chatId, onInsert, onUpdate }: UseRealtimeMessagesOptions) {
  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  onInsertRef.current = onInsert;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => onInsertRef.current(payload)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => onUpdateRef.current(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);
}

/** Tracks who else is currently typing in a chat, via the typing_status table. */
export function useTypingIndicator(chatId: string, onTypingChange: (userIds: string[]) => void) {
  const callbackRef = useRef(onTypingChange);
  callbackRef.current = onTypingChange;

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`typing:${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "typing_status", filter: `chat_id=eq.${chatId}` },
        async () => {
          const { data } = await supabase
            .from("typing_status")
            .select("user_id")
            .eq("chat_id", chatId);
          callbackRef.current((data ?? []).map((r) => r.user_id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);
}

/** Tracks a user's online/offline presence using Supabase's Presence feature. */
export function usePresence(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel("online-users", {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        /* consumed via channel.presenceState() by callers that need the full list */
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("profiles") as any).update({ is_online: true }).eq("id", userId);
        }
      });

    const markOffline = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("profiles") as any)
        .update({ is_online: false, last_seen_at: new Date().toISOString() })
        .eq("id", userId);
    };

    window.addEventListener("beforeunload", markOffline);

    return () => {
      markOffline();
      window.removeEventListener("beforeunload", markOffline);
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

/** Subscribes to read-receipt updates so senders see ticks turn blue live. */
export function useReceiptUpdates(chatId: string, onChange: () => void) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`receipts:${chatId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_receipts" },
        () => callbackRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);
}
