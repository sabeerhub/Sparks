"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useChat } from "@/hooks/useChat";
import { usePresence } from "@/hooks/useRealtime";
import { createClient } from "@/lib/supabase";
import { formatLastSeen } from "@/utils/helpers";
import type { Profile } from "@/types";

const supabase = createClient();

export default function ChatThreadPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const router = useRouter();
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const membershipQuery = await supabase
        .from("chat_members")
        .select("user_id")
        .eq("chat_id", chatId)
        .neq("user_id", user.id)
        .maybeSingle();

      const membership = membershipQuery.data as { user_id: string } | null;

      if (!membership) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", membership.user_id)
        .maybeSingle();

      if (profile) setOtherUser(profile as Profile);
    })();
  }, [chatId]);

  const theirPublicKeyJwk = otherUser ? (JSON.parse(otherUser.public_key) as JsonWebKey) : null;
  const { messages, loading, typingUserIds, send, edit, remove, notifyTyping } = useChat(chatId, theirPublicKeyJwk);

  usePresence(currentUserId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isOtherTyping = otherUser ? typingUserIds.includes(otherUser.id) : false;

  if (!otherUser) {
    return (
      <ScreenContainer>
        <StatusBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-blue)" }} />
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <StatusBar />
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "var(--color-gray-2)" }}>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/chats")} aria-label="Back">
            <BackIcon />
          </button>
          <Avatar name={otherUser.full_name} src={otherUser.avatar_url} size={34} online={otherUser.is_online} />
          <div>
            <div className="text-sm font-semibold">{otherUser.full_name}</div>
            <div className="text-xs" style={{ color: otherUser.is_online ? "var(--color-green)" : "var(--color-gray-1)" }}>
              {otherUser.is_online ? "Online" : `Last seen ${formatLastSeen(otherUser.last_seen_at)}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button aria-label="Call"><PhoneIcon /></button>
          <button aria-label="Video call"><VideoIcon /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center pt-10">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-blue)" }} />
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isMine={m.sender_id === currentUserId}
              reaction={reactions[m.id]}
              onEdit={(text) => edit(m.id, text)}
              onDelete={() => remove(m.id)}
              onReact={(emoji) => setReactions((r) => ({ ...r, [m.id]: emoji }))}
              onReply={() => setReplyTo(m.id)}
            />
          ))
        )}
        {isOtherTyping && <TypingIndicator label={otherUser.full_name.split(" ")[0] ?? otherUser.full_name} />}
        <div ref={bottomRef} />
      </div>

      {replyTo && (
        <div className="px-4 py-2 flex items-center justify-between border-t" style={{ borderColor: "var(--color-gray-2)", background: "var(--color-gray-2)" }}>
          <span className="text-xs" style={{ color: "var(--color-gray-1)" }}>Replying to message</span>
          <button onClick={() => setReplyTo(null)} className="text-xs font-semibold" style={{ color: "var(--color-blue)" }}>Cancel</button>
        </div>
      )}

      <MessageComposer
        onSend={(text) => {
          send(text, replyTo);
          setReplyTo(null);
        }}
        onTyping={notifyTyping}
      />
    </ScreenContainer>
  );
}

function BackIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function PhoneIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.07 9.8 19.79 19.79 0 01.18 2 2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" /></svg>;
}
function VideoIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>;
}
