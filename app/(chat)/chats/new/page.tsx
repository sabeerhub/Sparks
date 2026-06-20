"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { searchUsers, startDirectChat } from "@/services/chat-service";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/types";

const supabase = createClient();

export default function NewChatPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      const found = await searchUsers(query);
      setResults(found.filter((u) => u.id !== user?.id));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const handleStart = async () => {
    if (!selected) return;
    setStarting(true);
    try {
      const chatId = await startDirectChat(selected.id);
      router.push(`/chats/${chatId}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScreenContainer>
      <StatusBar />
      <div className="px-5 pt-2 pb-3">
        <h2 className="text-xl font-bold text-center mb-4">New Chat</h2>
        <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "var(--color-gray-2)" }}>
          <SearchGlyph />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users"
            className="flex-1 outline-none text-sm bg-transparent"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 mb-2 space-y-1">
          <button
            disabled
            title="Group chats are not part of this MVP — 1:1 chats only"
            className="w-full flex items-center gap-3 py-3 opacity-40 cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--color-blue-light)" }}>
              <NewGroupIcon />
            </div>
            <span className="font-semibold text-sm" style={{ color: "var(--color-blue)" }}>New Group</span>
          </button>
          <button
            disabled
            title="Broadcast lists are not part of this MVP — 1:1 chats only"
            className="w-full flex items-center gap-3 py-3 opacity-40 cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--color-blue-light)" }}>
              <BroadcastIcon />
            </div>
            <span className="font-semibold text-sm" style={{ color: "var(--color-blue)" }}>New Broadcast</span>
          </button>
        </div>

        {results.length > 0 && (
          <div className="px-5 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-gray-1)" }}>Results</span>
          </div>
        )}
        {results.map((u) => (
          <button key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center gap-3 px-5 py-3">
            <Avatar name={u.full_name} src={u.avatar_url} size={44} />
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold">{u.full_name}</div>
              <div className="text-xs" style={{ color: "var(--color-gray-1)" }}>@{u.username}</div>
            </div>
            <div
              className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
              style={{
                borderColor: selected?.id === u.id ? "var(--color-blue)" : "var(--color-gray-3)",
                background: selected?.id === u.id ? "var(--color-blue)" : "transparent",
              }}
            >
              {selected?.id === u.id && <CheckGlyph />}
            </div>
          </button>
        ))}
        {query && results.length === 0 && (
          <p className="text-center text-sm pt-10" style={{ color: "var(--color-gray-1)" }}>No users found</p>
        )}
      </div>

      {selected && (
        <div className="px-5 pb-6 pt-3">
          <Button fullWidth loading={starting} onClick={handleStart}>
            Start Chat with {selected.full_name}
          </Button>
        </div>
      )}
    </ScreenContainer>
  );
}

function NewGroupIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function BroadcastIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 16.9A5 5 0 0018 7" /><path d="M6.26 7a5 5 0 00-.01 9.76" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function SearchGlyph() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
}
function CheckGlyph() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
