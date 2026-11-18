/**
 * app/(chat)/chats/hidden/page.tsx
 * v1.5.1 — the Hidden view. Chats leave the main list when hidden
 * (from the ChatActionSheet) and live here until they are unhidden —
 * or until a new message arrives, which brings them back automatically
 * (migration 0007 trigger; the thread also unhides on send). The
 * count is always the real number of hidden chats, and the row only
 * appears in the list when there is at least one. Called "Hidden" in
 * the UI on purpose — not "Archive", which is WhatsApp's word.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ChatListItem } from "@/components/chat/ChatListItem";
import { ChatActionSheet } from "@/components/chat/ChatActionSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { useChatStore } from "@/store/chat-store";
import { fetchChatList, setChatPinned, setChatMuted, setChatArchived, markChatRead, deleteChatForSelf, blockUser } from "@/services/chat-service";
import { createClient } from "@/lib/supabase";
import { chatCache } from "@/lib/storage";

const supabase = createClient();

export default function HiddenChatsPage() {
  const router = useRouter();
  const { chatList, setChatList } = useChatStore();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, [setChatList]);

  const archived = chatList.filter((c) => c.isArchived);
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

  const list = (
    <div className="flex-1 overflow-y-auto px-2 pt-2 pb-24 space-y-1">
      {loading && archived.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "var(--color-gray-3)" }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 rounded-full" style={{ background: "var(--color-gray-3)" }} />
            <div className="h-3 w-44 rounded-full" style={{ background: "var(--color-gray-3)" }} />
          </div>
        </div>
      ) : archived.length === 0 ? (
        <EmptyState
          title="No hidden chats"
          subtitle="Chats you hide will live here. A new message brings one back to your main list."
        />
      ) : (
        archived.map((item) => (
          <ChatListItem
            key={item.chatId}
            item={item}
            onClick={() => router.push(`/chats/${item.chatId}`)}
            onLongPress={() => setActiveChatId(item.chatId)}
          />
        ))
      )}
      <div className="h-4" />
    </div>
  );

  return (
    <>
      {/* Mobile: full hidden list. */}
      <div className="md:hidden h-full">
        <ScreenContainer>
          <div className="flex flex-col h-full">
            <StatusBar />
            <div className="frosted-header px-4 pt-4 pb-3 flex items-center gap-2">
              <button onClick={() => router.push("/chats")} aria-label="Back to chats" className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center active:bg-white/60 active:scale-95 transition-all duration-200">
                <ArrowLeft size={22} color="var(--color-blue)" strokeWidth={2} />
              </button>
              <div className="min-w-0">
                <h1 className="text-title font-semibold">Hidden</h1>
                <p className="text-caption" style={{ color: "var(--color-gray-1)" }}>
                  {archived.length} {archived.length === 1 ? "chat" : "chats"}
                </p>
              </div>
            </div>
            {list}
          </div>
        </ScreenContainer>
        {/* v1.6.1: fixed nav — kept out of ScreenContainer's .glass
            frame (see chats/page.tsx) so it pins to the viewport. */}
        <BottomNav />
      </div>

      {/* Desktop: the hidden list fills the right panel. */}
      <div className="hidden md:flex md:flex-1 h-full">
        <div className="app-surface flex flex-col h-full w-full max-w-xl">
          <div className="frosted-header px-6 pt-6 pb-3 flex items-center gap-2">
            <button onClick={() => router.push("/chats")} aria-label="Back to chats" className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center active:bg-white/60 active:scale-95 transition-all duration-200">
              <ArrowLeft size={22} color="var(--color-blue)" strokeWidth={2} />
            </button>
            <div className="min-w-0">
              <h1 className="text-title font-semibold">Hidden</h1>
              <p className="text-caption" style={{ color: "var(--color-gray-1)" }}>
                {archived.length} {archived.length === 1 ? "chat" : "chats"}
              </p>
            </div>
          </div>
          {list}
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
