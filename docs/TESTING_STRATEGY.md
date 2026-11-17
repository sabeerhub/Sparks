# Sparks — Testing Strategy

> Version 1.1.0. There is no automated test suite in this repo yet
> (no test runner, no test files). Verification today is: TypeScript
> typecheck + production build + a manual checklist. That is the honest
> state — do not claim tests exist.

## 1. Automated checks (run these every time)

```bash
npm install
npm run typecheck   # tsc --noEmit — must pass with zero errors
npm run build       # next build — must complete, all routes listed
```

- `npm run build` needs Supabase env vars present, or prerendering
  fails with `@supabase/ssr: Your project's URL and API key are
  required`. That failure is environmental, not a code failure: the
  pages create the Supabase client at module level. For a
  compile-only check, build with placeholder values passed on the
  command line (never written to a file):
  `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key npm run build`
- **v1.1.0 verified result:** `npm run typecheck` — clean, zero
  errors. `npm run build` (with placeholder env) — succeeds, all 33
  routes generated including the new `/calls` page.

## 2. What cannot be verified locally (needs a real project)

- Any flow that touches Supabase (sign up, sign in, sending a message,
  Spark Requests, calls) needs a real Supabase project with the
  migrations applied and real env vars.
- **The two-device call test** (see §3) needs two real devices (or a
  device + a desktop browser) and a real Supabase project.
- The live deployment (Vercel) is not set up from this repo alone.

## 3. Manual two-device call test checklist

Do this with two accounts (A and B) on two devices, on the real
deployed app or a dev server pointed at the real Supabase project.

**Setup first:**
1. Apply migrations 0001–**0006** in order. Then verify in the
   database: a `calls` table and a `notifications` table exist, the
   `messages` table has a `content` column, and `get_storage_usage()`
   exists. (Before 0006 these were missing — see §4 — and calls,
   notifications, messaging and the Storage page would all fail
   against a fresh database.)
2. Check the live `send_message` function signature against what the
   client sends (see §4). After 0006 they should agree.

**Voice call:**
- [ ] A calls B (voice). B's screen rings with the soft ringtone.
- [ ] B accepts. Both hear each other. Duration counts up.
- [ ] A mutes — B hears silence; A sees the muted state.
- [ ] A toggles speaker — volume changes (loud vs quiet). Note: this
      is a volume change, not earpiece hardware routing.
- [ ] A hangs up. Both screens return to chat. The call appears in
      both users' Call History as answered, with a duration.
- [ ] From Call History, B taps the call button — A receives a new
      incoming call (call back works).

**Video call:**
- [ ] A calls B (video). Both see each other's video.
- [ ] A turns the camera off — B sees A's avatar + name, not a black
      box. A sees the same for their own preview.
- [ ] A flips the camera (on a phone with two cameras).
- [ ] A hangs up; history shows a video call with duration.

**Missed / declined:**
- [ ] A calls B; B does nothing for 45 s. The call ends, is marked
      missed, and shows red in B's Call History.
- [ ] A calls B; B declines. A sees "Call declined." No history row
      is created as answered.

**Reconnect:**
- [ ] During an active call, turn off Wi-Fi on one device for ~3 s,
      then back on. The call shows "Reconnecting…" and recovers
      without ending.
- [ ] Turn Wi-Fi off for 10 s+. The call ends with a clear
      "Call connection lost." message.

**Notifications:**
- [ ] In Settings → Notifications, turn Voice Calls off. A calls B
      (voice) — B's screen still shows the incoming call, but no
      ringtone sounds. Turn it back on — the ringtone returns.

## 4. What migration 0006 fixed — and how to verify it

Migration `0006_align_v1_plaintext.sql` was written to close the
three gaps below. It has **not** been run against a live database —
there is no Supabase CLI and no local Postgres in this workspace, so
it was verified by SQL inspection only: the file parses cleanly
(real Postgres parser, 22 statements, all expected types) and every
signature/table was checked line-by-line against the client code.
Before calling this done, apply 0001–0006 to a fresh Supabase
project and run the checks listed here.

1. **`send_message` parameters — FIXED by 0006.** Migration 0003
   defined `send_message(p_chat_id, p_ciphertext, p_iv, …)` while
   the client (`services/message-service.ts`, `services/
   media-service.ts`) calls it with `p_content` / `p_content_type` /
   `p_media_path` / `p_reply_to_id`, and reads `row.content`. 0006
   drops the old function and recreates it as
   `send_message(p_chat_id, p_content, p_content_type default
   'text', p_media_path default null, p_reply_to_id default null)`,
   inserting `content` with `ciphertext`/`iv` NULL, and adds the
   `content` column to `messages` (making `ciphertext`/`iv`
   nullable). Verify: in SQL, `\df send_message` shows the new
   signature; then send a text message and a media message from the
   app — both must appear, and `messages.content` must hold the
   text while `ciphertext`/`iv` are NULL.
2. **`calls` and `notifications` tables — FIXED by 0006.** Both are
   now created with RLS, indexes, and (for `calls`) `REPLICA
   IDENTITY FULL` + the `supabase_realtime` publication, plus a
   missed-call notification trigger. Verify: `\d calls` and `\d
   notifications` exist; A calls B and B's incoming-call screen
   rings; after 45 s with no answer the call is `missed`, shows red
   in B's Call History, and a "Missed call" row appears in B's
   notifications.
3. **`get_storage_usage()` RPC — FIXED by 0006.** Now defined as a
   SECURITY DEFINER function summing `storage.objects` metadata
   sizes for the caller's own `chat-media` files, split by
   mimetype. Verify: upload an image and a voice note, open
   Settings → Storage and Data, and check the numbers move (note:
   only files *you* uploaded count — media others sent you is
   owned by the sender; see the comment in 0006).
4. **Call history durations — STILL OPEN.** Duration is computed
   from `answered_at` → `ended_at`. If `answered_at` is never set
   for a call, duration shows blank — check the live rows.
5. **Still no notification triggers for new messages or Spark
   requests.** `services/notification-service.ts` says triggers
   populate notifications, but no migration (0001–0006) creates
   them — only the missed-call trigger from 0006 exists. The
   Activity/notifications screen will therefore stay empty except
   for missed calls until those triggers are written. Out of scope
   for 0006; do not claim notifications are fully wired.

## 5. Regression checklist (after any change)

- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes (placeholder env if no real project).
- [ ] Sign up → verify email → set up profile → find a user → send a
      Spark Request → accept → send a message → edit it → react to
      it → delete it.
- [ ] Voice call + video call happy path (see §3).
- [ ] No "coming soon", no dead buttons, no fake data on any screen
      you touched (see `PRODUCT_REQUIREMENTS.md` §5 rule 4).
- [ ] Light theme only — no dark-mode regressions.
