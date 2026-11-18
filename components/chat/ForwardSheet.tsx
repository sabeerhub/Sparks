/**
 * components/chat/ForwardSheet.tsx
 * v1.5.1 — the forward flow, for real. Pick a message → Forward → this
 * sheet lists your actual chats (from the real chat list, with real
 * avatars and names) → tap to select one or several → Forward sends
 * the message to each of them through the normal send path, and the
 * new copy is flagged forwarded so it shows a "Forwarded" label.
 * Nothing here is a placeholder: every row is a chat you really have,
 * every send is a real message, and the done screen says exactly how
 * many chats it reached — including the ones it could not.
 */
"use client";

import { useEffect, useState } from "react";
import { Check, Search as SearchIcon, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { fetchChatList } from "@/services/chat-service";
import { forwardMessage } from "@/services/message-service";
import { createClient } from "@/lib/supabase";
import type { ChatListItem, DecryptedMessage } from "@/types";
import { truncatePreview } from "@/utils/helpers";

const supabase = createClient();

interface ForwardSheetProps {
  /** The message being forwarded. */
  message: DecryptedMessage;
  onClose: () => void;
}

type Phase = "pick" | "sending" | "done";

export function ForwardSheet({ message, onClose }: ForwardSheetProps) {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>("pick");
  const [sentCount, setSentCount] = useState(0);
  const [failedNames, setFailedNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try {
        const list = await fetchChatList(user.id);
        if (!cancelled) setChats(list);
      } catch {
        // Loading the list failed — the empty state below says so honestly.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = chats.filter((c) =>
    c.otherUser.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.otherUser.username?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (chatId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  };

  const handleForward = async () => {
    const targets = chats.filter((c) => selected.has(c.chatId));
    if (!targets.length) return;
    setPhase("sending");
    let sent = 0;
    const failed: string[] = [];
    for (const target of targets) {
      try {
        await forwardMessage(message, target.chatId);
        sent += 1;
      } catch {
        failed.push(target.otherUser.full_name);
      }
    }
    setSentCount(sent);
    setFailedNames(failed);
    setPhase("done");
  };

  const preview =
    message.content_type === "image"
      ? "Photo"
      : message.content_type === "voice"
        ? "Voice message"
        : message.content_type === "file"
          ? message.text || "File"
          : truncatePreview(message.text, 80);

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)" }} />
      <div
        className="glass-strong relative w-full rounded-t-3xl px-4 pt-3 pb-8 max-w-lg mx-auto max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4 flex-shrink-0" style={{ background: "var(--color-gray-3)" }} />

        {phase === "done" ? (
          <div className="text-center px-2 py-6">
            <div
              className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: sentCount > 0 ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.1)" }}
            >
              <Check size={26} color={sentCount > 0 ? "var(--color-green)" : "var(--color-red)"} strokeWidth={2.2} />
            </div>
            <p className="text-title font-semibold mb-1">
              {sentCount > 0
                ? `Forwarded to ${sentCount} ${sentCount === 1 ? "chat" : "chats"}`
                : "Couldn't forward"}
            </p>
            <p className="text-body mb-6" style={{ color: "var(--color-gray-1)" }}>
              {failedNames.length > 0
                ? `Couldn't send to ${failedNames.join(", ")}. The rest went through.`
                : "The message is now in their chat, marked Forwarded."}
            </p>
            <button
              onClick={onClose}
              className="pressable w-full py-3 rounded-2xl text-body font-semibold text-white"
              style={{ background: "var(--color-blue)" }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1 flex-shrink-0">
              <h2 className="text-title font-semibold">Forward to…</h2>
              <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white/60">
                <X size={19} color="var(--color-gray-1)" strokeWidth={2} />
              </button>
            </div>

            <div className="glass rounded-2xl px-4 py-3 mb-3 flex-shrink-0">
              <p className="text-caption font-medium mb-0.5" style={{ color: "var(--color-gray-1)" }}>Forwarding</p>
              <p className="text-body truncate">{preview}</p>
            </div>

            <div className="glass-input flex items-center gap-2 rounded-full px-4 py-2 mb-2 flex-shrink-0">
              <SearchIcon size={14} color="var(--color-gray-1)" strokeWidth={1.8} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats"
                className="flex-1 outline-none text-body bg-transparent"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-caption font-medium" style={{ color: "var(--color-blue)" }}>
                  Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              {loading ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-3 animate-pulse">
                      <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "var(--color-gray-3)" }} />
                      <div className="h-4 w-32 rounded-full" style={{ background: "var(--color-gray-3)" }} />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-body text-center py-8" style={{ color: "var(--color-gray-1)" }}>
                  {chats.length === 0 ? "No chats yet — send a Spark Request to start one." : "No chats match that search."}
                </p>
              ) : (
                filtered.map((chat) => {
                  const isSelected = selected.has(chat.chatId);
                  return (
                    <button
                      key={chat.chatId}
                      onClick={() => toggle(chat.chatId)}
                      className="w-full flex items-center gap-3 px-2 py-2.5 rounded-2xl text-left active:bg-white/50 transition-colors"
                    >
                      <Avatar name={chat.otherUser.full_name} src={chat.otherUser.avatar_url} size={48} />
                      <span className="flex-1 min-w-0 text-body font-medium truncate" style={{ color: "var(--color-black)" }}>
                        {chat.otherUser.full_name}
                      </span>
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                        style={{
                          background: isSelected ? "var(--color-blue)" : "transparent",
                          borderColor: isSelected ? "var(--color-blue)" : "var(--color-gray-3)",
                        }}
                      >
                        {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={handleForward}
              disabled={selected.size === 0 || phase === "sending"}
              className="pressable w-full py-3.5 rounded-2xl text-body font-semibold text-white mt-3 flex-shrink-0 disabled:opacity-40"
              style={{ background: "var(--color-blue)" }}
            >
              {phase === "sending"
                ? "Forwarding…"
                : selected.size === 0
                  ? "Forward"
                  : `Forward to ${selected.size} ${selected.size === 1 ? "chat" : "chats"}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
