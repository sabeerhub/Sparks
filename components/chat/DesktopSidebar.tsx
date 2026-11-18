"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, Bell, Plus, Archive, ChevronRight } from "lucide-react";
import { ChatListItem } from "@/components/chat/ChatListItem";
import { ChatActionSheet } from "@/components/chat/ChatActionSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { SparkWordmark } from "@/components/brand/SparkWordmark";
import { useChatStore } from "@/store/chat-store";
import { useChatListReceiptSync } from "@/hooks/useChatListReceiptSync";
import { fetchChatList, setChatPinned, setChatMuted, setChatArchived, markChatRead, deleteChatForSelf, blockUser } from "@/services/chat-service";
import { getUnreadCount } from "@/services/notification-service";
import { createClient } from "@/lib/supabase";
import { chatCache } from "@/lib/storage";

const supabase = createClient();

function SidebarRowSkeleton() {
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
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [userId, setUserId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  // v1.10.0 — the sidebar used to render "No chats yet" the moment it
  // mounted, while the list was still fetching: on first arrival the
  // empty state flashed before the chats populated. Now it shows
  // skeletons until the first fetch settles, exactly like the mobile
  // list already did.
  const [loading, setLoading] = useState(true);

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
      .channel("desktop-sidebar-notif-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        getUnreadCount().then(setUnreadNotifs);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // v1.8.3 — receipt writes (either phone, any chat) refresh the list,
  // so a badge cleared by opening a thread disappears here too. The
  // sidebar stays mounted across chats, so without this it would go
  // stale the moment a thread is opened.
  useChatListReceiptSync(userId, "desktop");

  const filtered = chatList
    .filter((c) => !c.isArchived)
    .filter((c) => (filter === "unread" ? (c.unreadCount ?? 0) > 0 : true))
    .filter((c) =>
      c.otherUser.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.otherUser.username?.toLowerCase().includes(search.toLowerCase()) ||
      // v1.10.0 — the self-chat's list name is "Saved Messages", so
      // searching "saved" must find it even though the profile name is
      // the user's own name.
      (c.isSelfChat && "saved messages".includes(search.toLowerCase()))
    );
  const archivedCount = chatList.filter((c) => c.isArchived).length;
  const totalUnread = chatList.reduce((n, c) => n + (c.unreadCount ?? 0), 0);

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

        {/* v1.9.0 — All / Unread filter chips. */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className="pressable px-3.5 py-1.5 rounded-full text-caption font-semibold"
            style={filter === "all"
              ? { background: "var(--color-blue)", color: "#fff" }
              : { background: "var(--color-gray-3)", color: "var(--color-gray-1)" }}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            aria-pressed={filter === "unread"}
            className="pressable px-3.5 py-1.5 rounded-full text-caption font-semibold flex items-center gap-1.5"
            style={filter === "unread"
              ? { background: "var(--color-blue)", color: "#fff" }
              : { background: "var(--color-gray-3)", color: "var(--color-gray-1)" }}
          >
            Unread
            {totalUnread > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: filter === "unread" ? "rgba(255,255,255,0.25)" : "var(--color-blue)", color: "#fff" }}>
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {!loading && archivedCount > 0 && !search && (
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
        {loading && filtered.length === 0 ? (
          <>{[1, 2, 3, 4, 5].map((i) => <SidebarRowSkeleton key={i} />)}</>
        ) : filtered.length === 0 ? (
          <EmptyState
            wordmark={!search && filter === "all"}
            title={search ? `No chats matching "${search}"` : filter === "unread" ? "No unread chats" : "No chats yet"}
            subtitle={search ? "Try a different search" : filter === "unread" ? "You're all caught up" : "Search for people and send a Spark Request to connect"}
            actionLabel={search || filter === "unread" ? undefined : "Find People"}
            onAction={search || filter === "unread" ? undefined : () => router.push("/search")}
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
        isArchived={activeChat?.isArchived ?? false}
        onTogglePin={handleTogglePin}
        onToggleMute={handleToggleMute}
        onMarkRead={handleMarkRead}
        onToggleArchive={handleToggleArchive}
        onDelete={handleDelete}
        onBlock={handleBlock}
      />
    </div>
  );
}
