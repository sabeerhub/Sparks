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

  const filtered = chatList.filter((c) =>
    c.otherUser.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.otherUser.username?.toLowerCase().includes(search.toLowerCase())
  );

  const showSkeletons = loading && chatList.length === 0;

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full">
        <StatusBar />

        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Sparks</h1>
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/search")} aria-label="Find people" className="active:opacity-60 transition-opacity">
                <SearchIcon />
              </button>
              <button onClick={() => router.push("/activity")} aria-label="Activity" className="active:opacity-60 transition-opacity">
                <BellIcon />
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
            <ChatListItem key={item.chatId} item={item} onClick={() => router.push(`/chats/${item.chatId}`)} />
          ))}

          <div className="h-4" />
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
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-black)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
