"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircleMore, Bell, Search as SearchIconLucide } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ChatListItem } from "@/components/chat/ChatListItem";
import { ChatActionSheet } from "@/components/chat/ChatActionSheet";
import { useChatStore } from "@/store/chat-store";
import { fetchChatList, setChatPinned, setChatMuted, markChatRead, deleteChatForSelf, blockUser } from "@/services/chat-service";
import { getUnreadCount } from "@/services/notification-service";
import { createClient } from "@/lib/supabase";
import { chatCache } from "@/lib/storage";

const supabase = createClient();

function ChatRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-3 animate-pulse">
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

export default function ChatsPage() {
  const router = useRouter();
  const { chatList, setChatList } = useChatStore();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

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

  const filtered = chatList.filter((c) =>
    c.otherUser.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.otherUser.username?.toLowerCase().includes(search.toLowerCase())
  );

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
  const handleDelete = async () => {
    if (!activeChat || !userId) return;
    if (!window.confirm(`Delete chat with ${activeChat.otherUser.full_name}? This only removes it from your side.`)) return;
    removeLocal(activeChat.chatId);
    await deleteChatForSelf(activeChat.chatId, userId).catch(() => {});
  };
  const handleBlock = async () => {
    if (!activeChat) return;
    if (!window.confirm(`Block ${activeChat.otherUser.full_name}? They won't be able to message you.`)) return;
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

            <div className="px-5 pt-4 pb-3">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Sparks</h1>
                <div className="flex items-center gap-3">
                  <button onClick={() => router.push("/search")} aria-label="Find people" className="active:opacity-60 transition-opacity">
                    <SearchIconLucide size={22} color="var(--color-black)" strokeWidth={1.8} />
                  </button>
                  <button onClick={() => router.push("/activity")} aria-label="Activity" className="active:opacity-60 transition-opacity relative">
                    <Bell size={22} color="var(--color-black)" strokeWidth={1.8} />
                    {unreadNotifs > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--color-red)" }}>
                        {unreadNotifs > 9 ? "9+" : unreadNotifs}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "var(--color-gray-2)" }}>
                <SearchIconLucide size={14} color="var(--color-gray-1)" strokeWidth={1.8} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search chats or users"
                  className="flex-1 outline-none text-sm bg-transparent"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-xs font-medium" style={{ color: "var(--color-blue)" }}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {showSkeletons && (
                <>{[1,2,3,4,5].map((i) => <ChatRowSkeleton key={i} />)}</>
              )}

              {!showSkeletons && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
                  <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: "rgba(0,122,255,0.1)" }}>
                    <span className="text-2xl">⚡</span>
                  </div>
                  <p className="font-semibold mb-1">
                    {search ? `No chats matching "${search}"` : "No chats yet"}
                  </p>
                  <p className="text-sm mb-5" style={{ color: "var(--color-gray-1)" }}>
                    {search ? "Try a different search" : "Search for people and send a Spark Request to connect"}
                  </p>
                  {!search && (
                    <button
                      onClick={() => router.push("/search")}
                      className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-white"
                      style={{ background: "var(--color-blue)" }}
                    >
                      Find People
                    </button>
                  )}
                </div>
              )}

              {filtered.map((item) => (
                <ChatListItem
                  key={item.chatId}
                  item={item}
                  onClick={() => router.push(`/chats/${item.chatId}`)}
                  onLongPress={() => setActiveChatId(item.chatId)}
                />
              ))}

              <div className="h-4" />
            </div>

            <BottomNav />
          </div>
        </ScreenContainer>
      </div>

      {/* Desktop: sidebar already shows the list, so this panel is just an empty state until a chat is picked. */}
      <div className="hidden md:flex md:flex-1 md:items-center md:justify-center h-full">
        <div className="flex flex-col items-center text-center px-8">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ background: "rgba(0,122,255,0.08)" }}>
            <MessageCircleMore size={36} color="var(--color-blue)" strokeWidth={1.5} />
          </div>
          <p className="text-lg font-semibold mb-1">Select a chat</p>
          <p className="text-sm max-w-xs" style={{ color: "var(--color-gray-1)" }}>
            Choose a conversation from the sidebar, or start a new one to begin messaging.
          </p>
        </div>
      </div>

      <ChatActionSheet
        open={!!activeChat}
        onClose={() => setActiveChatId(null)}
        isPinned={activeChat?.isPinned ?? false}
        isMuted={activeChat?.isMuted ?? false}
        onTogglePin={handleTogglePin}
        onToggleMute={handleToggleMute}
        onMarkRead={handleMarkRead}
        onDelete={handleDelete}
        onBlock={handleBlock}
      />
    </>
  );
}
