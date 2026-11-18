/**
 * store/chat-store.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Minimal global state for things genuinely needed across screens (which
 * chat is open, the signed-in user's own profile). Per-chat message state
 * deliberately does NOT live here — that's owned by hooks/useChat.ts +
 * lib/storage.ts so it stays scoped to whichever chat screen is mounted
 * and doesn't balloon a global store with every message in every chat.
 */

import { create } from "zustand";
import type { Profile, ChatListItem } from "@/types";

interface ChatStoreState {
  currentUser: Profile | null;
  setCurrentUser: (profile: Profile | null) => void;

  activeChatId: string | null;
  setActiveChatId: (chatId: string | null) => void;

  chatList: ChatListItem[];
  setChatList: (chats: ChatListItem[]) => void;
  upsertChatListItem: (item: ChatListItem) => void;

  /**
   * Pending thread search (v1.6.1) — transient only, never persisted.
   * The Chats screen's unified search sets this before navigating to
   * a thread, so the thread opens with its in-chat search already
   * running for that text and jumps to the match. The thread consumes
   * it on mount and clears it; any other navigation leaves it stale
   * and the thread clears it without acting on it.
   */
  pendingThreadSearch: { chatId: string; query: string } | null;
  setPendingThreadSearch: (pending: { chatId: string; query: string } | null) => void;

  unreadTotal: () => number;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  currentUser: null,
  setCurrentUser: (profile) => set({ currentUser: profile }),

  activeChatId: null,
  setActiveChatId: (chatId) => set({ activeChatId: chatId }),

  chatList: [],
  setChatList: (chats) => set({ chatList: chats }),
  upsertChatListItem: (item) =>
    set((state) => {
      const idx = state.chatList.findIndex((c) => c.chatId === item.chatId);
      if (idx === -1) return { chatList: [item, ...state.chatList] };
      const next = [...state.chatList];
      next[idx] = item;
      // Bump to top on new activity, like every real chat app does.
      next.splice(idx, 1);
      return { chatList: [item, ...next] };
    }),

  pendingThreadSearch: null,
  setPendingThreadSearch: (pending) => set({ pendingThreadSearch: pending }),

  unreadTotal: () => get().chatList.reduce((sum, c) => sum + c.unreadCount, 0),
}));
