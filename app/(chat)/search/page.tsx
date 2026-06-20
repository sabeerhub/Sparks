"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { useChatStore } from "@/store/chat-store";

export default function SearchPage() {
  const router = useRouter();
  const { chatList } = useChatStore();
  const [query, setQuery] = useState("");

  const results = query
    ? chatList.filter(
        (c) =>
          c.otherUser.full_name.toLowerCase().includes(query.toLowerCase()) ||
          c.lastMessagePreview.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <ScreenContainer>
      <div className="flex flex-col h-full">
        <StatusBar />
        <div className="px-5 pt-3 pb-2">
          <h1 className="text-2xl font-bold mb-4">Search</h1>
          <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "var(--color-gray-2)" }}>
            <SearchGlyph />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats, messages, people…"
              className="flex-1 outline-none text-sm bg-transparent"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-xs font-medium" style={{ color: "var(--color-blue)" }}>
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
              <p className="font-semibold mb-1">No results</p>
              <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>Try a different search term</p>
            </div>
          )}
          {results.map((c) => (
            <button
              key={c.chatId}
              onClick={() => router.push(`/chats/${c.chatId}`)}
              className="w-full flex items-center gap-3 px-5 py-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{c.otherUser.full_name}</div>
                <div className="text-sm truncate" style={{ color: "var(--color-gray-1)" }}>{c.lastMessagePreview}</div>
              </div>
            </button>
          ))}
        </div>
        <BottomNav />
      </div>
    </ScreenContainer>
  );
}

function SearchGlyph() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
}
