"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ChatListItem } from "@/components/chat/ChatListItem";
import { useChatStore } from "@/store/chat-store";
import { fetchChatList } from "@/services/chat-service";
import { createClient } from "@/lib/supabase";
import { chatCache } from "@/lib/storage";

const supabase = createClient();

export default function ChatsPage() {
  const router = useRouter();
  const { chatList, setChatList } = useChatStore();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cached = await chatCache.hydrateChatList();
      if (cached && !cancelled) {
        setChatList(cached as never);
        setLoading(false);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

  const filtered = chatList.filter((c) => c.otherUser.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full">
        <StatusBar />
        <div className="px-5 pt-2 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Sparks</h1>
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/search")} aria-label="Search">
                <SearchIcon />
              </button>
              <button className="relative" aria-label="Notifications">
                <BellIcon />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: "var(--color-red)" }} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "var(--color-gray-2)" }}>
            <SearchIcon small />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats or users"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && chatList.length === 0 && (
            <div className="flex items-center justify-center pt-20">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-blue)" }} />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
              <p className="font-semibold mb-1">No chats yet</p>
              <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>Tap + to start a new conversation</p>
            </div>
          )}
          {filtered.map((item) => (
            <ChatListItem key={item.chatId} item={item} onClick={() => router.push(`/chats/${item.chatId}`)} />
          ))}
        </div>

        <BottomNav />
      </div>
    </ScreenContainer>
  );
}

function SearchIcon({ small }: { small?: boolean }) {
  const size = small ? 14 : 22;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={small ? "var(--color-gray-1)" : "var(--color-black)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-black)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
