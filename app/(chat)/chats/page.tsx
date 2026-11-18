"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Plus, Search as SearchIconLucide, Archive, ChevronRight } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ChatListItem } from "@/components/chat/ChatListItem";
import { ChatActionSheet } from "@/components/chat/ChatActionSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { SparkWordmark } from "@/components/brand/SparkWordmark";
import { useChatStore } from "@/store/chat-store";
import { useChatListReceiptSync } from "@/hooks/useChatListReceiptSync";
import { fetchChatList, setChatPinned, setChatMuted, setChatArchived, markChatRead, deleteChatForSelf, blockUser, searchUsers } from "@/services/chat-service";
import { searchAllMessages, type GlobalMessageHit } from "@/services/message-service";
import { getUnreadCount } from "@/services/notification-service";
import { formatChatListTime } from "@/utils/helpers";
import type { Profile } from "@/types";
import { createClient } from "@/lib/supabase";
import { chatCache } from "@/lib/storage";

const supabase = createClient();

function ChatRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "var(--color-gray-3)" }} />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-4 w-28 rounded-full" style={{ background: "var(--color-gray-3)" }} />
          <div className="h-3 w-10 rounded-full" style={{ background: "var(--color-gray-3)" }} />
        </div>
        <div className="h-3 w-44 rounded-full" style={{ background: "var(--color-gray-3)" }} />
      </div>
    </div>
  );
}

function SearchSectionLabel({ children }: { children: string }) {
  return (
    <p className="text-caption font-semibold uppercase tracking-wide px-3 pt-3 pb-1" style={{ color: "var(--color-gray-1)" }}>
      {children}
    </p>
  );
}

/** Plain-words label for a message hit — same words as the reply labels, never emoji. */
function messageHitLabel(hit: GlobalMessageHit): string {
  if (hit.contentType === "image") return "Photo";
  if (hit.contentType === "voice") return "Voice message";
  if (hit.contentType === "file") return hit.text || "File";
  return hit.text;
}

export default function ChatsPage() {
  const router = useRouter();
  const { chatList, setChatList } = useChatStore();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  // Unified search (v1.6.1): one bar searches chats (local, instant),
  // messages (server-side, whole history) and people (server-side).
  // `resultsFor` is the query the shown server results belong to, so
  // the list never flashes an empty state for a query still searching.
  const [msgHits, setMsgHits] = useState<GlobalMessageHit[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [resultsFor, setResultsFor] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cached = await chatCache.hydrateChatList();
      if (cached?.length && !cancelled) {
        setChatList(cached as never);
        setLoading(false);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);
      getUnreadCount().then((n) => { if (!cancelled) setUnreadNotifs(n); });

      try {
        const fresh = await fetchChatList(user.id);
        if (!cancelled) {
          setChatList(fresh);
          await chatCache.setChatList(fresh as never);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [setChatList]);

  useEffect(() => {
    const channel = supabase
      .channel("notif-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        getUnreadCount().then(setUnreadNotifs);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // v1.8.3 — receipt writes (either phone, any chat) refresh the list,
  // so a badge cleared by opening a thread disappears here too.
  useChatListReceiptSync(userId, "mobile");

  // Unified search: debounced server-side lookup for messages + people.
  // The local chat filter below is instant; these two calls take ~300ms
  // of quiet typing first, so fast typing never fires a storm of calls.
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setMsgHits([]);
      setPeople([]);
      setSearching(false);
      setResultsFor("");
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      Promise.all([
        searchAllMessages(q).catch(() => [] as GlobalMessageHit[]),
        searchUsers(q).catch(() => [] as Profile[]),
      ])
        .then(([hits, found]) => {
          if (cancelled) return;
          setMsgHits(hits);
          setPeople(found.filter((u) => u.id !== userId));
          setResultsFor(q);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, userId]);

  const filtered = chatList
    .filter((c) => !c.isArchived)
    .filter((c) =>
      c.otherUser.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.otherUser.username?.toLowerCase().includes(search.toLowerCase())
    );
  const archivedCount = chatList.filter((c) => c.isArchived).length;

  const trimmedSearch = search.trim();
  const isSearchMode = trimmedSearch.length > 0;
  // Settled = the shown server results belong to the current query.
  // The empty state only renders when settled — never while typing.
  const searchSettled = !searching && resultsFor === trimmedSearch;
  const hasAnyResult = filtered.length > 0 || msgHits.length > 0 || people.length > 0;

  /** Tapping a message result opens that chat with its in-chat search
      already running for the same text, jumping to the match. */
  const openMessageHit = (hit: GlobalMessageHit) => {
    useChatStore.getState().setPendingThreadSearch({ chatId: hit.chatId, query: trimmedSearch });
    router.push(`/chats/${hit.chatId}`);
  };

  const showSkeletons = loading && chatList.length === 0;
  const activeChat = chatList.find((c) => c.chatId === activeChatId) ?? null;

  const updateLocal = (chatId: string, patch: Partial<(typeof chatList)[number]>) => {
    setChatList(chatList.map((c) => (c.chatId === chatId ? { ...c, ...patch } : c)));
  };
  const removeLocal = (chatId: string) => {
    setChatList(chatList.filter((c) => c.chatId !== chatId));
  };

  const handleTogglePin = async () => {
    if (!activeChat || !userId) return;
    const next = !activeChat.isPinned;
    updateLocal(activeChat.chatId, { isPinned: next });
    await setChatPinned(activeChat.chatId, userId, next).catch(() => {});
  };
  const handleToggleMute = async () => {
    if (!activeChat || !userId) return;
    const next = !activeChat.isMuted;
    updateLocal(activeChat.chatId, { isMuted: next });
    await setChatMuted(activeChat.chatId, userId, next).catch(() => {});
  };
  const handleMarkRead = async () => {
    if (!activeChat || !userId) return;
    updateLocal(activeChat.chatId, { unreadCount: 0 });
    await markChatRead(activeChat.chatId, userId).catch(() => {});
  };
  const handleToggleArchive = async () => {
    if (!activeChat || !userId) return;
    const next = !activeChat.isArchived;
    updateLocal(activeChat.chatId, { isArchived: next });
    await setChatArchived(activeChat.chatId, userId, next).catch(() => {});
  };
  const handleDelete = async () => {
    if (!activeChat || !userId) return;
    removeLocal(activeChat.chatId);
    await deleteChatForSelf(activeChat.chatId, userId).catch(() => {});
  };
  const handleBlock = async () => {
    if (!activeChat) return;
    removeLocal(activeChat.chatId);
    await blockUser(activeChat.otherUser.id).catch(() => {});
  };

  return (
    <>
      {/* Mobile: full chat list. Hidden on desktop — the persistent sidebar in layout.tsx replaces it. */}
      <div className="md:hidden h-full">
        <ScreenContainer>
          <div className="flex flex-col h-full">
            <StatusBar />

            {/* v1.2.0: frosted header. Search + New Chat moved here from the nav. */}
            <div className="frosted-header px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-4">
                <SparkWordmark size="small" />
                {/* v1.6.1: ONE search — the bar below is the only search
                    entry. The magnifier that went to /search is gone;
                    the bell + new-chat stay. */}
                <div className="flex items-center gap-1">
                  <button onClick={() => router.push("/activity")} aria-label="Activity" className="pressable w-11 h-11 rounded-full flex items-center justify-center relative">
                    <Bell size={22} color="var(--color-black)" strokeWidth={1.8} />
                    {unreadNotifs > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--color-red)" }}>
                        {unreadNotifs > 9 ? "9+" : unreadNotifs}
                      </span>
                    )}
                  </button>
                  <button onClick={() => router.push("/chats/new")} aria-label="New chat" className="pressable w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--color-blue)" }}>
                    <Plus size={22} color="white" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="glass-input flex items-center gap-2 rounded-full px-4 py-2">
                <SearchIconLucide size={14} color="var(--color-gray-1)" strokeWidth={1.8} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search chats, messages or people"
                  className="flex-1 outline-none text-body bg-transparent"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-caption font-medium" style={{ color: "var(--color-blue)" }}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pt-2 pb-24 space-y-1">
              {showSkeletons && (
                <>{[1,2,3,4,5].map((i) => <ChatRowSkeleton key={i} />)}</>
              )}

              {!showSkeletons && !isSearchMode && archivedCount > 0 && (
                <button
                  onClick={() => router.push("/chats/hidden")}
                  className="w-full flex items-center gap-3.5 px-4 py-4 min-h-[76px] text-left rounded-2xl active:bg-white/50 transition-colors"
                >
                  <span
                    className="w-[52px] h-[52px] rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(0,122,255,0.1)" }}
                  >
                    <Archive size={22} color="var(--color-blue)" strokeWidth={1.8} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-body font-semibold truncate" style={{ color: "var(--color-black)" }}>
                      Hidden
                    </span>
                    <span className="block text-caption truncate" style={{ color: "var(--color-gray-1)" }}>
                      {archivedCount} {archivedCount === 1 ? "chat" : "chats"}
                    </span>
                  </span>
                  <span
                    className="min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center text-caption font-bold text-white flex-shrink-0"
                    style={{ background: "var(--color-blue)" }}
                  >
                    {archivedCount}
                  </span>
                  <ChevronRight size={18} color="var(--color-gray-1)" strokeWidth={2} />
                </button>
              )}

              {!showSkeletons && !isSearchMode && filtered.length === 0 && (
                <EmptyState
                  wordmark
                  title="No chats yet"
                  subtitle="Search for people and send a Spark Request to connect"
                  actionLabel="Find People"
                  onAction={() => router.push("/search")}
                />
              )}

              {!showSkeletons && !isSearchMode && filtered.map((item) => (
                <ChatListItem
                  key={item.chatId}
                  item={item}
                  onClick={() => router.push(`/chats/${item.chatId}`)}
                  onLongPress={() => setActiveChatId(item.chatId)}
                />
              ))}

              {/* Unified search results (v1.6.1): Chats, Messages, People.
                  Server sections only render once their results belong to
                  the current query; while a new query is still searching,
                  skeletons hold their place — no empty-state flash.
                  No "recent searches": there is no real recents store,
                  so no recents section exists. */}
              {!showSkeletons && isSearchMode && (
                <>
                  {filtered.length > 0 && (
                    <>
                      <SearchSectionLabel>Chats</SearchSectionLabel>
                      {filtered.map((item) => (
                        <ChatListItem
                          key={item.chatId}
                          item={item}
                          onClick={() => router.push(`/chats/${item.chatId}`)}
                          onLongPress={() => setActiveChatId(item.chatId)}
                        />
                      ))}
                    </>
                  )}

                  {searching && resultsFor !== trimmedSearch ? (
                    <>{[1, 2, 3].map((i) => <ChatRowSkeleton key={i} />)}</>
                  ) : (
                    <>
                      {msgHits.length > 0 && (
                        <>
                          <SearchSectionLabel>Messages</SearchSectionLabel>
                          {msgHits.map((hit) => {
                            const chat = chatList.find((c) => c.chatId === hit.chatId);
                            return (
                              <button
                                key={hit.id}
                                onClick={() => openMessageHit(hit)}
                                className="glass-row w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-2xl active:scale-[0.99] transition-all duration-200"
                              >
                                <Avatar name={chat?.otherUser.full_name ?? "Chat"} src={chat?.otherUser.avatar_url} size={48} />
                                <span className="flex-1 min-w-0">
                                  <span className="block text-body font-semibold truncate" style={{ color: "var(--color-black)" }}>
                                    {chat?.otherUser.full_name ?? "Chat"}
                                  </span>
                                  <span className="block text-body truncate" style={{ color: "var(--color-gray-1)" }}>
                                    {hit.senderId === userId ? "You: " : ""}{messageHitLabel(hit)}
                                  </span>
                                </span>
                                <span className="text-caption flex-shrink-0" style={{ color: "var(--color-gray-1)" }}>
                                  {formatChatListTime(hit.createdAt)}
                                </span>
                              </button>
                            );
                          })}
                        </>
                      )}

                      {people.length > 0 && (
                        <>
                          <SearchSectionLabel>People</SearchSectionLabel>
                          {people.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => router.push(`/profile/${user.id}`)}
                              className="glass-row w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-2xl active:scale-[0.99] transition-all duration-200"
                            >
                              <Avatar name={user.full_name} src={user.avatar_url} size={48} online={user.is_online} />
                              <span className="flex-1 min-w-0">
                                <span className="block text-body font-semibold truncate" style={{ color: "var(--color-black)" }}>
                                  {user.full_name}
                                </span>
                                <span className="block text-caption truncate" style={{ color: "var(--color-gray-1)" }}>
                                  @{user.username}
                                </span>
                              </span>
                              <ChevronRight size={18} color="var(--color-gray-1)" strokeWidth={2} />
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  )}

                  {searchSettled && !hasAnyResult && (
                    <EmptyState
                      title={`No results for "${trimmedSearch}"`}
                      subtitle="Try a different search"
                    />
                  )}
                </>
              )}

              <div className="h-4" />
            </div>
          </div>
        </ScreenContainer>
        {/* v1.6.1: the nav is fixed to the viewport — it must NOT live
            inside ScreenContainer's .glass frame (backdrop-filter would
            pin it to the 100vh frame instead of the visible viewport). */}
        <BottomNav />
      </div>

      {/* Desktop: sidebar already shows the list, so this panel is just an empty state until a chat is picked. */}
      <div className="hidden md:flex md:flex-1 md:items-center md:justify-center h-full">
        <div className="glass-card rounded-[32px] px-8 py-10 flex flex-col items-center text-center max-w-sm mx-8">
          <div className="mb-4">
            <SparkWordmark size="medium" animate />
          </div>
          <p className="text-title font-semibold mb-1">Select a chat</p>
          <p className="text-body max-w-xs mb-6" style={{ color: "var(--color-gray-1)" }}>
            Choose a conversation from the sidebar, or start a new one to begin messaging.
          </p>
          <button
            onClick={() => router.push("/chats/new")}
            className="pressable px-6 py-3 rounded-full text-body font-semibold text-white"
            style={{ background: "var(--color-blue)", boxShadow: "0 8px 24px rgba(0,122,255,0.3)" }}
          >
            New Chat
          </button>
        </div>
      </div>

      <ChatActionSheet
        open={!!activeChat}
        onClose={() => setActiveChatId(null)}
        chatName={activeChat?.otherUser.full_name ?? ""}
        isPinned={activeChat?.isPinned ?? false}
        isMuted={activeChat?.isMuted ?? false}
        isArchived={activeChat?.isArchived ?? false}
        onTogglePin={handleTogglePin}
        onToggleMute={handleToggleMute}
        onMarkRead={handleMarkRead}
        onToggleArchive={handleToggleArchive}
        onDelete={handleDelete}
        onBlock={handleBlock}
      />
    </>
  );
}
