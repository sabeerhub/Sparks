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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` }, (p) => onInsertRef.current(p))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` }, (p) => onUpdateRef.current(p))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId]);
}

export function useTypingIndicator(chatId: string, onTypingChange: (userIds: string[]) => void) {
  const callbackRef = useRef(onTypingChange);
  callbackRef.current = onTypingChange;

  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`typing:${chatId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "typing_status", filter: `chat_id=eq.${chatId}` },
        async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await (supabase.from("typing_status") as any).select("user_id").eq("chat_id", chatId);
          callbackRef.current(((data ?? []) as { user_id: string }[]).map((r) => r.user_id));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId]);
}

/**
 * Online Presence — uses Supabase Realtime Presence (websocket-based) as
 * the primary mechanism plus visibilitychange for mobile reliability.
 * beforeunload alone is not reliable on mobile Chrome.
 */
export function usePresence(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const presenceChannel = supabase.channel("online-users", {
      config: { presence: { key: userId } },
    });

    const markOnline = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("profiles") as any).update({ is_online: true }).eq("id", userId);
    };

    const markOffline = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("profiles") as any)
        .update({ is_online: false, last_seen_at: new Date().toISOString() })
        .eq("id", userId);
    };

    presenceChannel
      .on("presence", { event: "join" }, ({ key }) => { if (key === userId) markOnline(); })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        if (key === userId && leftPresences.length === 0) markOffline();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ online_at: new Date().toISOString() });
          await markOnline();
        }
      });

    const handleUnload = () => { markOffline(); };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        markOffline();
      } else {
        presenceChannel.track({ online_at: new Date().toISOString() });
        markOnline();
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      markOffline();
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId]);
}

/**
 * Subscribes to profile changes for a specific user so the chat header's
 * online dot and "Last seen" text update in realtime.
 */
export function useProfilePresence(
  userId: string | null,
  onUpdate: (isOnline: boolean, lastSeen: string) => void
) {
  const callbackRef = useRef(onUpdate);
  callbackRef.current = onUpdate;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`profile-presence:${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          callbackRef.current(row.is_online as boolean, row.last_seen_at as string);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);
}

export function useReceiptUpdates(chatId: string, onChange: () => void) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`receipts:${chatId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_receipts" }, () => callbackRef.current())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId]);
}
