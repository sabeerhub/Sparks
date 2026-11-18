"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SparkRequestButton } from "@/components/spark/SparkRequestButton";
import { searchUsers, getNicknamesMap, fetchChatList } from "@/services/chat-service";
import { useChatStore } from "@/store/chat-store";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/types";

const supabase = createClient();

function UserRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-11 h-11 rounded-full flex-shrink-0" style={{ background: "var(--color-gray-3)" }} />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded-full" style={{ background: "var(--color-gray-3)" }} />
        <div className="h-3 w-20 rounded-full" style={{ background: "var(--color-gray-3)" }} />
      </div>
      <div className="h-9 w-24 rounded-2xl" style={{ background: "var(--color-gray-3)" }} />
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [nicknames, setNicknames] = useState<Map<string, string>>(new Map());
  const [searching, setSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const { chatList, setChatList } = useChatStore();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // v1.9.0 — real suggestions when nothing is typed: people you
  // already chat with. Nothing invented; the list comes from your
  // real chats, loaded here if the store is empty.
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

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const found = await searchUsers(q);
      const filtered = found.filter((u) => u.id !== currentUserId);
      setResults(filtered);
      getNicknamesMap(filtered.map((u) => u.id)).then(setNicknames);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [currentUserId]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => doSearch(q), 300);
    setDebounceTimer(t);
  };

  return (
    <div className="app-surface h-full w-full">
      <div className="flex flex-col h-full">
        <StatusBar />
        {/* v1.9.0 — desktop column: the search box was ~1800px wide. */}
        <div className="frosted-header px-4 pt-4 pb-3">
          <div className="mx-auto w-full max-w-[720px]">
            <h1 className="text-title font-bold mb-4">Find People</h1>
            <div className="glass-input flex items-center gap-2 rounded-full px-4 py-2">
              <SearchIcon size={14} color="var(--color-gray-1)" strokeWidth={1.8} />
              <input
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search by name or @username…"
                className="flex-1 outline-none text-body bg-transparent"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); }} className="text-caption font-medium" style={{ color: "var(--color-blue)" }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pt-2 pb-24 space-y-1">
          <div className="mx-auto w-full max-w-[720px]">
          {!query.trim() && suggestions.length === 0 && (
            <EmptyState
              wordmark
              title="Search for people"
              subtitle="Find friends by name or username, then send a Spark to connect."
            />
          )}

          {!query.trim() && suggestions.length > 0 && (
            <>
              <div className="px-4 py-2">
                <span className="text-caption font-semibold uppercase tracking-wider" style={{ color: "var(--color-gray-1)" }}>People you chat with</span>
              </div>
              {suggestions.map((c) => (
                <div key={c.chatId} className="glass-row flex items-center gap-3 px-4 py-3 rounded-2xl">
                  <button onClick={() => router.push(`/profile/${c.otherUser.id}`)} className="flex-shrink-0">
                    <Avatar name={c.otherUser.full_name} src={c.otherUser.avatar_url} size={44} online={c.otherUser.is_online} />
                  </button>
                  <button onClick={() => router.push(`/profile/${c.otherUser.id}`)} className="flex-1 min-w-0 text-left">
                    <div className="font-semibold text-body truncate">{c.otherUser.full_name}</div>
                    <div className="text-caption truncate" style={{ color: "var(--color-gray-1)" }}>@{c.otherUser.username}</div>
                  </button>
                  <button onClick={() => router.push(`/chats/${c.chatId}`)} className="pressable text-caption font-semibold px-3 py-2 rounded-full flex-shrink-0" style={{ background: "rgba(0,122,255,0.1)", color: "var(--color-blue)" }}>
                    Open chat
                  </button>
                </div>
              ))}
            </>
          )}

          {searching && <><UserRowSkeleton /><UserRowSkeleton /><UserRowSkeleton /></>}

          {!searching && query.trim() && results.length === 0 && (
            <EmptyState title={'No results for "' + query + '"'} subtitle="Try a different name or username" />
          )}

          {!searching && results.map((user) => {
            const nickname = nicknames.get(user.id);
            return (
              <div key={user.id} className="glass-row flex items-center gap-3 px-4 py-4 rounded-2xl">
                <button onClick={() => router.push(`/profile/${user.id}`)} className="flex-shrink-0">
                  <Avatar name={user.full_name} src={user.avatar_url} size={44} online={user.is_online} />
                </button>
                <button onClick={() => router.push(`/profile/${user.id}`)} className="flex-1 min-w-0 text-left">
                  <div className="font-semibold text-body truncate">{nickname || user.full_name}</div>
                  <div className="text-caption truncate" style={{ color: "var(--color-gray-1)" }}>
                    @{user.username}{nickname && <span> · {user.full_name}</span>}
                  </div>
                </button>
                {currentUserId && (
                  <div className="flex-shrink-0">
                    <SparkRequestButton targetUserId={user.id} currentUserId={currentUserId} compact />
                  </div>
                )}
              </div>
            );
          })}
          <div className="h-4" />
          </div>
        </div>

        <div className="md:hidden"><BottomNav /></div>
      </div>
    </div>
  );
}
