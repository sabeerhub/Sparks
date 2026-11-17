# Sparks — System Architecture

> Version 1.1.0. Stack: Next.js 14 (App Router) + React 18 + Tailwind +
> Supabase (Auth, Postgres, Realtime, Storage) + WebRTC. No other backend.

## 1. Big picture

```
  Browser (Next.js App Router, React)
    ├── UI: app/ routes + components/
    ├── State: hooks/ + store/chat-store.ts (zustand)
    ├── Services: services/  ← the only layer that talks to Supabase
    └── Lib: lib/ (Supabase client, WebRTC, ringtone, storage, rate limit)
            │
            ▼  HTTPS + WebSocket
  Supabase
    ├── Auth (email/password, OTP, Google OAuth)
    ├── Postgres (tables, RLS, RPC functions, triggers)
    ├── Realtime (postgres_changes + broadcast channels)
    └── Storage (avatars, message media)
            │
            ▼  (calls only, after signaling)
  Peer-to-peer WebRTC media (audio/video) — never touches Supabase
```

**Rules:**
- Only `services/` talks to Supabase. Components and hooks never query
  the database directly (except `CallProvider`, which reads a caller
  profile, and a few pages that read their own profile — the documented
  exceptions).
- Media (audio/video) never touches Supabase. Only the call *signaling*
  (offer/answer/ICE) goes through Supabase Realtime broadcast, and it is
  ephemeral — never written to a table.
- Messages in V1 are plain text, protected by Auth + RLS + HTTPS +
  encryption at rest. See `SECURITY_MODEL.md`.

## 2. Folder map

```
app/
  page.tsx                    Landing page (public)
  privacy/ terms/ support/     Legal + support pages (public)
  (auth)/                     login, signup, forgot/reset password, OTP verify
  (onboarding)/               welcome slides, profile setup
  (chat)/                     chats, chats/[chatId], chats/new, search,
                              activity, calls (history)
  (profile)/                  own profile, other profile, edit, media
  (settings)/                 settings index + account, appearance, help,
                              language, notifications, privacy, security,
                              storage, about
  auth/callback/route.ts      Google OAuth code exchange
components/
  ui/                         Avatar, Button, Input
  chat/                       ChatListItem, MessageBubble, MessageComposer,
                              MessageContextMenu, TypingIndicator,
                              DesktopSidebar, ChatActionSheet, ImageViewer,
                              MediaContent, VoiceMessagePlayer
  call/                       CallProvider (app-wide call owner),
                              CallScreen (full-screen call UI)
  layout/                     BottomNav, DesktopNavRail, ScreenContainer,
                              StatusBar (no-op — see below)
  appearance/                 AppearanceApplier (font/bubble size)
hooks/
  useAuth, useChat, useCall, useRealtime, useUsernameAvailability
lib/
  supabase.ts                 createClient() (browser client)
  webrtc.ts                   peer connection, ICE servers, local media
  ringtone.ts                 WebAudio ringtone (v1.1.0)
  crypto.ts                   Web Crypto helpers — only key-pair generation
                              is used in V1 (see SECURITY_MODEL.md)
  storage.ts                  IndexedDB offline cache + outbox
  rateLimit.ts                client-side throttle (UX only)
services/
  auth-service, chat-service, message-service, media-service,
  call-service, notification-service, spark-service,
  account-service, session-service
store/  chat-store.ts         zustand: chat list, active chat
supabase/migrations/          0001–0005 (see DATABASE_SCHEMA.md)
```

`StatusBar` is a deliberate no-op: it renders nothing. The browser's own
status bar already shows time/signal/battery; a second, fake one
(always "9:41") was removed rather than kept.

## 3. Data flow — sending a message

1. User types in `MessageComposer` → `useChat.send()` → client rate
   check (`lib/rateLimit.ts`).
2. `message-service.sendMessage()` calls the `send_message` RPC, which
   re-checks membership and the server-side rate limit, inserts the row,
   writes `message_rate_log`, and bumps `chats.last_message_at`.
3. The other side receives the new row via a Realtime
   `postgres_changes` subscription on `messages` (see `useRealtime`).
4. Offline: the message is queued in the IndexedDB outbox
   (`lib/storage.ts`) and synced on reconnect.

> ⚠️ Known unverified mismatch (needs a live DB check): the client calls
> `send_message` with parameters `p_content` / `p_content_type`, while
> migration 0003 defines the function with `p_ciphertext` / `p_iv`.
> See `TESTING_STRATEGY.md`. Do not assume the live database matches the
> migrations — verify before trusting either side.

## 4. Data flow — presence, typing, receipts

- **Presence / online:** `usePresence` + `useProfilePresence`
  (`hooks/useRealtime.ts`) subscribe to profile changes; `is_online` and
  `last_seen_at` come from `profiles`.
- **Typing:** the typer upserts a row in `typing_status`; the other side
  subscribes to it. Rows older than 10 s are stale
  (`cleanup_stale_typing_status`).
- **Receipts:** `message_receipts` rows (`delivered` / `read`) are written
  on read; the sender's UI subscribes via `useReceiptUpdates`.

## 5. Calls — signaling flow (WebRTC)

```
Caller                          Callee
  │  initiateCall() → INSERT calls row (status=ringing)
  │  getLocalMedia() → create peer connection
  │  subscribe to call-signal:<id> (broadcast)
  │                                 incoming call row (postgres_changes)
  │                                 → CallScreen rings (ringtone)
  │                                 → user taps Accept
  │                                 getLocalMedia() → peer connection
  │                                 acceptCall() → status=accepted
  │  ◄── "ready" broadcast ─────────┤
  │  createOffer() → "offer" ───────► setRemoteDescription → createAnswer
  │  ◄── "answer" ──────────────────┤
  │  ICE candidates both ways ("ice-candidate")
  │  connectionState = connected → phase "active", duration timer starts
  │  media flows peer-to-peer (DTLS/SRTP), never via Supabase
  │  hangUp → "hangup" broadcast + calls.status = ended
```

- **Ringtone (v1.1.0):** soft WebAudio two-tone chime while ringing,
  incoming and outgoing. Stops on connect / decline / end / timeout.
  It only sounds if the user's Voice/Video call notification setting
  for that call type is on.
- **Reconnect (v1.1.0):** on `disconnected` / `failed`, the call shows
  "Reconnecting…", tries one ICE restart, and waits 5 s before ending.
  If the connection recovers, the call continues.
- **Speaker (v1.1.0):** honest limit — browsers expose no earpiece
  routing API. The toggle switches remote volume between loudspeaker
  level (1.0) and earpiece level (0.35), applied to the remote audio
  (voice) or video (video) element.
- **Camera off (v1.1.0):** when a camera is off, the video box shows
  the person's avatar + name instead of a black box.
- **History (v1.1.0):** `calls` rows are listed on `/calls` with
  missed / answered / outgoing, duration and time; tapping the call
  button calls that person back.
- **ICE servers:** free Google STUN by default. Optional TURN via
  `NEXT_PUBLIC_TURN_URL` / `NEXT_PUBLIC_TURN_USERNAME` /
  `NEXT_PUBLIC_TURN_CREDENTIAL` (e.g. Metered free tier) — see
  `DEPLOYMENT_GUIDE.md`.

## 6. Realtime channels

| Channel | Type | Purpose |
|---|---|---|
| `incoming-calls:<userId>` | postgres_changes INSERT on `calls` | incoming call alert |
| `call-status:<callId>` | postgres_changes UPDATE on `calls` | declined / ended |
| `call-signal:<callId>` | broadcast | offer / answer / ICE / ready / hangup |
| `bottomnav-notif-badge`, `notif-badge`, `desktop-rail-notif-badge` | postgres_changes on `notifications` | unread badge refresh |
| message / typing / presence subscriptions | postgres_changes | chat thread updates |

## 7. What is NOT in the architecture

- No custom backend server, no cron jobs, no AI service.
- No group-chat machinery (the `chats.is_group` check and the
  2-member trigger enforce 1-to-1 at the database level).
- No E2E encryption service in V1 (see `SECURITY_MODEL.md`).
