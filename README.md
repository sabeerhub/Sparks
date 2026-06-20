# ⚡ Sparks

A privacy-first, end-to-end encrypted messaging app. Light theme only,
Apple-blue accent, mobile-first. Next.js (App Router) + Supabase + Web
Crypto API.

This README is the single source of truth for getting the project running.
Read it top to bottom before deploying anything.

---

## 0. What's real vs. what's scaffolded

Being direct about scope, since this matters for a security-sensitive app:

| Area | Status |
|---|---|
| UI (all screens) | ✅ Fully built, wired to real hooks/services |
| Database schema + RLS | ✅ Complete, reviewed for IDOR/auth correctness |
| Encryption (AES-256-GCM via Web Crypto) | ✅ Real, functional |
| Rate limiting (client + server) | ✅ Real, functional |
| Offline cache (IndexedDB) + reconnect sync | ✅ Real, functional |
| 1:1 messaging, edit/delete/react, typing, receipts | ✅ Real, functional |
| Email OTP + Google OAuth | ✅ Wired to Supabase Auth |
| Voice/video calls | ❌ Out of scope — UI shows an honest "not built yet" state, not a fake button |
| Private-key storage | ⚠️ MVP simplification — see [Security Notes](#6-security-notes-read-before-going-to-production) below |
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
    /(chat)/activity              → Calls tab (stub — see scope table)
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
    crypto.ts       → Raw Web Crypto: ECDH key pairs, AES-256-GCM encrypt/decrypt
    encryption.ts   → In-memory KeyManager (session-scoped, never persisted)
    storage.ts      → IndexedDB-backed offline cache + outbox + reconnect sync
    rateLimit.ts     → Client-side sliding-window throttle (UX only, not the real boundary)

  /hooks
    useAuth.ts       → Session, OTP, Google OAuth, key provisioning
    useChat.ts        → The seam: cache + services + realtime for one chat screen
    useRealtime.ts    → Supabase Realtime subscriptions (messages, typing, presence, receipts)

  /store
    chat-store.ts     → Minimal global state (active chat, own profile, chat list)

  /services
    chat-service.ts     → Chat CRUD, search, block/mute/pin/archive
    message-service.ts  → The only place that pairs encrypt/decrypt with a network call

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

This codebase implements real AES-256-GCM encryption with per-message
random IVs, real RLS-enforced access control, and a real rate-limit
backstop in the database — these aren't simplified for the demo. Two
things ARE simplified for MVP scope, flagged explicitly rather than
glossed over:

1. **Private key storage**: the user's ECDH private key is currently held
   in `sessionStorage` (wrapped as a JWK) so it survives a page refresh
   without forcing re-login, and mirrored into an in-memory `KeyManager`
   (`lib/encryption.ts`) for actual crypto operations. `sessionStorage` is
   readable by any script running in the page's origin — it is **not**
   protected against XSS the way a hardware-backed keystore would be. For
   real production hardening, wrap the private key with a key derived from
   a user passphrase or device biometric (WebAuthn) before it touches
   `sessionStorage` at all, or move key custody to the OS keychain via a
   native wrapper.
2. **No forward secrecy / ratcheting**: this is a simplified Signal-style
   model — one shared AES key per chat, derived once via ECDH, reused
   (with fresh random IVs) for every message. A compromised private key
   compromises all past and future messages in that chat. Real Signal
   Protocol-style double-ratcheting is a substantial additional project on
   top of this foundation, not a small tweak.

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
- No voice/video call infrastructure (WebRTC signaling is a separate, large project)
