/**
 * services/chat-service.ts
 * ─────────────────────────────────────────────────────────────────────────
 * All Supabase calls related to chats themselves (not message content).
 * Every read here is naturally scoped by RLS — these functions don't need
 * to add their own "where user_id = me" filters for security, only for
 * correctness/performance, because the database refuses to return rows
 * the caller isn't a member of regardless of what's queried.
 */

import { createClient } from "@/lib/supabase";
import type { Chat, ChatMember, ChatListItem, Profile } from "@/types";

const supabase = createClient();

/**
 * Starts (or reuses) a 1-to-1 chat with another user. Delegates to the
 * create_direct_chat() RPC rather than inserting rows directly, because
 * chat_members RLS only allows inserting your own membership row — adding
 * the other person's row requires the security-definer function.
 */
export async function startDirectChat(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_direct_chat", {
    p_other_user_id: otherUserId,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Fetches the current user's chat list with enough joined data to render
 * the chat list screen: the other participant's profile, and unread count.
 * Message preview text is intentionally NOT fetched/decrypted here — the
 * caller (hooks/useChat.ts) decrypts the latest message separately, since
 * that requires the shared AES key and shouldn't block this list query.
 */
export async function fetchChatList(userId: string): Promise<ChatListItem[]> {
  // Three plain single-table queries instead of nested joins, with
  // explicit type assertions on each result rather than relying on
  // Supabase's generic inference against the hand-written Database type.
  // That inference has shown inconsistent behavior across build
  // environments for partial-column .select() calls — asserting the known
  // real shape is more reliable than depending on it end-to-end.
  type MembershipRow = Pick<ChatMember, "chat_id" | "is_pinned" | "is_muted" | "is_archived" | "last_read_at">;
  type ChatRow = Pick<Chat, "id" | "created_by" | "is_group" | "created_at" | "last_message_at">;
  type OtherMemberRow = Pick<ChatMember, "chat_id" | "user_id">;

  const membershipsQuery = await supabase
    .from("chat_members")
    .select("chat_id, is_pinned, is_muted, is_archived, last_read_at");

  if (membershipsQuery.error) throw membershipsQuery.error;
  const memberships = membershipsQuery.data as MembershipRow[] | null;
  if (!memberships?.length) return [];

  const chatIds = memberships.map((m) => m.chat_id);

  const chatsQuery = await supabase
    .from("chats")
    .select("id, created_by, is_group, created_at, last_message_at")
    .in("id", chatIds);

  if (chatsQuery.error) throw chatsQuery.error;
  const chats = chatsQuery.data as ChatRow[] | null;

  const chatById = new Map<string, ChatRow>();
  chats?.forEach((c) => chatById.set(c.id, c));

  // Fetch the *other* participant for each 1:1 chat in one query.
  const otherMembersQuery = await supabase
    .from("chat_members")
    .select("chat_id, user_id")
    .in("chat_id", chatIds)
    .neq("user_id", userId);

  if (otherMembersQuery.error) throw otherMembersQuery.error;
  const otherMembers = otherMembersQuery.data as OtherMemberRow[] | null;

  const otherUserIdByChatId = new Map<string, string>();
  otherMembers?.forEach((row) => otherUserIdByChatId.set(row.chat_id, row.user_id));

  const otherUserIds = [...new Set(otherMembers?.map((r) => r.user_id) ?? [])];

  const profilesQuery = otherUserIds.length
    ? await supabase.from("profiles").select("*").in("id", otherUserIds)
    : { data: [] as Profile[], error: null };

  if (profilesQuery.error) throw profilesQuery.error;
  const profiles = profilesQuery.data as Profile[] | null;

  const profileById = new Map<string, Profile>();
  profiles?.forEach((p) => profileById.set(p.id, p));

  const otherByChatId = new Map<string, Profile>();
  otherUserIdByChatId.forEach((otherUserId, chatId) => {
    const profile = profileById.get(otherUserId);
    if (profile) otherByChatId.set(chatId, profile);
  });

  return memberships
    .map((m) => {
      const otherUser = otherByChatId.get(m.chat_id);
      const chat = chatById.get(m.chat_id);
      if (!otherUser || !chat) return null;
      return {
        chatId: m.chat_id,
        otherUser,
        lastMessagePreview: "", // filled in by the caller after decryption
        lastMessageAt: chat.last_message_at,
        unreadCount: 0, // computed by the caller from message_receipts
        isPinned: m.is_pinned,
        isMuted: m.is_muted,
        isArchived: m.is_archived,
        isOnline: otherUser.is_online,
      } satisfies ChatListItem;
    })
    .filter((c): c is ChatListItem => c !== null)
    .sort((a, b) => {
      // Most recent activity first — restores the ordering the original
      // .order("chats(last_message_at)") join clause provided, now done
      // client-side since that field lives on the joined `chats` row.
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
}

export async function setChatPinned(chatId: string, userId: string, pinned: boolean) {
  const { error } = await supabase
    .from("chat_members")
    .update({ is_pinned: pinned })
    .eq("chat_id", chatId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setChatMuted(chatId: string, userId: string, muted: boolean) {
  const { error } = await supabase
    .from("chat_members")
    .update({ is_muted: muted })
    .eq("chat_id", chatId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setChatArchived(chatId: string, userId: string, archived: boolean) {
  const { error } = await supabase
    .from("chat_members")
    .update({ is_archived: archived })
    .eq("chat_id", chatId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Leaves/deletes a chat for the current user only (their membership row). */
export async function deleteChatForSelf(chatId: string, userId: string) {
  const { error } = await supabase
    .from("chat_members")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function blockUser(blockedId: string) {
  const { error } = await supabase.from("blocked_users").insert({ blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(blockedId: string) {
  const { error } = await supabase.from("blocked_users").delete().eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function searchUsers(query: string): Promise<Profile[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(20);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function updateOwnProfile(userId: string, patch: Partial<Profile>) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}
