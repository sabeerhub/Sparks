<p align="center">
  <img src="public/wordmark-animated.svg" width="320" alt="Sparks">
</p>

<p align="center">
  <a href="https://sparkes.vercel.app">sparkes.vercel.app</a>
</p>

A privacy-first messaging app. Light theme only, Apple-blue accent,
mobile-first. Next.js (App Router) + Supabase + WebRTC.

> **Honest status (v1.6.1):** messages are **not** end-to-end encrypted
> in V1 — they are plain text, protected by Supabase Auth + RLS + HTTPS +
> encryption at rest. True E2E encryption is planned for a future version,
> not built yet. See [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md).

This README is the single source of truth for getting the project running.
Read it top to bottom before deploying anything.

---

## 0. What's real vs. what's scaffolded

Being direct about scope, since this matters for a security-sensitive app:

| Area | Status |
|---|---|
| UI (all screens) | ✅ Fully built, wired to real hooks/services |
| Database schema + RLS | ✅ Complete, reviewed for IDOR/auth correctness |
| End-to-end encryption | ❌ **Not built in V1** — messages are plain text in the DB, protected by Auth + RLS + HTTPS + encryption at rest. Planned for a future version. |
| Rate limiting (client + server) | ✅ Real, functional |
| Offline cache (IndexedDB) + reconnect sync | ✅ Real, functional |
| 1:1 messaging, edit/delete/react, typing, receipts | ✅ Real, functional |
| Email OTP + Google OAuth | ✅ Wired to Supabase Auth |
| Voice/video calls | ✅ Real — WebRTC peer-to-peer, Supabase Realtime signaling, ringtone, call history, camera-off placeholder, reconnect handling (v1.1.0) |
| E2E key material | ⚠️ A public key is stored at signup for future E2E (schema requires it); no private key is generated or used in V1 — see [Security Notes](#6-security-notes-read-before-going-to-production) |
| Group chats | ❌ Out of scope by design — see PRD ("1-to-1 chats only, MVP") |

Nothing here is a mockup with fake data wired to nothing — every screen
talks to a real Supabase backend once you've run the setup below. But this
hasn't been deployed or pen-tested by us; treat it as a strong, honest
starting point, not an audited production system.

---

## 1. Prerequisites

- Node.js ≥ 18.18
- A [Supabase](https://supabase.com) account (free tier is enough for MVP)
- A [Vercel](https://vercel.com) account for deployment
- A [Google Cloud Console](https://console.cloud.google.com) project, if you want Google login

---

## 2. Local setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your Supabase project values
cp .env.example .env.local
# edit .env.local with your actual NEXT_PUBLIC_SUPABASE_URL / ANON_KEY

# 3. Run the dev server
npm run dev
```

App runs at `http://localhost:3000`.

---

## 3. Supabase setup

### 3.1 Create the project
1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Copy the **Project URL** and **anon public key** into `.env.local`.

### 3.2 Run the migrations
Migrations live in `/supabase/migrations/`, applied in this exact order:

| File | Purpose |
|---|---|
| `0001_init_schema.sql` | Tables, indexes, the 1:1-chat-enforcement trigger |
| `0002_rls_policies.sql` | Row Level Security — default-deny + IDOR-safe policies on every table, plus Storage bucket policies |
| `0003_functions.sql` | `create_direct_chat()`, `send_message()` (rate-limit-checked, transactional), cleanup functions |

Using the Supabase CLI (recommended):

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

Or paste each file's contents into the Supabase Dashboard's SQL Editor, in
order, if you'd rather not install the CLI.

### 3.3 Enable Email OTP
Dashboard → Authentication → Providers → Email → ensure "Enable Email OTP"
is on (it is by default). Customize the OTP email template under
Authentication → Email Templates if you want Sparks branding.

### 3.4 Enable Google OAuth
1. In Google Cloud Console: create OAuth 2.0 credentials (Web application).
2. Authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`
3. In Supabase Dashboard → Authentication → Providers → Google: paste the
   Client ID and Client Secret, enable the provider.
4. In your app's own redirect, the route at `app/auth/callback/route.ts`
   handles the exchange — no changes needed there.

### 3.5 (Optional) Schedule cleanup functions
`cleanup_stale_typing_status()` and `prune_rate_log()` need to run
periodically. On Supabase Pro+ with `pg_cron` available, uncomment the
`cron.schedule(...)` lines at the bottom of `0003_functions.sql`. On the
free tier, add a Vercel Cron route that calls them via RPC instead — a
stub for this is **not** included by default since it requires the
service-role key, which should never live in client-reachable code; wire
it up as a dedicated `app/api/cron/cleanup/route.ts` using
`SUPABASE_SERVICE_ROLE_KEY` from server-only env if you need this.

---

## 4. Project structure

```
/sparks
  /app
    page.tsx                    → Landing page (public)
    /(auth)/login                → Email + Google login
    /(auth)/otp                  → OTP verification
    /(onboarding)/welcome        → Privacy/feature intro slides
    /(onboarding)/profile-setup  → Username/name/bio, key generation
    /(chat)/chats                 → Chat list (main screen)
    /(chat)/chats/[chatId]        → Individual chat thread
    /(chat)/chats/new             → Start a new chat
    /(chat)/search                → Cross-chat search
    /(chat)/activity              → Notifications + Spark Requests
    /(chat)/calls                 → Call history (voice/video, tap to call back)
    /(profile)/profile            → Own profile + account actions
    /(settings)/settings          → iOS-style settings list
    /(settings)/security          → Security Center, logout-all-devices
    /auth/callback/route.ts       → Google OAuth code exchange

  /components
    /ui        → Avatar, Button, Input — design-system primitives
    /chat      → MessageBubble, MessageComposer, TypingIndicator, ChatListItem, MessageContextMenu
    /layout    → BottomNav, StatusBar, ScreenContainer

  /lib
    supabase.ts    → Browser + server Supabase clients
    crypto.ts       → Web Crypto helpers; only key-pair generation is used in V1 (public key stored at signup for future E2E — see §6)
    ringtone.ts     → WebAudio soft ringtone for incoming/outgoing calls (no audio files)
    webrtc.ts       → Peer connection, ICE servers (STUN + optional TURN), local media
    storage.ts      → IndexedDB-backed offline cache + outbox + reconnect sync
    rateLimit.ts     → Client-side sliding-window throttle (UX only, not the real boundary)

  /hooks
    useAuth.ts       → Session, OTP, Google OAuth
    useChat.ts        → The seam: cache + services + realtime for one chat screen
    useCall.ts        → Call state machine: ringing → connecting → active, mute/camera/speaker, ringtone, 5s reconnect grace + ICE restart
    useRealtime.ts    → Supabase Realtime subscriptions (messages, typing, presence, receipts)

  /store
    chat-store.ts     → Minimal global state (active chat, own profile, chat list)

  /services
    chat-service.ts     → Chat CRUD, search, block/mute/pin/archive
    call-service.ts     → Call rows, signaling (broadcast), call history
    message-service.ts  → Send/edit/delete/read receipts (plain text in V1 — see §6)

  /components/call
    CallProvider.tsx    → App-wide call owner: incoming-call listener + placeCall()
    CallScreen.tsx      → Full-screen call UI: frosted controls, ringing pulse, camera-off avatar, reconnecting state

  /middleware
    auth-middleware.ts  → Session refresh + route protection logic

  middleware.ts          → Next.js entry point, delegates to the above

  /supabase/migrations    → SQL schema, RLS, functions (see §3.2)

  /types/index.ts          → Shared types, including the hand-written `Database` type
  /utils/helpers.ts         → Pure formatting/validation helpers
  /styles/globals.css        → Design tokens, light-theme-only, no dark mode block
```

---

## 5. Deployment (Vercel)

```bash
npm install -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY   # only if you add a cron route — see §3.5
vercel --prod
```

After deploying, add your Vercel production URL as an additional redirect
URL in Supabase Dashboard → Authentication → URL Configuration, and in the
Google OAuth client's Authorized redirect URIs.

---

## 6. Security notes — read before going to production

This codebase implements real RLS-enforced access control and a real
rate-limit backstop in the database. Two things are **not** what an
older version of this README claimed — corrected here, not glossed over:

1. **No end-to-end encryption in V1**: messages are stored as plain text
   in the database. They are protected in transit by HTTPS/TLS, at rest
   by Supabase's server-side encryption, and in access by Supabase Auth
   + row-level security — but anyone with database access can read them.
   Do not describe Sparks as end-to-end encrypted until true E2E (with a
   proper recovery-key flow, planned for a future version) is actually
   built. A public key is stored at signup for that future version
   (`profiles.public_key` is NOT NULL in the schema); no private key is
   generated, stored, or used in V1.
2. **No forward secrecy / ratcheting**: there is no E2E key model in V1
   to ratchet. When E2E is built, Signal Protocol-style double-ratcheting
   is a substantial additional project on top of that foundation, not a
   small tweak.

Everything else — RLS policies, the rate-limit transaction, IDOR
boundaries, soft-delete tombstones — was reviewed specifically for these
properties and should hold up to real adversarial testing. But "should
hold up" isn't the same as "has been audited" — get an actual security
review before handling real users' real conversations.

---

## 7. What's intentionally NOT included

Per the product brief's explicit rules:
- No AI features
- No dark mode (not even a `prefers-color-scheme` media query)
- No group chats (1:1 only, enforced by a DB trigger, not just UI)
- No end-to-end encryption yet (see §0 and §6 — planned, not built)

## 8. Docs

Full system documentation lives in [docs/](docs/):

- [PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md) — what Sparks is, who it is for, what exists
- [SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) — stack, folders, data flow, Realtime, calls
- [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) — tables, RLS, triggers
- [SECURITY_MODEL.md](docs/SECURITY_MODEL.md) — what is protected, what is not, honest limits
- [CHAT_RULES.md](docs/CHAT_RULES.md) — messaging and call rules
- [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — light theme, tokens, spacing, touch targets
- [API_CONTRACTS.md](docs/API_CONTRACTS.md) — services, RPCs, Realtime channels, signaling
- [TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) — how to verify, including the two-device call test
- [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) — Supabase, migrations, env vars, Vercel, TURN
