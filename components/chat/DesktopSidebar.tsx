"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, Bell, Plus } from "lucide-react";
import { ChatListItem } from "@/components/chat/ChatListItem";
import { ChatActionSheet } from "@/components/chat/ChatActionSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { SparkWordmark } from "@/components/brand/SparkWordmark";
import { useChatStore } from "@/store/chat-store";
import { fetchChatList, setChatPinned, setChatMuted, markChatRead, deleteChatForSelf, blockUser } from "@/services/chat-service";
import { getUnreadCount } from "@/services/notification-service";
import { createClient } from "@/lib/supabase";
import { chatCache } from "@/lib/storage";

const supabase = createClient();

/**
 * Persistent desktop-only chat list sidebar, shown alongside the active
 * chat thread (WhatsApp Web style). Lives in the (chat)/chats layout, so
 * it stays mounted across navigations between chats — only the right
 * panel's content changes.
 */
export function DesktopSidebar() {
  const router = useRouter();
  const params = useParams<{ chatId?: string }>();
  const { chatList, setChatList } = useChatStore();
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await chatCache.hydrateChatList();
      if (cached?.length && !cancelled) setChatList(cached as never);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);
      getUnreadCount().then((n) => { if (!cancelled) setUnreadNotifs(n); });

      const fresh = await fetchChatList(user.id);
      if (!cancelled) {
        setChatList(fresh);
        await chatCache.setChatList(fresh as never);
      }
    })();
    return () => { cancelled = true; };
  }, [setChatList]);

  useEffect(() => {
    const channel = supabase
      .channel("desktop-sidebar-notif-badge")
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

  const activeChat = chatList.find((c) => c.chatId === activeChatId) ?? null;

  const updateLocal = (chatId: string, patch: Partial<(typeof chatList)[number]>) => {
    setChatList(chatList.map((c) => (c.chatId === chatId ? { ...c, ...patch } : c)));
  };
  const removeLocal = (chatId: string) => {
    setChatList(chatList.filter((c) => c.chatId !== chatId));
    if (params?.chatId === chatId) router.push("/chats");
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
    removeLocal(activeChat.chatId);
    await deleteChatForSelf(activeChat.chatId, userId).catch(() => {});
  };
  const handleBlock = async () => {
    if (!activeChat) return;
    removeLocal(activeChat.chatId);
    await blockUser(activeChat.otherUser.id).catch(() => {});
  };

  return (
    <div className="app-surface flex flex-col h-full">
      {/* v1.2.0: frosted header. Search + New Chat moved here from the nav rail. */}
      <div className="frosted-header px-4 pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <SparkWordmark size="small" />
          <div className="flex items-center gap-1">
            <button onClick={() => router.push("/search")} aria-label="Find people" className="pressable w-11 h-11 rounded-full flex items-center justify-center">
              <Search size={20} color="var(--color-black)" strokeWidth={1.8} />
            </button>
            <button onClick={() => router.push("/activity")} aria-label="Activity" className="pressable w-11 h-11 rounded-full flex items-center justify-center relative">
              <Bell size={20} color="var(--color-black)" strokeWidth={1.8} />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "var(--color-red)" }}>
                  {unreadNotifs > 9 ? "9+" : unreadNotifs}
                </span>
              )}
            </button>
            <button onClick={() => router.push("/chats/new")} aria-label="New chat" className="pressable w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--color-blue)" }}>
              <Plus size={20} color="white" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="glass-input flex items-center gap-2 rounded-full px-4 py-2">
          <Search size={16} color="var(--color-gray-1)" strokeWidth={1.8} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats or users"
            className="flex-1 outline-none text-body bg-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filtered.length === 0 ? (
          <EmptyState
            wordmark={!search}
            title={search ? `No chats matching "${search}"` : "No chats yet"}
            subtitle={search ? "Try a different search" : "Search for people and send a Spark Request to connect"}
            actionLabel={search ? undefined : "Find People"}
            onAction={search ? undefined : () => router.push("/search")}
          />
        ) : (
          filtered.map((item) => (
            <div key={item.chatId} className="rounded-2xl" style={item.chatId === params?.chatId ? { background: "rgba(0,122,255,0.08)" } : undefined}>
              <ChatListItem
                item={item}
                onClick={() => router.push(`/chats/${item.chatId}`)}
                onLongPress={() => setActiveChatId(item.chatId)}
              />
            </div>
          ))
        )}
      </div>

      <ChatActionSheet
        open={!!activeChat}
        onClose={() => setActiveChatId(null)}
        chatName={activeChat?.otherUser.full_name ?? ""}
        isPinned={activeChat?.isPinned ?? false}
        isMuted={activeChat?.isMuted ?? false}
        onTogglePin={handleTogglePin}
        onToggleMute={handleToggleMute}
        onMarkRead={handleMarkRead}
        onDelete={handleDelete}
        onBlock={handleBlock}
      />
    </div>
  );
}
