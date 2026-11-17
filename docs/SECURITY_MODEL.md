# Sparks — Security Model

> Version 1.1.0. This document states what is protected, how, and —
> just as importantly — what is **not** protected. It corrects older
> claims in this repo that described end-to-end encryption as live.
> It was not.

## 1. Honest summary

| Claim | Truth in V1 |
|---|---|
| Messages are end-to-end encrypted | ❌ **False.** Messages are plain text in the database. |
| Messages are protected in transit | ✅ HTTPS/TLS. |
| Messages are protected at rest | ✅ Supabase server-side encryption at rest. |
| Only chat members can read a chat | ✅ Enforced by RLS (see §3). |
| Only you can change your own data | ✅ RLS: self-only writes for profiles, receipts, reactions, sessions. |
| Calls are encrypted | ✅ WebRTC media is encrypted by WebRTC itself (DTLS/SRTP), peer to peer. |
| Rate limiting | ✅ Client throttle + server-side check in `send_message`. |
| The app has been pen-tested / audited | ❌ **No.** Never deployed or audited. Get a real review before real users. |

## 2. What protects messages in V1

1. **Supabase Auth** — email/password, email OTP, Google OAuth.
   Sessions are validated server-side; the client never decides who
   somebody is.
2. **Row Level Security** — every table has RLS enabled with
   default-deny policies. A user can only select messages for chats
   they are a member of, and can only insert as themselves.
3. **Membership checks in RPCs** — `send_message` and
   `create_direct_chat` re-check membership inside the database
   (`SECURITY DEFINER` functions), so a tampered client cannot bypass
   the check by calling the API directly.
4. **IDOR safety** — object references (chat IDs, message IDs, user
   IDs) are always re-checked against membership/ownership in RLS or
   in the RPC. A user cannot read or change another user's rows by
   guessing an ID.
5. **HTTPS/TLS in transit, encryption at rest** — provided by Supabase.
6. **Rate limiting** — client sliding window (`lib/rateLimit.ts`, UX
   only) plus the server-side `can_send_message` check inside
   `send_message` (25 messages per window by default) and the
   `message_rate_log` table.

## 3. What is NOT protected in V1

- **Message content from database access.** Anyone with database
  access (including a compromised service-role key, or a Supabase
  dashboard user) can read message text. The `messages.ciphertext`
  column holds plain text in V1; the name is historical.
- **End-to-end encryption.** Removed for V1 reliability (see
  `services/message-service.ts` header). `lib/crypto.ts` still
  contains ECDH/AES helpers, but only key-pair generation is used at
  signup, to store a public key for a future version. `lib/encryption.ts`
  (the old in-memory KeyManager) was deleted in v1.1.0 because nothing
  imported it — it was dead code describing a system that did not run.
- **Forward secrecy / ratcheting.** There is no E2E key model in V1,
  so there is nothing to ratchet.
- **Private-key storage.** There is no private key in V1 — nothing to
  store, nothing to steal from the client. The `profiles.public_key`
  column is NOT NULL in the schema and holds a public key only.

## 4. The future E2E plan (not built)

True E2E with a proper recovery-key flow is planned for a future
version (V4/V5 in the original notes), without changing the auth model.
It needs, at minimum: a private key wrapped by a password-derived key
(or WebAuthn), a recovery flow, per-chat shared keys, and a migration
plan for existing plain-text history. It is a substantial project, not
a small tweak. Do not claim E2E until it ships and is tested.

## 5. Calls security

- Signaling (offer/answer/ICE) goes through per-call Supabase Realtime
  **broadcast** channels — ephemeral, never written to a table.
- Media flows peer-to-peer and is encrypted by WebRTC itself
  (DTLS for the handshake, SRTP for media).
- A call row is created by the caller; the callee is notified via a
  `postgres_changes` subscription filtered to their own user ID.
- ⚠️ The `calls` table has no migration and no RLS policies in the
  repo (see `DATABASE_SCHEMA.md`). Until that migration exists with
  proper policies, call rows are not protected the way message rows
  are. Fix the migration before treating calls as production-ready.

## 6. Other controls

- **Blocking:** `blocked_users` — blocked users cannot message you;
  enforced in `send_spark_request` and the chat flow.
- **Sessions:** `user_sessions` tracks device sessions; Security
  Center can revoke a session or log out all devices.
- **Account deletion:** Settings → Account → Delete Account (typed
  "DELETE" confirmation).
- **Storage:** message media lives in Supabase Storage with bucket
  policies (chat members can read, only the uploader can delete).
- **Secrets:** env var names only in the repo, never values. The
  service-role key must never appear in client code or in
  `NEXT_PUBLIC_` variables.
