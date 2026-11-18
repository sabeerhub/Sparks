"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { searchUsers, startDirectChat, fetchChatList } from "@/services/chat-service";
import { useChatStore } from "@/store/chat-store";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/types";

const supabase = createClient();

export default function NewChatPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [starting, setStarting] = useState(false);
  const [searching, setSearching] = useState(false);
  const { chatList, setChatList } = useChatStore();

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setSearching(false);
        return;
      }
      // v1.9.0 — the old code showed "No users found" while the
      // search was still in flight (a slow connection made "Test"
      // miss "Test guy"). Searching is now a real state: skeletons
      // while it runs, the empty state only once it has finished.
      setSearching(true);
      const { data: { user } } = await supabase.auth.getUser();
      const found = await searchUsers(query);
      setResults(found.filter((u) => u.id !== user?.id));
      setSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  // Real suggestions when nothing is typed: people you already chat
  // with (from the chat list, loaded here if the store is empty).
  // Tapping one opens that chat — nothing invented.
  useEffect(() => {
    if (chatList.length > 0) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try {
        const list = await fetchChatList(user.id);
        if (!cancelled) setChatList(list);
      } catch {
        /* suggestions stay empty — search still works */
      }
    })();
    return () => { cancelled = true; };
  }, [chatList.length, setChatList]);
  const suggestions = chatList.filter((c) => !c.isArchived).slice(0, 8);

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
      {/* v1.9.0 — desktop column so the search box is not ~1800px wide,
          and a close button (there was none — you could only go back
          with the browser). */}
      <div className="mx-auto w-full max-w-[720px] flex flex-col flex-1 min-h-0">
      <div className="frosted-header px-4 pt-2 pb-3">
        <div className="flex items-center justify-between mb-4">
          <span className="w-9 h-9 flex-shrink-0" aria-hidden />
          <h2 className="text-title font-bold text-center">New Chat</h2>
          <button
            onClick={() => router.back()}
            aria-label="Close"
            className="glass pressable w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          >
            <X size={18} color="var(--color-gray-1)" strokeWidth={2} />
          </button>
        </div>
        <div className="glass-input flex items-center gap-2 rounded-full px-4 py-2">
          <SearchGlyph />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users"
            className="flex-1 outline-none text-body bg-transparent"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-caption font-medium" style={{ color: "var(--color-blue)" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {!query.trim() && suggestions.length > 0 && (
          <>
            <div className="px-4 py-2">
              <span className="text-caption font-semibold uppercase tracking-wider" style={{ color: "var(--color-gray-1)" }}>Recent chats</span>
            </div>
            {suggestions.map((c) => (
              <button
                key={c.chatId}
                onClick={() => router.push(`/chats/${c.chatId}`)}
                className="glass-row pressable w-full flex items-center gap-3 px-4 py-3 rounded-2xl"
              >
                <Avatar name={c.otherUser.full_name} src={c.otherUser.avatar_url} size={44} />
                <div className="flex-1 text-left">
                  <div className="text-body font-semibold">{c.otherUser.full_name}</div>
                  <div className="text-caption" style={{ color: "var(--color-gray-1)" }}>@{c.otherUser.username}</div>
                </div>
              </button>
            ))}
          </>
        )}
        {searching && (
          <div className="space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                <div className="w-11 h-11 rounded-full flex-shrink-0" style={{ background: "var(--color-gray-3)" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded-full" style={{ background: "var(--color-gray-3)" }} />
                  <div className="h-3 w-20 rounded-full" style={{ background: "var(--color-gray-3)" }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {!searching && results.length > 0 && (
          <div className="px-4 py-2">
            <span className="text-caption font-semibold uppercase tracking-wider" style={{ color: "var(--color-gray-1)" }}>Results</span>
          </div>
        )}
        {!searching && results.map((u) => (
          <button key={u.id} onClick={() => setSelected(u)} className="glass-row pressable w-full flex items-center gap-3 px-4 py-4 rounded-2xl">
            <Avatar name={u.full_name} src={u.avatar_url} size={44} />
            <div className="flex-1 text-left">
              <div className="text-body font-semibold">{u.full_name}</div>
              <div className="text-caption" style={{ color: "var(--color-gray-1)" }}>@{u.username}</div>
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
        {!searching && query && results.length === 0 && (
          <EmptyState title="No users found" subtitle="Try a different name or username" />
        )}
      </div>

      {selected && (
        <div className="px-4 pb-6 pt-3">
          <Button fullWidth loading={starting} onClick={handleStart}>
            Start Chat with {selected.full_name}
          </Button>
        </div>
      )}
      </div>
    </ScreenContainer>
  );
}

function SearchGlyph() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
}
function CheckGlyph() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
