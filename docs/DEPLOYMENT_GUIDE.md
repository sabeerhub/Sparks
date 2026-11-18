# Sparks — Deployment Guide

> Version 1.1.0. Target: Supabase (free tier is enough for MVP) +
> Vercel. No other backend.

## 1. Prerequisites

- Node.js ≥ 18.18 (`node -v` to check).
- A Supabase account and project (free tier is enough for MVP).
- A Vercel account for deployment.
- A Google Cloud Console project, only if you want Google login.
- Supabase CLI (optional, for applying migrations from the command
  line): `npm install -g supabase`.

## 2. Local setup

```bash
npm install
cp .env.example .env.local
# edit .env.local with your real values (names below — never commit
# .env.local, and never paste real values into chat or docs)
npm run dev        # http://localhost:3000
```

## 3. Environment variables (names only — NEVER values)

| Name | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same place → anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same place → service-role key. **Server-only.** Never prefix with `NEXT_PUBLIC_`, never import in `app/` or `components/`. Only used by trusted server-only scripts (e.g. a Vercel Cron route calling `prune_rate_log()`). |
| `SUPABASE_PROJECT_ID` | Your project ref. Only used by `npm run supabase:gen-types`. |
| `NEXT_PUBLIC_APP_URL` | Your app URL, e.g. `http://localhost:3000` locally, your Vercel URL in production. |
| `NEXT_PUBLIC_TURN_URL` | Optional — TURN server URL for calls (see §6). |
| `NEXT_PUBLIC_TURN_USERNAME` | Optional — TURN username. |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | Optional — TURN credential. |

## 4. Supabase setup

### 4.1 Create the project
Create a project at supabase.com/dashboard. Copy the Project URL and
anon public key into `.env.local`.

### 4.2 Run the migrations — in this exact order
Migrations live in `supabase/migrations/`:

| File | Purpose |
|---|---|
| `0001_init_schema.sql` | Tables, indexes, the 1-to-1 trigger |
| `0002_rls_policies.sql` | Row Level Security on every table + Storage bucket policies |
| `0003_functions.sql` | `create_direct_chat()`, `send_message()` (rate-limit-checked), cleanup functions |
| `0004_session_device_metadata.sql` | Session device metadata, username helpers, failed-signup cleanup |
| `0005_spark_requests.sql` | `spark_requests` table + RLS + Spark RPCs |

Using the Supabase CLI (recommended):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste each file, in order, into the Supabase Dashboard → SQL Editor
and run it.

> ⚠️ **Before you test calls or notifications, check the database.**
> The migrations in this repo do **not** create a `calls` table or a
> `notifications` table, but the code uses both. If they are missing,
> write and apply a migration for them first (table + RLS policies) —
> see `DATABASE_SCHEMA.md`. Also verify the live `send_message`
> signature against what the client sends (see `TESTING_STRATEGY.md`).

### 4.3 Auth settings
- Supabase Dashboard → Authentication → URL Configuration: add your
  production URL (and `http://localhost:3000` for local dev) as a
  redirect URL.
- For Google login: enable Google in Authentication → Providers, add
  the Google client ID/secret in Supabase, and add
  `https://<your-project-ref>.supabase.co/auth/v1/callback` as an
  authorized redirect URI in Google Cloud Console.

### 4.4 Storage
Buckets are created by the migration policies (see 0002). Avatars and
message media are stored in Supabase Storage; only chat members can
read message media, and only the uploader can delete it.

### 4.5 Regenerate types (optional)
```bash
npm run supabase:gen-types   # needs SUPABASE_PROJECT_ID
```
This regenerates `types/database.ts` from the live database. Run it
after any schema change so the hand-written types stay honest.

## 5. Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY   # only if you add a cron route
vercel --prod
```

Then add your Vercel production URL as an additional redirect URL in
Supabase (see §4.3) and in the Google OAuth client's authorized
redirect URIs.

## 6. TURN setup for calls (built-in fallback included; your own relay recommended for real users)

Calls use free Google STUN servers by default, which is enough for
most direct connections. On restrictive networks (some corporate Wi-Fi,
some mobile carriers) a TURN relay is needed — without one, two phones
on mobile data often cannot reach each other directly, and a call can
end by itself after about a minute when the carrier changes the
network path. The app now ships with a built-in fallback relay so
calls work out of the box:

- **Built-in (already on, no setup):** OpenRelay, a free public relay
  run by Metered.ca (`turn:openrelay.metered.ca:80` and
  `turns:openrelay.metered.ca:443?transport=tcp`, username/credential
  `openrelayproject`). Those are PUBLIC demo credentials published by
  Metered.ca for anyone to use — they are not a secret and not private
  to this app. Honest limit: it is a free shared service with no
  uptime guarantee, fine for testing and getting started, not a
  production promise.
- **Your own relay (recommended for real users):** create a free
  Metered.ca account and use your own TURN credentials instead — your
  own relay takes priority over the public fallback automatically.
  Steps:
  1. Go to https://www.metered.ca and create a free account.
  2. In the Metered dashboard, open your TURN servers page and copy
     the TURN server URL, username and credential.
  3. In Vercel, open the project → Settings → Environment Variables,
     and add these three (Production + Preview):
     - `NEXT_PUBLIC_TURN_URL` (e.g. `turns:global.relay.metered.ca:443?transport=tcp`)
     - `NEXT_PUBLIC_TURN_USERNAME`
     - `NEXT_PUBLIC_TURN_CREDENTIAL`
  4. Redeploy (Vercel → Deployments → ⋯ → Redeploy, or push a new
     commit — env vars only take effect on a new deployment).
  5. Test a call on mobile data on both phones, for longer than a
     minute, before calling it done.

If calls connect fine on your own network without TURN, you can skip
your own relay — but test on a second network (e.g. mobile data)
before deciding.

## 7. Post-deploy checks

1. Open the deployed URL — the landing page loads, Sign Up works.
2. Sign up two accounts; send a Spark Request from one, accept from
   the other; send a message.
3. Run the two-device call test in `TESTING_STRATEGY.md` §3.
4. Confirm no env values appear anywhere in the repo or in the
   deployed client bundle (only the anon/public key belongs there —
   never the service-role key).
