# Sparks — Database Schema

> Source of truth: `supabase/migrations/0001_init_schema.sql` through
> `0006_align_v1_plaintext.sql`. Apply in order. This document mirrors those
> files; if they disagree, the migration files win.
>
> ✅ **Fixed by migration 0006** (`0006_align_v1_plaintext.sql`): the
> v1.1.0 audit found a fresh database built from 0001–0005 could not
> send/read messages, make calls, or show notifications. 0006 aligns
> the schema with the V1 plain-text client: it adds `messages.content`
> and makes `ciphertext`/`iv` nullable, replaces `send_message` with
> the signature the client actually calls, creates the missing
> `calls` and `notifications` tables (RLS included) plus a missed-call
> notification trigger, and defines `get_storage_usage()`. There is no
> known live Sparks Supabase project, so 0006 is written for a fresh
> database only — no data backfill.

## 1. Tables (0001–0006)

### `profiles` (0001)
One row per `auth.users` entry. `id` references `auth.users(id)`.

| Column | Notes |
|---|---|
| `id` uuid PK | references `auth.users`, on delete cascade |
| `username` text unique, 3–24 chars | lowercase unique index (`idx_profiles_username_lower`, 0004) |
| `full_name` text, 1–80 chars | |
| `avatar_url` text, nullable | Supabase Storage path |
| `bio` text ≤ 160 chars | |
| `public_key` text NOT NULL | ECDH public key (JWK). Reserved for future E2E; required by schema. No private key is stored or used in V1. |
| `is_online` boolean | presence |
| `last_seen_at` timestamptz | presence |
| `created_at`, `updated_at` | `updated_at` maintained by trigger |

Profile also carries settings columns (notification toggles
`notify_messages`, `notify_spark_requests`, `notify_spark_accepted`,
`notify_voice_calls`, `notify_video_calls`, `notify_groups`; privacy
`last_seen_visible`, `online_status_visible`, `read_receipts_enabled`,
`typing_indicator_enabled`, `profile_visibility`, `who_can_spark`;
appearance `theme_preference`, `font_size`, `bubble_size`) — see
`types/index.ts` for the full `Profile` type. Note: `notify_groups`
exists in the type but the toggle was removed from Settings in v1.1.0
because there are no groups; the column is unused.

### `chats` (0001)
| Column | Notes |
|---|---|
| `id` uuid PK | |
| `created_by` uuid → profiles | |
| `is_group` boolean, default false | `CHECK (is_group = false)` — 1-to-1 only, enforced in DB |
| `created_at`, `last_message_at` | |

### `chat_members` (0001)
PK `(chat_id, user_id)`. Columns: `joined_at`, `is_pinned`,
`is_muted`, `is_archived`, `last_read_at`.

### `blocked_users` (0001)
Blocker → blocked user pairs. Blocked users cannot message you.

### `messages` (0001, aligned by 0006)
| Column | Notes |
|---|---|
| `id` uuid PK | |
| `chat_id` → chats, `sender_id` → profiles | |
| `content` text, nullable | **Added by 0006.** V1 plain-text message body — this is what the client writes and reads. |
| `ciphertext` text, nullable | Kept from the old E2E design for a future E2E version; V1 rows store NULL here. Was NOT NULL before 0006, which is what broke V1 inserts. |
| `iv` text, nullable | Same as `ciphertext`: kept, NULL in V1. |
| `content_type` text | `text` / `image` / `file` / `voice` |
| `media_path` text, nullable | Supabase Storage object path |
| `reply_to_id` → messages, nullable | on delete set null |
| `edited_at`, `deleted_at` | soft delete → "This message was deleted" tombstone |
| `created_at` | |

Indexes: `(chat_id, created_at desc)`, `sender_id`.

### `message_receipts` (0001)
PK `(message_id, user_id)`. `status` in (`delivered`, `read`).

### `message_reactions` (0001)
PK `(message_id, user_id)` — one reaction per user per message.
`emoji` text ≤ 8 chars.

### `typing_status` (0001)
Ephemeral typing rows; stale after 10 s
(`cleanup_stale_typing_status`).

### `user_sessions` (0001, extended 0004)
Device sessions for "log out of all devices". 0004 adds device
metadata (refresh-token index).

### `message_rate_log` (0001)
One row per sent message, used by the server-side rate limit.
Pruned by `prune_rate_log`.

### `spark_requests` (0005)
| Column | Notes |
|---|---|
| `id` uuid PK | |
| `sender_id`, `receiver_id` → profiles | |
| `status` | `pending` / `accepted` / `declined` |
| `message` text, nullable | optional note with the request |
| `created_at`, `updated_at` | |

Indexes on `(receiver_id, status)` and `sender_id`.

### `calls` (0006)
| Column | Notes |
|---|---|
| `id` uuid PK | |
| `caller_id`, `callee_id` → profiles | `CHECK (caller_id <> callee_id)` — no self-calls |
| `call_type` | `voice` / `video` |
| `status` | `ringing` / `accepted` / `declined` / `missed` / `ended`, default `ringing` |
| `started_at` | default now |
| `answered_at`, `ended_at` | nullable; duration = `ended_at` − `answered_at` |

RLS: select/update only when `auth.uid()` is caller or callee;
insert only when `auth.uid() = caller_id`; no client delete policy.
Indexes on `(callee_id, status)` and `caller_id`. `REPLICA IDENTITY
FULL` + added to the `supabase_realtime` publication (same pattern as
`0005` did for `spark_requests`) so the `postgres_changes`
subscriptions in `services/call-service.ts` receive full rows.

### `notifications` (0006)
| Column | Notes |
|---|---|
| `id` uuid PK | |
| `user_id` → profiles | the notification's owner |
| `type` | `message` / `spark_request` / `spark_accepted` / `mention` (matches `NotificationType` in `types/index.ts`; there is no call-specific type, so missed calls use `message`) |
| `title` text | e.g. "Missed call" |
| `body` text, nullable | e.g. "Missed voice call from Ada" |
| `related_chat_id` → chats, nullable | on delete set null |
| `related_user_id` → profiles, nullable | on delete set null |
| `is_read` boolean, default false | |
| `created_at` | |

RLS: owner-only select/update/delete. **No client INSERT policy** —
notifications are created server-side only (see the missed-call
trigger below). Index on `(user_id, created_at desc)`.

## 2. RLS — approach

- RLS is enabled on every table created by the migrations
  (`0002_rls_policies.sql`, `0005` for `spark_requests`, `0006` for
  `calls` and `notifications`).
- Default-deny: every policy is explicit. The pattern is
  "you can only see / change rows for chats you are a member of, or
  rows that are yours".
- Helpers: `is_chat_member(p_chat_id)` and `is_blocked_by(p_user_id)`.
- Key policies: profiles readable by authenticated users, writable only
  by self; messages selectable only by chat members, insert only as
  self and as a member; receipts/reactions/typing writable only by self;
  sessions and rate log visible only to their owner.
- Storage buckets have their own policies in 0002 (select for chat
  members, insert for chat members, delete only your own upload).

## 3. Triggers and functions

| Object | Purpose |
|---|---|
| `enforce_max_two_members()` + trigger (0001) | a chat can never gain a 3rd member |
| `set_updated_at()` + trigger (0001) | maintains `profiles.updated_at` (also used by `spark_requests`, 0005) |
| `create_direct_chat(p_other_user_id)` (0003, replaced 0005) | creates a 1-to-1 chat, or returns the existing one; requires an accepted Spark |
| `can_send_message(p_limit default 25)` (0003) | server-side rate-limit check |
| `send_message(p_chat_id, p_content, p_content_type default 'text', p_media_path default null, p_reply_to_id default null)` (0003, replaced by 0006) | membership + rate-limit check, insert message, log rate, bump `last_message_at`. 0006 dropped the old `(p_ciphertext, p_iv, …)` signature and recreated it with `p_content` to match what the client sends. Inserts `content`, `ciphertext` NULL, `iv` NULL. |
| `cleanup_stale_typing_status()` (0003) | backstop for dropped typing rows |
| `prune_rate_log()` (0003) | prunes old rate-log rows |
| `is_username_available(p_username)` (0004) | username availability check |
| `email_for_username(p_username)` (0004) | login with @username |
| `cleanup_failed_signup(p_email)` (0004) | removes a half-created account after a failed signup step |
| `has_accepted_spark(p_other_user_id)` (0005) | whether a Spark was accepted between two users |
| `send_spark_request(...)` (0005) | sends a Spark Request (guards: not self, not blocked, no duplicate pending) |
| `respond_to_spark_request(...)` (0005) | accept/decline; on accept, creates the direct chat |
| `get_storage_usage()` (0006) | storage breakdown for Settings → Storage and Data. SECURITY DEFINER; sums `storage.objects` metadata `size` for the caller's own files in bucket `chat-media`, split by mimetype (`image/*` → images, `audio/*` → voice, else files). Returns one row `{ images_bytes, files_bytes, voice_bytes, total_bytes }`. Approximation, documented in the migration: media others sent you is owned by the sender, so it is not counted. |
| `notify_missed_call()` + trigger `trg_notify_missed_call` (0006) | on a `calls` status change into `missed`, inserts a notification for the callee ("Missed call", type `message`). Fires only on the transition into `missed`, so re-marking never duplicates. No other notification trigger exists yet — message and Spark-request notifications are still unwritten (see `TESTING_STRATEGY.md` §4). |
