/**
 * types/index.ts
 * Application-level types. `Database` mirrors the Supabase schema for
 * typed query results; generate this automatically in real usage with:
 *   npx supabase gen types typescript --project-id <ref> > types/database.ts
 * The hand-written version below is kept in sync with the SQL migrations
 * for readability in this deliverable.
 */

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  public_key: string; // JSON-stringified JWK
  is_online: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  created_by: string;
  is_group: boolean;
  created_at: string;
  last_message_at: string;
}

export interface ChatMember {
  chat_id: string;
  user_id: string;
  joined_at: string;
  is_pinned: boolean;
  is_muted: boolean;
  is_archived: boolean;
  last_read_at: string;
}

/** Row shape as stored/transmitted — ciphertext only. */
export interface EncryptedMessageRow {
  id: string;
  chat_id: string;
  sender_id: string;
  ciphertext: string;
  iv: string;
  content_type: "text" | "image" | "file" | "voice";
  media_path: string | null;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

/**
 * Shape used in the UI after client-side decryption, and what's persisted
 * in the IndexedDB cache (lib/storage.ts). Uses snake_case to match the
 * server row shape 1:1 — this is the row that gets cached locally, so
 * keeping field names identical to EncryptedMessageRow (minus ciphertext,
 * plus `text`/`status`) avoids a remapping step on every cache write.
 */
export interface DecryptedMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  content_type: "text" | "image" | "file" | "voice";
  media_url?: string;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  status: MessageStatus;
}

/** An item in the offline send queue — not yet confirmed by the server. */
export interface QueuedMessage {
  client_id: string;     // locally-generated uuid; reconciled with the real id on send
  chat_id: string;
  plaintext: string;
  reply_to_id: string | null;
  created_at: string;
  attempts: number;
  status: "queued" | "sending" | "failed";
}

/** Tracks per-chat last-synced time, so reconnect sync only fetches deltas. */
export interface CachedChatMeta {
  chat_id: string;
  last_synced_at: string;
}

export type ReceiptStatus = "sent" | "delivered" | "read";

export interface MessageReceipt {
  message_id: string;
  user_id: string;
  status: "delivered" | "read";
  updated_at: string;
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ChatListItem {
  chatId: string;
  otherUser: Profile;
  lastMessagePreview: string; // decrypted client-side; "Encrypted message" while decrypting
  lastMessageAt: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  isOnline: boolean;
}

/**
 * App-level session registry, separate from what Supabase Auth tracks
 * internally — gives "log out of all devices" something deterministic to
 * revoke against. See supabase/migrations/0001_init_schema.sql.
 */
export interface UserSession {
  id: string;
  user_id: string;
  device_label: string;
  refresh_token_id: string;
  created_at: string;
  last_active_at: string;
  revoked_at: string | null;
}

export interface BlockedUser {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface TypingStatus {
  chat_id: string;
  user_id: string;
  started_at: string;
}

/**
 * Minimal Supabase Database type for createClient<Database>() typing.
 * In production, replace with `supabase gen types typescript` output.
 *
 * IMPORTANT: every key below (Tables, Views, Functions, Enums,
 * CompositeTypes) must be present, and every table needs a `Relationships`
 * array (empty is fine), even if unused — @supabase/supabase-js's generic
 * constraints pattern-match against this exact shape. Omitting any of
 * these keys doesn't just fail loudly on the missing piece; it can make
 * the query builder's type inference silently collapse to `never` on
 * otherwise-unrelated `.select()` calls elsewhere in the codebase, which
 * is exactly the bug this fixes.
 */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile>; Relationships: [] };
      chats: { Row: Chat; Insert: Partial<Chat>; Update: Partial<Chat>; Relationships: [] };
      chat_members: { Row: ChatMember; Insert: Partial<ChatMember>; Update: Partial<ChatMember>; Relationships: [] };
      messages: { Row: EncryptedMessageRow; Insert: Partial<EncryptedMessageRow>; Update: Partial<EncryptedMessageRow>; Relationships: [] };
      message_receipts: { Row: MessageReceipt; Insert: Partial<MessageReceipt>; Update: Partial<MessageReceipt>; Relationships: [] };
      message_reactions: { Row: MessageReaction; Insert: Partial<MessageReaction>; Update: Partial<MessageReaction>; Relationships: [] };
      user_sessions: { Row: UserSession; Insert: Partial<UserSession>; Update: Partial<UserSession>; Relationships: [] };
      blocked_users: { Row: BlockedUser; Insert: Partial<BlockedUser>; Update: Partial<BlockedUser>; Relationships: [] };
      typing_status: { Row: TypingStatus; Insert: Partial<TypingStatus>; Update: Partial<TypingStatus>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      create_direct_chat: { Args: { p_other_user_id: string }; Returns: string };
      send_message: {
        Args: {
          p_chat_id: string;
          p_ciphertext: string;
          p_iv: string;
          p_content_type?: string;
          p_media_path?: string | null;
          p_reply_to_id?: string | null;
        };
        Returns: string;
      };
      can_send_message: { Args: { p_limit?: number }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
