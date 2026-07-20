/**
 * types/index.ts
 */

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  last_seen_visible: boolean;
  online_status_visible: boolean;
  read_receipts_enabled: boolean;
  typing_indicator_enabled: boolean;
  profile_visibility: "everyone" | "sparks_only" | "nobody";
  who_can_spark: "everyone" | "nobody";
  notify_messages: boolean;
  notify_spark_requests: boolean;
  notify_spark_accepted: boolean;
  notify_voice_calls: boolean;
  notify_video_calls: boolean;
  notify_groups: boolean;
  theme_preference: "light" | "dark";
  font_size: "small" | "medium" | "large";
  bubble_size: "compact" | "standard" | "large";
  is_premium: boolean;
  is_verified: boolean;
  public_key: string;
  spark_count: number;
  username_updated_at: string | null;
  full_name_updated_at: string | null;
  is_online: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  created_by: string;
  is_group: boolean;
  is_self_chat: boolean;
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

export interface QueuedMessage {
  client_id: string;
  chat_id: string;
  plaintext: string;
  reply_to_id: string | null;
  created_at: string;
  attempts: number;
  status: "queued" | "sending" | "failed";
}

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
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  isOnline: boolean;
}

export interface UserSession {
  id: string;
  user_id: string;
  device_label: string;
  refresh_token_id: string;
  created_at: string;
  last_active_at: string;
  revoked_at: string | null;
  browser: string | null;
  os_name: string | null;
  device_type: "mobile" | "tablet" | "desktop" | "unknown" | null;
  ip_address: string | null;
  location_city: string | null;
  location_country: string | null;
  user_agent: string | null;
}

export interface DeviceSessionItem extends UserSession {
  isCurrent: boolean;
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

// ─── Spark Requests ──────────────────────────────────────────────────────────

export type SparkRequestStatus = "pending" | "accepted" | "declined";

export interface SparkRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: SparkRequestStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SparkRequestWithProfile extends SparkRequest {
  profile: Profile;
  direction: "incoming" | "outgoing";
}

// ─── Database type ────────────────────────────────────────────────────────────

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
      spark_requests: { Row: SparkRequest; Insert: Partial<SparkRequest>; Update: Partial<SparkRequest>; Relationships: [] };
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
      is_username_available: { Args: { p_username: string }; Returns: boolean };
      cleanup_failed_signup: { Args: { p_email: string }; Returns: void };
      email_for_username: { Args: { p_username: string }; Returns: string | null };
      has_accepted_spark: { Args: { p_other_user_id: string }; Returns: boolean };
      send_spark_request: { Args: { p_receiver_id: string; p_message?: string | null }; Returns: SparkRequest };
      respond_to_spark_request: { Args: { p_request_id: string; p_accept: boolean }; Returns: string | null };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ─── Notifications ────────────────────────────────────────────────────────

export type NotificationType = "message" | "spark_request" | "spark_accepted" | "mention";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  related_chat_id: string | null;
  related_user_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── Contact Nicknames ────────────────────────────────────────────────────

export interface ContactNickname {
  owner_id: string;
  contact_id: string;
  nickname: string;
  created_at: string;
  updated_at: string;
}
