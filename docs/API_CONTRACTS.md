# Sparks — API Contracts

> The services layer is the only layer that talks to Supabase. Components
> and hooks call services; they never query the database directly (the
> documented exceptions are `CallProvider`, which reads a caller profile,
> and a few pages that read their own profile row).

## 1. Services

| Service | Responsibility |
|---|---|
| `auth-service.ts` | sign up / sign in (email or username) / password reset / resend verification / fetch own profile. Generates the signup public key (see `SECURITY_MODEL.md`). |
| `chat-service.ts` | chat list, create/fetch a chat, pin / mute / archive, mark read, delete for self, block user, update own profile, search users. |
| `message-service.ts` | send / edit / delete message, mark read, receipts. Calls the `send_message` RPC. Plain text in V1. |
| `media-service.ts` | send image / file / voice-note messages via Supabase Storage (≤ 25 MB). |
| `call-service.ts` | call rows (initiate / accept / decline / miss / end), call history, incoming-call + status subscriptions, WebRTC signaling (broadcast). |
| `notification-service.ts` | fetch / mark read / delete / clear notifications, unread count. |
| `spark-service.ts` | send / accept / decline Spark Requests, incoming + outgoing lists. |
| `account-service.ts` | account actions (export data, delete account) — check the file for the current list. |
| `session-service.ts` | device sessions: list, revoke one, revoke all. |

## 2. Supabase RPCs (defined in `supabase/migrations/`)

| Function | Args | Returns / does |
|---|---|---|
| `is_username_available(p_username)` | text | boolean |
| `email_for_username(p_username)` | text | email for @username login |
| `cleanup_failed_signup(p_email)` | text | removes a half-created account |
| `create_direct_chat(p_other_user_id)` | uuid | chat id; returns existing 1-to-1 chat if any; requires accepted Spark |
| `can_send_message(p_limit = 25)` | int | boolean — server-side rate-limit check |
| `send_message(p_chat_id, p_ciphertext, p_iv, p_content_type, p_media_path, p_reply_to_id)` | — | message id. ⚠️ The client currently calls this RPC with `p_content` instead of `p_ciphertext`/`p_iv` — see `TESTING_STRATEGY.md`. Verify against the live database. |
| `cleanup_stale_typing_status()` | — | removes typing rows older than 10 s |
| `prune_rate_log()` | — | prunes old `message_rate_log` rows |
| `has_accepted_spark(p_other_user_id)` | uuid | boolean |
| `send_spark_request(p_receiver_id, p_message)` | — | creates a pending Spark Request |
| `respond_to_spark_request(p_request_id, p_accept)` | — | accept → creates the direct chat; decline → closes the request |
| `get_storage_usage()` | — | `{ images_bytes, files_bytes, voice_bytes, total_bytes }` for Settings → Storage |

## 3. Realtime channels

| Channel | Type | Payload |
|---|---|---|
| `incoming-calls:<userId>` | `postgres_changes` INSERT on `calls` where `callee_id = userId` and `status = ringing` | `CallRow` |
| `call-status:<callId>` | `postgres_changes` UPDATE on `calls` where `id = callId` | updated `CallRow` |
| `call-signal:<callId>` | broadcast, `self: false` | see §4 |
| `bottomnav-notif-badge` / `notif-badge` / `desktop-rail-notif-badge` | `postgres_changes` any event on `notifications` | refetch unread count |
| chat thread subscriptions (`useRealtime`) | `postgres_changes` | new messages, typing rows, presence, receipts |

## 4. WebRTC signaling messages (`call-signal:<callId>` broadcast)

| Event | Payload | Direction |
|---|---|---|
| `ready` | `{}` | callee → caller (after accepting; triggers the offer) |
| `offer` | `{ sdp: RTCSessionDescriptionInit }` | caller → callee |
| `answer` | `{ sdp: RTCSessionDescriptionInit }` | callee → caller |
| `ice-candidate` | `{ candidate: RTCIceCandidateInit }` | both ways |
| `hangup` | `{}` | either side → other side |

Signaling is ephemeral broadcast only — it is never written to a table.
Media flows peer-to-peer after negotiation and never touches Supabase.

## 5. Types

- `CallRow`: `{ id, caller_id, callee_id, call_type: "voice" | "video",
  status: "ringing" | "accepted" | "declined" | "missed" | "ended",
  started_at, answered_at: string | null, ended_at: string | null }`.
- `CallHistoryItem extends CallRow`: adds `otherUserId`,
  `otherUserName`, `otherUserAvatar: string | null`, `isOutgoing`.
- `CallPhase` (client state machine): `idle` → `outgoing-ringing` →
  `connecting` → `active` → `ended`; or `idle` → `incoming-ringing` →
  `connecting` → `active` → `ended`.
- `DecryptedMessage` (name is historical — V1 messages are plain text):
  `{ id, chat_id, sender_id, text, content_type, reply_to_id,
  edited_at, deleted_at, created_at, status }`.

## 6. Environment variables (names only — never values)

See `DEPLOYMENT_GUIDE.md` for the full list. Client-side code only
ever reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
(plus optional `NEXT_PUBLIC_TURN_*` for calls). The service-role key
must never be in client code.
