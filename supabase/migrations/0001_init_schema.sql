-- ============================================================================
-- Sparks — Initial Schema
-- All message content columns store CIPHERTEXT ONLY. Encryption/decryption
-- happens exclusively on the client via Web Crypto API (AES-256-GCM).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- One row per auth.users entry. Public-readable subset is controlled via RLS,
-- not via a separate view, to keep this MVP simple.
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null check (char_length(username) between 3 and 24),
  full_name       text not null check (char_length(full_name) between 1 and 80),
  avatar_url      text,
  bio             text check (char_length(bio) <= 160),
  public_key      text not null, -- client-generated ECDH public key (JWK string), used by peers to derive shared AES key
  is_online       boolean not null default false,
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_profiles_username on public.profiles (username);

-- ─── Chats ───────────────────────────────────────────────────────────────────
-- MVP scope: 1-to-1 chats only. `chat_members` is still used (rather than two
-- FK columns on `chats`) so the RLS membership-check pattern is uniform and
-- ready to extend to groups later without a schema rewrite.
create table public.chats (
  id              uuid primary key default gen_random_uuid(),
  created_by      uuid not null references public.profiles(id) on delete cascade,
  is_group        boolean not null default false check (is_group = false), -- MVP: enforce 1-to-1 only
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.chat_members (
  chat_id         uuid not null references public.chats(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  is_pinned       boolean not null default false,
  is_muted        boolean not null default false,
  is_archived     boolean not null default false,
  last_read_at    timestamptz not null default now(),
  primary key (chat_id, user_id)
);

create index idx_chat_members_user on public.chat_members (user_id);

-- Enforce exactly 2 members per chat at the application layer (services/chat-service.ts).
-- A DB-level trigger backstop:
create or replace function public.enforce_max_two_members()
returns trigger as $$
begin
  if (select count(*) from public.chat_members where chat_id = new.chat_id) >= 2 then
    raise exception 'Chat already has the maximum of 2 members (MVP is 1-to-1 only)';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_enforce_max_two_members
  before insert on public.chat_members
  for each row execute function public.enforce_max_two_members();

-- ─── Blocks ──────────────────────────────────────────────────────────────────
create table public.blocked_users (
  blocker_id      uuid not null references public.profiles(id) on delete cascade,
  blocked_id      uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ─── Messages ────────────────────────────────────────────────────────────────
-- `ciphertext` and `iv` are base64-encoded strings produced by lib/crypto.ts.
-- The server NEVER sees plaintext. `content_type` lets the client render
-- without needing to decrypt first for non-text previews (media thumbnails etc).
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  chat_id         uuid not null references public.chats(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  ciphertext      text not null,
  iv              text not null, -- base64 nonce/IV used for this message's AES-GCM operation
  content_type    text not null default 'text' check (content_type in ('text','image','file','voice')),
  media_path      text, -- Supabase Storage object path, if content_type != 'text' (object itself is also encrypted client-side before upload)
  reply_to_id     uuid references public.messages(id) on delete set null,
  edited_at       timestamptz,
  deleted_at      timestamptz, -- soft delete: row retained for "message deleted" tombstone UI, ciphertext wiped via separate update
  created_at      timestamptz not null default now()
);

create index idx_messages_chat_created on public.messages (chat_id, created_at desc);
create index idx_messages_sender on public.messages (sender_id);

create table public.message_receipts (
  message_id      uuid not null references public.messages(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  status          text not null check (status in ('delivered','read')),
  updated_at      timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table public.message_reactions (
  message_id      uuid not null references public.messages(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  emoji           text not null check (char_length(emoji) <= 8),
  created_at      timestamptz not null default now(),
  primary key (message_id, user_id) -- one reaction per user per message (MVP)
);

-- ─── Typing indicators ───────────────────────────────────────────────────────
-- Ephemeral by design — short TTL enforced by client clearing rows it created
-- and a periodic cleanup (see 0003_cron_cleanup.sql).
create table public.typing_status (
  chat_id         uuid not null references public.chats(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  started_at      timestamptz not null default now(),
  primary key (chat_id, user_id)
);

-- ─── Sessions (for "log out of all devices") ────────────────────────────────
-- Supabase Auth manages tokens itself; this table is an app-level registry so
-- "log out everywhere" has something deterministic to revoke against.
create table public.user_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  device_label    text not null default 'Unknown device',
  refresh_token_id text not null, -- references the Supabase session's token identifier
  created_at      timestamptz not null default now(),
  last_active_at  timestamptz not null default now(),
  revoked_at      timestamptz
);

create index idx_user_sessions_user on public.user_sessions (user_id) where revoked_at is null;

-- ─── Rate limiting ledger (server-side enforcement backstop) ────────────────
-- Client throttles optimistically (lib/rateLimit.ts); this table is the
-- source of truth a Postgres function checks before allowing an insert.
create table public.message_rate_log (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  sent_at         timestamptz not null default now()
);

create index idx_rate_log_user_time on public.message_rate_log (user_id, sent_at desc);

-- ─── updated_at triggers ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
