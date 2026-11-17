"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { StatusBar } from "@/components/layout/StatusBar";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
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
      <div className="frosted-header px-4 pt-2 pb-3">
        <h2 className="text-title font-bold text-center mb-4">New Chat</h2>
        <div className="glass-input flex items-center gap-2 rounded-full px-4 py-2">
          <SearchGlyph />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users"
            className="flex-1 outline-none text-body bg-transparent"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {results.length > 0 && (
          <div className="px-4 py-2">
            <span className="text-caption font-semibold uppercase tracking-wider" style={{ color: "var(--color-gray-1)" }}>Results</span>
          </div>
        )}
        {results.map((u) => (
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
        {query && results.length === 0 && (
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
    </ScreenContainer>
  );
}

function SearchGlyph() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gray-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
}
function CheckGlyph() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
