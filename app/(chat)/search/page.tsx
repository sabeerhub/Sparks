"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { StatusBar } from "@/components/layout/StatusBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Avatar } from "@/components/ui/Avatar";
import { SparkRequestButton } from "@/components/spark/SparkRequestButton";
import { searchUsers, getNicknamesMap } from "@/services/chat-service";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/types";

const supabase = createClient();

function UserRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-3 animate-pulse">
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

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
    <div className="h-full w-full bg-white">
      <div className="flex flex-col h-full">
        <StatusBar />
        <div className="px-5 pt-4 pb-3">
          <h1 className="text-2xl font-bold mb-4">Find People</h1>
          <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: "var(--color-gray-2)" }}>
            <SearchIcon size={14} color="var(--color-gray-1)" strokeWidth={1.8} />
            <input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search by name or @username…"
              className="flex-1 outline-none text-sm bg-transparent"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
            />
            {query && (
              <button onClick={() => { setQuery(""); setResults([]); }} className="text-xs font-medium" style={{ color: "var(--color-blue)" }}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!query.trim() && (
            <div className="flex flex-col items-center justify-center pt-16 px-8 text-center">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: "rgba(0,122,255,0.1)" }}>
                <SearchIcon size={28} color="var(--color-blue)" strokeWidth={1.8} />
              </div>
              <p className="font-semibold mb-1">Search for people</p>
              <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>
                Find friends by name or username, then send a Spark to connect.
              </p>
            </div>
          )}

          {searching && <><UserRowSkeleton /><UserRowSkeleton /><UserRowSkeleton /></>}

          {!searching && query.trim() && results.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-16 px-8 text-center">
              <p className="font-semibold mb-1">No results for &quot;{query}&quot;</p>
              <p className="text-sm" style={{ color: "var(--color-gray-1)" }}>Try a different name or username</p>
            </div>
          )}

          {!searching && results.map((user) => {
            const nickname = nicknames.get(user.id);
            return (
              <div key={user.id} className="flex items-center gap-3 px-5 py-3">
                <button onClick={() => router.push(`/profile/${user.id}`)} className="flex-shrink-0">
                  <Avatar name={user.full_name} src={user.avatar_url} size={44} online={user.is_online} />
                </button>
                <button onClick={() => router.push(`/profile/${user.id}`)} className="flex-1 min-w-0 text-left">
                  <div className="font-semibold text-sm truncate">{nickname || user.full_name}</div>
                  <div className="text-xs truncate" style={{ color: "var(--color-gray-1)" }}>
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

        <div className="md:hidden"><BottomNav /></div>
      </div>
    </div>
  );
}
