"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, Video } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useChat } from "@/hooks/useChat";
import { usePresence, useProfilePresence, useReceiptUpdates } from "@/hooks/useRealtime";
import { markRead } from "@/services/message-service";
import { createClient } from "@/lib/supabase";
import { formatLastSeen } from "@/utils/helpers";
import type { Profile, DecryptedMessage } from "@/types";

const supabase = createClient();

function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {[false, true, false, true, true].map((mine, i) => (
        <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
          <div
            className="animate-pulse rounded-3xl"
            style={{
              background: mine ? "rgba(0,122,255,0.15)" : "var(--color-gray-3)",
              height: 36,
              width: [120, 180, 90, 200, 150][i],
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function ChatThreadPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const router = useRouter();
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [messageStatuses, setMessageStatuses] = useState<Record<string, DecryptedMessage["status"]>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const membershipQuery = await (supabase.from("chat_members") as any)
        .select("user_id")
        .eq("chat_id", chatId)
        .neq("user_id", user.id)
        .maybeSingle();

      const membership = membershipQuery.data as { user_id: string } | null;
      if (!membership) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("id", membership.user_id)
        .maybeSingle();

      if (profile) {
        const p = profile as Profile;
        setOtherUser(p);
        setOtherUserOnline(p.is_online);
        setOtherUserLastSeen(p.last_seen_at);
      }
    })();
  }, [chatId]);

  const { messages, loading, typingUserIds, send, edit, remove, notifyTyping } = useChat(chatId);

  usePresence(currentUserId);

  useProfilePresence(otherUser?.id ?? null, (isOnline, lastSeen) => {
    setOtherUserOnline(isOnline);
    setOtherUserLastSeen(lastSeen);
  });

  const markMessagesRead = useCallback(async () => {
    if (!messages.length || !currentUserId) return;
    const unread = messages
      .filter((m) => m.sender_id !== currentUserId && m.status !== "read")
      .map((m) => m.id);
    if (unread.length === 0) return;
    await markRead(unread).catch(() => {});
  }, [messages, currentUserId]);

  useEffect(() => { markMessagesRead(); }, [markMessagesRead]);

  useReceiptUpdates(chatId, async () => {
    if (!currentUserId) return;
    const myMessageIds = messages.filter((m) => m.sender_id === currentUserId).map((m) => m.id);
    if (!myMessageIds.length) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("message_receipts") as any)
      .select("message_id, status")
      .in("message_id", myMessageIds);

    const statusMap: Record<string, DecryptedMessage["status"]> = {};
    (data ?? []).forEach((r: { message_id: string; status: string }) => {
      statusMap[r.message_id] = r.status as DecryptedMessage["status"];
    });
    setMessageStatuses(statusMap);
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isOtherTyping = otherUser ? typingUserIds.includes(otherUser.id) : false;

  if (!otherUser) {
    return (
      <div className="flex flex-col h-full bg-white">
        <StatusBar />
        <div className="flex items-center gap-2 px-4 py-2 border-b animate-pulse" style={{ borderColor: "var(--color-gray-2)" }}>
          <div className="w-8 h-8 rounded-full" style={{ background: "var(--color-gray-3)" }} />
          <div className="w-8 h-8 rounded-full ml-1" style={{ background: "var(--color-gray-3)" }} />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-28 rounded-full" style={{ background: "var(--color-gray-3)" }} />
            <div className="h-2.5 w-16 rounded-full" style={{ background: "var(--color-gray-3)" }} />
          </div>
        </div>
        <MessageSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <StatusBar />
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0" style={{ borderColor: "var(--color-gray-2)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => router.push("/chats")} aria-label="Back" className="flex-shrink-0 md:hidden">
            <ArrowLeft size={22} color="var(--color-blue)" strokeWidth={2} />
          </button>
          <button onClick={() => router.push(`/profile/${otherUser.id}`)} className="flex items-center gap-2 min-w-0">
            <Avatar name={otherUser.full_name} src={otherUser.avatar_url} size={34} online={otherUserOnline} />
            <div className="min-w-0 text-left">
              <div className="text-sm font-semibold truncate">{otherUser.full_name}</div>
              <div className="text-xs truncate" style={{ color: otherUserOnline ? "var(--color-green)" : "var(--color-gray-1)" }}>
                {otherUserOnline ? "Online" : `Last seen ${formatLastSeen(otherUserLastSeen)}`}
              </div>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button aria-label="Call"><Phone size={19} color="var(--color-blue)" strokeWidth={1.8} /></button>
          <button aria-label="Video call"><Video size={19} color="var(--color-blue)" strokeWidth={1.8} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && messages.length === 0 ? (
          <MessageSkeleton />
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === currentUserId;
            const effectiveStatus = isMine && messageStatuses[m.id]
              ? messageStatuses[m.id]
              : m.status;
            return (
              <MessageBubble
                key={m.id}
                message={{ ...m, status: effectiveStatus ?? m.status }}
                isMine={isMine}
                reaction={reactions[m.id]}
                onEdit={(text) => edit(m.id, text)}
                onDelete={() => remove(m.id)}
                onReact={(emoji) => setReactions((r) => ({ ...r, [m.id]: emoji }))}
                onReply={() => setReplyTo(m.id)}
              />
            );
          })
        )}
        {isOtherTyping && <TypingIndicator label={otherUser.full_name.split(" ")[0] ?? otherUser.full_name} />}
        <div ref={bottomRef} />
      </div>

      {replyTo && (
        <div className="px-4 py-2 flex items-center justify-between border-t flex-shrink-0" style={{ borderColor: "var(--color-gray-2)", background: "var(--color-gray-2)" }}>
          <span className="text-xs" style={{ color: "var(--color-gray-1)" }}>Replying to message</span>
          <button onClick={() => setReplyTo(null)} className="text-xs font-semibold" style={{ color: "var(--color-blue)" }}>Cancel</button>
        </div>
      )}

      <MessageComposer
        chatId={chatId}
        onSend={(text) => { send(text, replyTo); setReplyTo(null); }}
        onTyping={notifyTyping}
      />
    </div>
  );
}
