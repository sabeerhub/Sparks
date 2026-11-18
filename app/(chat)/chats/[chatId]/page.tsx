/**
 * app/(chat)/chats/[chatId]/page.tsx
 * v1.5.0 — the thread is the screen people live in, so it gets the most
 * care: real persisted reactions (they used to live only in memory and
 * vanish on reload), date separators, a premium empty state, reply
 * quotes that actually show, WhatsApp-style image navigation, and
 * auto-scroll that only follows when you are already near the bottom
 * (reading history never gets yanked away). Glass bubbles sit over a
 * soft tinted message area, so the frost is real, not white on white.
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, Video, Search as SearchIcon, ChevronUp, ChevronDown, X } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ForwardSheet } from "@/components/chat/ForwardSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { useChat } from "@/hooks/useChat";
import { usePresence, useProfilePresence, useReceiptUpdates } from "@/hooks/useRealtime";
import { markRead, reactToMessage, removeReaction, fetchReactions, searchMessages } from "@/services/message-service";
import { markChatNotificationsRead } from "@/services/notification-service";
import { setChatArchived } from "@/services/chat-service";
import { useChatStore } from "@/store/chat-store";
import { createClient } from "@/lib/supabase";
import { formatLastSeen, formatDayLabel, formatMessageTime, truncatePreview } from "@/utils/helpers";
import { useCallActions } from "@/components/call/CallProvider";
import type { Profile, DecryptedMessage, MessageReaction } from "@/types";
import type { ViewerImage } from "@/components/chat/ImageViewer";

const supabase = createClient();

function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-4">
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

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center my-5">
      <span
        className="glass px-3.5 py-1.5 rounded-full text-caption font-medium"
        style={{ color: "var(--color-gray-1)" }}
      >
        {label}
      </span>
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
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>({});
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [messageStatuses, setMessageStatuses] = useState<Record<string, DecryptedMessage["status"]>>({});
  // In-thread search (v1.5.1): server-side, whole history — see
  // services/message-service.ts searchMessages. While a query is typed
  // the list below shows only the matches, oldest first.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DecryptedMessage[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchCapped, setSearchCapped] = useState(false);
  // Forward (v1.5.1): the message the ForwardSheet is sending on.
  const [forwardTarget, setForwardTarget] = useState<DecryptedMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());

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
      const otherUserId = membership?.user_id ?? user.id; // no other member = self-chat (Saved Messages)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("id", otherUserId)
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
  const { placeCall } = useCallActions();

  usePresence(currentUserId);

  useProfilePresence(otherUser?.id ?? null, (isOnline, lastSeen) => {
    setOtherUserOnline(isOnline);
    setOtherUserLastSeen(lastSeen);
  });

  // Reactions: loaded from the server (message_reactions table) and kept
  // live — the other person's reaction appears without reloading.
  const messageIdsKey = messages.map((m) => m.id).join(",");
  useEffect(() => {
    if (!messages.length) return;
    let cancelled = false;
    fetchReactions(messages.map((m) => m.id))
      .then((map) => {
        if (!cancelled) setReactions(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, messageIdsKey]);

  useEffect(() => {
    if (!messages.length) return;
    const channel = supabase
      .channel(`reactions-${chatId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        fetchReactions(messages.map((m) => m.id))
          .then(setReactions)
          .catch(() => {});
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, messageIdsKey]);

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      if (!currentUserId) return;
      const mine = (reactions[messageId] ?? []).find((r) => r.user_id === currentUserId);
      // Optimistic: show it at once, then confirm with the server.
      setReactions((prev) => {
        const rest = (prev[messageId] ?? []).filter((r) => r.user_id !== currentUserId);
        return {
          ...prev,
          [messageId]:
            mine?.emoji === emoji
              ? rest
              : [...rest, { message_id: messageId, user_id: currentUserId, emoji, created_at: new Date().toISOString() }],
        };
      });
      try {
        if (mine?.emoji === emoji) await removeReaction(messageId);
        else await reactToMessage(messageId, emoji);
        const fresh = await fetchReactions([messageId]);
        setReactions((prev) => ({ ...prev, ...fresh }));
      } catch {
        const fresh = await fetchReactions([messageId]).catch(() => ({} as Record<string, MessageReaction[]>));
        setReactions((prev) => ({ ...prev, ...fresh }));
      }
    },
    [currentUserId, reactions]
  );

  const handleRemoveReaction = useCallback(
    async (messageId: string) => {
      if (!currentUserId) return;
      setReactions((prev) => ({
        ...prev,
        [messageId]: (prev[messageId] ?? []).filter((r) => r.user_id !== currentUserId),
      }));
      try {
        await removeReaction(messageId);
      } catch {
        const fresh = await fetchReactions([messageId]).catch(() => ({} as Record<string, MessageReaction[]>));
        setReactions((prev) => ({ ...prev, ...fresh }));
      }
    },
    [currentUserId]
  );

  const markMessagesRead = useCallback(async () => {
    if (!messages.length || !currentUserId) return;
    const unread = messages
      .filter((m) => m.sender_id !== currentUserId && m.status !== "read")
      .map((m) => m.id);
    if (unread.length === 0) return;
    await markRead(unread).catch(() => {});
  }, [messages, currentUserId]);

  useEffect(() => { markMessagesRead(); }, [markMessagesRead]);

  // Opening this chat clears its notifications: a notification only
  // stays unread while you are NOT looking at the chat. (The trigger
  // in migration 0007 creates them; this is the other half.)
  useEffect(() => {
    markChatNotificationsRead(chatId).catch(() => {});
  }, [chatId]);

  // In-thread search: debounced server-side lookup. Empty query shows
  // the normal thread again; a query switches the list to the matches.
  useEffect(() => {
    const q = searchQuery.trim();
    if (!searchOpen || !q) {
      setSearchResults([]);
      setSearchIndex(0);
      setSearchBusy(false);
      setSearchCapped(false);
      return;
    }
    setSearchBusy(true);
    const timer = setTimeout(() => {
      searchMessages(chatId, q)
        .then((rows) => {
          setSearchResults(rows);
          setSearchCapped(rows.length >= 100);
          setSearchIndex(0);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchBusy(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen, chatId]);

  // Jump to the current match when it changes (or when results land).
  useEffect(() => {
    if (!searchOpen || !searchQuery.trim() || !searchResults.length) return;
    const id = searchResults[Math.min(searchIndex, searchResults.length - 1)]?.id;
    if (!id) return;
    messageRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [searchIndex, searchResults, searchOpen, searchQuery]);

  // Escape closes search and returns to the normal thread.
  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const stepSearch = (dir: 1 | -1) => {
    if (!searchResults.length) return;
    setSearchIndex((i) => (i + dir + searchResults.length) % searchResults.length);
  };

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

  // Auto-scroll follows new messages only when you are already near the
  // bottom — reading older history is never yanked away.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Never yank the view while the user is jumping between search matches.
    if (searchOpen && searchQuery.trim()) return;
    if (nearBottomRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, typingUserIds, searchOpen, searchQuery]);

  const isOtherTyping = otherUser ? typingUserIds.includes(otherUser.id) : false;
  const isSelfChat = otherUser && currentUserId ? otherUser.id === currentUserId : false;

  const messageById = new Map([...messages, ...searchResults].map((m) => [m.id, m]));
  const replyMessage = replyTo ? messageById.get(replyTo) ?? null : null;

  // While a query is typed, the list shows only the server-side matches.
  const isSearching = searchOpen && searchQuery.trim().length > 0;
  const visibleMessages = isSearching ? searchResults : messages;

  // Every image in this chat, in order, for prev/next in the viewer.
  const viewerImages: ViewerImage[] = messages
    .filter((m) => m.content_type === "image" && m.media_url)
    .map((m) => ({
      path: m.media_url as string,
      senderName: m.sender_id === currentUserId ? "You" : (otherUser?.full_name ?? ""),
      timestamp: formatMessageTime(m.created_at),
      fileName: m.text || "Image",
    }));
  const viewerIndexById = new Map(
    messages
      .filter((m) => m.content_type === "image" && m.media_url)
      .map((m, i) => [m.id, i])
  );

  const replyLabel = (m: DecryptedMessage): string => {
    if (m.deleted_at) return "Message deleted";
    if (m.content_type === "image") return "Photo";
    if (m.content_type === "voice") return "Voice message";
    if (m.content_type === "file") return m.text || "File";
    return m.text;
  };

  if (!otherUser) {
    return (
      <div className="app-surface flex flex-col h-full">
        <StatusBar />
        <div className="frosted-header flex items-center gap-2 px-4 py-2 animate-pulse">
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
    <div className="app-surface flex flex-col h-full">
      <StatusBar />
      <div className="frosted-header flex items-center justify-between px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => router.push("/chats")} aria-label="Back" className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center flex-shrink-0 md:hidden active:bg-white/60 active:scale-95 transition-all duration-200">
            <ArrowLeft size={22} color="var(--color-blue)" strokeWidth={2} />
          </button>
          <button onClick={() => isSelfChat ? router.push("/profile") : router.push(`/profile/${otherUser.id}`)} className="flex items-center gap-2 min-w-0">
            <Avatar name={otherUser.full_name} src={otherUser.avatar_url} size={36} online={!isSelfChat && otherUserOnline} />
            <div className="min-w-0 text-left">
              <div className="text-body font-semibold truncate">{isSelfChat ? "Saved Messages" : otherUser.full_name}</div>
              {!isSelfChat && (
                <div className="text-caption truncate" style={{ color: otherUserOnline ? "var(--color-green)" : "var(--color-gray-1)" }}>
                  {otherUserOnline ? "Online" : `Last seen ${formatLastSeen(otherUserLastSeen)}`}
                </div>
              )}
            </div>
          </button>
        </div>
        {!isSelfChat && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button aria-label="Search in this chat" onClick={() => setSearchOpen((s) => !s)} className="w-11 h-11 rounded-full flex items-center justify-center active:bg-white/60 active:scale-95 transition-all duration-200">
              <SearchIcon size={19} color={searchOpen ? "var(--color-blue)" : "var(--color-gray-1)"} strokeWidth={1.8} />
            </button>
            <button aria-label="Voice call" onClick={() => placeCall(otherUser.id, otherUser.full_name, otherUser.avatar_url, "voice")} className="w-11 h-11 rounded-full flex items-center justify-center active:bg-white/60 active:scale-95 transition-all duration-200"><Phone size={19} color="var(--color-blue)" strokeWidth={1.8} /></button>
            <button aria-label="Video call" onClick={() => placeCall(otherUser.id, otherUser.full_name, otherUser.avatar_url, "video")} className="w-11 h-11 rounded-full flex items-center justify-center active:bg-white/60 active:scale-95 transition-all duration-200"><Video size={19} color="var(--color-blue)" strokeWidth={1.8} /></button>
          </div>
        )}

      </div>
      {searchOpen && (
        <div className="glass px-4 py-2 flex items-center gap-2 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.6)" }}>
          <SearchIcon size={16} color="var(--color-gray-1)" strokeWidth={1.8} className="flex-shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in this chat"
            autoFocus
            aria-label="Search in this chat"
            className="flex-1 min-w-0 outline-none text-body bg-transparent"
          />
          {searchBusy ? (
            <span className="text-caption flex-shrink-0" style={{ color: "var(--color-gray-1)" }}>Searching…</span>
          ) : searchQuery.trim() ? (
            <span className="text-caption font-medium flex-shrink-0" style={{ color: "var(--color-gray-1)" }}>
              {searchResults.length === 0
                ? "No results"
                : `${searchIndex + 1} of ${searchResults.length}${searchCapped ? "+" : ""}`}
            </span>
          ) : null}
          <button onClick={() => stepSearch(-1)} disabled={!searchResults.length} aria-label="Previous match" className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white/60 disabled:opacity-30">
            <ChevronUp size={18} color="var(--color-gray-1)" strokeWidth={2} />
          </button>
          <button onClick={() => stepSearch(1)} disabled={!searchResults.length} aria-label="Next match" className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white/60 disabled:opacity-30">
            <ChevronDown size={18} color="var(--color-gray-1)" strokeWidth={2} />
          </button>
          <button onClick={closeSearch} aria-label="Close search" className="w-9 h-9 rounded-full flex items-center justify-center active:bg-white/60">
            <X size={18} color="var(--color-gray-1)" strokeWidth={2} />
          </button>
        </div>
      )}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{
          // A whisper of blue at the top of the message area, so the
          // glass bubbles and the frosted header blur something real
          // instead of flat grey. Barely there, by design.
          background:
            "radial-gradient(70% 26% at 50% 0%, rgba(0,122,255,0.05), transparent 70%)",
        }}
      >
        {loading && messages.length === 0 && !isSearching ? (
          <MessageSkeleton />
        ) : !isSearching && messages.length === 0 ? (
          <EmptyState
            wordmark
            title="No messages yet"
            subtitle={`Send the first message to ${isSelfChat ? "yourself" : otherUser.full_name.split(" ")[0]}`}
          />
        ) : isSearching && !searchBusy && searchResults.length === 0 ? (
          <EmptyState
            title="No messages found"
            subtitle={`Nothing in this chat matches "${searchQuery.trim()}"`}
          />
        ) : (
          visibleMessages.map((m, i) => {
            const isMine = m.sender_id === currentUserId;
            const effectiveStatus = isMine && messageStatuses[m.id]
              ? messageStatuses[m.id]
              : m.status;
            const prev = visibleMessages[i - 1];
            const showDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
            const replied = m.reply_to_id ? messageById.get(m.reply_to_id) ?? null : null;
            const matchPosition = isSearching ? searchResults.findIndex((r) => r.id === m.id) : -1;
            return (
              <div
                key={m.id}
                ref={(el) => {
                  if (el) messageRefs.current.set(m.id, el);
                  else messageRefs.current.delete(m.id);
                }}
              >
                {showDay && <DaySeparator label={formatDayLabel(m.created_at)} />}
                <MessageBubble
                  message={{ ...m, status: effectiveStatus ?? m.status }}
                  isMine={isMine}
                  senderName={isMine ? "You" : otherUser.full_name}
                  reactions={reactions[m.id] ?? []}
                  currentUserId={currentUserId}
                  onEdit={(text) => edit(m.id, text)}
                  onDelete={() => remove(m.id)}
                  onReact={(emoji) => handleReact(m.id, emoji)}
                  onRemoveReaction={() => handleRemoveReaction(m.id)}
                  onReply={() => setReplyTo(m.id)}
                  onForward={() => setForwardTarget(m)}
                  highlight={isSearching ? searchQuery.trim() : ""}
                  isSearchMatch={isSearching && matchPosition === searchIndex}
                  replyTo={
                    replied
                      ? {
                          senderName: replied.sender_id === currentUserId ? "You" : otherUser.full_name,
                          text: replyLabel(replied),
                        }
                      : null
                  }
                  viewerImages={viewerImages}
                  viewerIndex={viewerIndexById.get(m.id) ?? 0}
                />
              </div>
            );
          })
        )}
        {isOtherTyping && <TypingIndicator label={otherUser.full_name.split(" ")[0] ?? otherUser.full_name} />}
      </div>

      {replyMessage && (
        <div className="glass px-4 py-2.5 flex items-center justify-between gap-3 border-t flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.6)" }}>
          <div className="min-w-0 flex items-center gap-2.5">
            <span className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: "var(--color-blue)" }} />
            <div className="min-w-0">
              <div className="text-caption font-semibold" style={{ color: "var(--color-blue)" }}>
                Replying to {replyMessage.sender_id === currentUserId ? "yourself" : otherUser.full_name.split(" ")[0]}
              </div>
              <div className="text-caption truncate" style={{ color: "var(--color-gray-1)" }}>
                {truncatePreview(replyLabel(replyMessage), 60)}
              </div>
            </div>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-caption font-semibold flex-shrink-0" style={{ color: "var(--color-blue)" }}>Cancel</button>
        </div>
      )}

      <MessageComposer
        chatId={chatId}
        onSend={(text) => {
          send(text, replyTo);
          setReplyTo(null);
          // Sending in a hidden chat brings it back to the main list
          // (WhatsApp behaviour). The server trigger in migration 0007
          // does this for the other side too; this covers our side
          // before that migration is run on the live project.
          if (currentUserId) {
            const item = useChatStore.getState().chatList.find((c) => c.chatId === chatId);
            if (item?.isArchived) {
              setChatArchived(chatId, currentUserId, false).catch(() => {});
              const store = useChatStore.getState();
              store.setChatList(
                store.chatList.map((c) => (c.chatId === chatId ? { ...c, isArchived: false } : c))
              );
            }
          }
        }}
        onTyping={notifyTyping}
      />

      {forwardTarget && (
        <ForwardSheet message={forwardTarget} onClose={() => setForwardTarget(null)} />
      )}
    </div>
  );
}
