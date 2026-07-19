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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("create_direct_chat", {
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
  type MembershipRow = Pick<ChatMember, "chat_id" | "is_pinned" | "is_muted" | "is_archived" | "last_read_at">;
  type ChatRow = Pick<Chat, "id" | "created_by" | "is_group" | "is_self_chat" | "created_at" | "last_message_at">;
  type OtherMemberRow = Pick<ChatMember, "chat_id" | "user_id">;

  // IMPORTANT: chat_members' SELECT RLS policy uses is_chat_member(chat_id),
  // which permits reading ANY member row for a chat you belong to (needed
  // for group chat membership lists elsewhere). Without this explicit
  // .eq("user_id", userId) filter, this query would return every member's
  // row for every chat you're in — e.g. 2 rows per 1:1 chat — causing each
  // chat to render twice in the list. This filter is the actual
  // "only my memberships" scope; RLS alone does not provide it here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membershipsQuery = await (supabase.from("chat_members") as any)
    .select("chat_id, is_pinned, is_muted, is_archived, last_read_at")
    .eq("user_id", userId);

  if (membershipsQuery.error) throw membershipsQuery.error;
  const memberships = membershipsQuery.data as MembershipRow[] | null;
  if (!memberships?.length) return [];

  const chatIds = memberships.map((m) => m.chat_id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatsQuery = await (supabase.from("chats") as any)
    .select("id, created_by, is_group, is_self_chat, created_at, last_message_at")
    .in("id", chatIds);

  if (chatsQuery.error) throw chatsQuery.error;
  const chats = chatsQuery.data as ChatRow[] | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastMessagesQuery = await (supabase.from("messages") as any)
    .select("chat_id, content, content_type, deleted_at, created_at")
    .in("chat_id", chatIds)
    .order("created_at", { ascending: false });

  const lastMessageByChatId = new Map<string, { content: string; content_type: string; deleted_at: string | null }>();
  (lastMessagesQuery.data ?? []).forEach((row: { chat_id: string; content: string; content_type: string; deleted_at: string | null }) => {
    if (!lastMessageByChatId.has(row.chat_id)) lastMessageByChatId.set(row.chat_id, row);
  });


  const chatById = new Map<string, ChatRow>();
  chats?.forEach((c) => chatById.set(c.id, c));

  // Fetch the *other* participant for each 1:1 chat in one query.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const otherMembersQuery = await (supabase.from("chat_members") as any)
    .select("chat_id, user_id")
    .in("chat_id", chatIds)
    .neq("user_id", userId);

  if (otherMembersQuery.error) throw otherMembersQuery.error;
  const otherMembers = otherMembersQuery.data as OtherMemberRow[] | null;

  const otherUserIdByChatId = new Map<string, string>();
  otherMembers?.forEach((row) => otherUserIdByChatId.set(row.chat_id, row.user_id));

  const otherUserIds = [...new Set([...(otherMembers?.map((r) => r.user_id) ?? []), userId])];

  const profilesQuery = otherUserIds.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? await (supabase.from("profiles") as any).select("*").in("id", otherUserIds)
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
      const chatForSelf = chatById.get(m.chat_id);
      const otherUser = chatForSelf?.is_self_chat ? profileById.get(userId) : otherByChatId.get(m.chat_id);
      const chat = chatById.get(m.chat_id);
      if (!otherUser || !chat) return null;
      return {
        chatId: m.chat_id,
        otherUser,
        lastMessagePreview: (() => {
          const lm = lastMessageByChatId.get(m.chat_id);
          if (!lm) return "";
          if (lm.deleted_at) return "This message was deleted";
          if (lm.content_type === "image") return "\ud83d\udcf7 Photo";
          if (lm.content_type === "voice") return "\ud83c\udfa4 Voice message";
          if (lm.content_type === "file") return "\ud83d\udcce File";
          return lm.content ?? "";
        })(),
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
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
}

export async function setChatPinned(chatId: string, userId: string, pinned: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("chat_members") as any)
    .update({ is_pinned: pinned })
    .eq("chat_id", chatId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setChatMuted(chatId: string, userId: string, muted: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("chat_members") as any)
    .update({ is_muted: muted })
    .eq("chat_id", chatId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setChatArchived(chatId: string, userId: string, archived: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("chat_members") as any)
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("blocked_users") as any).insert({
    blocker_id: user.id,
    blocked_id: blockedId,
  });
  if (error) throw error;
}

export async function unblockUser(blockedId: string) {
  const { error } = await supabase.from("blocked_users").delete().eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function searchUsers(query: string): Promise<Profile[]> {
  if (!query.trim()) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("profiles") as any)
    .select("*")
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(20);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function updateOwnProfile(userId: string, patch: Partial<Profile>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("profiles") as any).update(patch).eq("id", userId);
  if (error) throw error;
}

/**
 * Uploads a new avatar image to the public `avatars` bucket under the
 * user's own folder (required by the bucket's RLS policies), then updates
 * profiles.avatar_url to point at it. Returns the new public URL.
 */
export async function uploadAvatar(userId: string, file: File | Blob): Promise<string> {
  const ext = "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`; // cache-bust so the new photo shows immediately

  await updateOwnProfile(userId, { avatar_url: publicUrl });

  return publicUrl;
}

/** Counts how many accepted Spark connections a user has. */
export async function getSparkConnectionsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("spark_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error) return 0;
  return count ?? 0;
}

/** Marks every unread message from the other participant in a chat as read. */
export async function markChatRead(chatId: string, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("messages") as any)
    .select("id")
    .eq("chat_id", chatId)
    .neq("sender_id", userId);

  const messageIds = (data ?? []).map((m: { id: string }) => m.id);
  if (!messageIds.length) return;

  const rows = messageIds.map((id: string) => ({ message_id: id, user_id: userId, status: "read" as const }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("message_receipts") as any).upsert(rows, { onConflict: "message_id,user_id" });
}

/** Returns the current user's private nickname for a contact, or null if unset. */
export async function getNickname(contactId: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("contact_nicknames") as any)
    .select("nickname")
    .eq("owner_id", user.id)
    .eq("contact_id", contactId)
    .maybeSingle();
  return data?.nickname ?? null;
}

/** Sets (or clears, if nickname is empty) a private nickname for a contact. */
export async function setNickname(contactId: string, nickname: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const trimmed = nickname.trim();

  if (!trimmed) {
    await supabase.from("contact_nicknames").delete().eq("owner_id", user.id).eq("contact_id", contactId);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("contact_nicknames") as any).upsert(
    { owner_id: user.id, contact_id: contactId, nickname: trimmed, updated_at: new Date().toISOString() },
    { onConflict: "owner_id,contact_id" }
  );
}

/** Bulk-fetches nicknames for a list of contact ids, e.g. for search results. */
export async function getNicknamesMap(contactIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!contactIds.length) return map;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return map;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("contact_nicknames") as any)
    .select("contact_id, nickname")
    .eq("owner_id", user.id)
    .in("contact_id", contactIds);

  (data ?? []).forEach((row: { contact_id: string; nickname: string }) => map.set(row.contact_id, row.nickname));
  return map;
}

/** Lists profiles the current user has blocked. */
export async function getBlockedUsers(): Promise<Profile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: blocks } = await (supabase.from("blocked_users") as any)
    .select("blocked_id")
    .eq("blocker_id", user.id);

  const blockedIds = (blocks ?? []).map((b: { blocked_id: string }) => b.blocked_id);
  if (!blockedIds.length) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase.from("profiles") as any)
    .select("*")
    .in("id", blockedIds);

  return (profiles ?? []) as Profile[];
}
