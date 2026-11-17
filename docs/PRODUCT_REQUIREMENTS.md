# Sparks — Product Requirements

> Version 1.1.0. This document describes Sparks **as it actually is** after
> the v1.1.0 upgrade. Status is marked honestly: ✅ built, ❌ not built,
> 🚫 out of scope by design. Nothing here is a promise about a future version.

## 1. What Sparks is

Sparks is a privacy-first messaging app for one-to-one conversations.
A person signs up, finds people by name or @username, sends a **Spark
Request**, and can only start chatting once the other person accepts it.
After that, the two people can exchange text, images, files and voice
notes, react to messages, edit and delete them, and make voice and video
calls.

- **Platform:** web app (Next.js), mobile-first, light theme only.
- **Stack:** Next.js 14 App Router + Supabase (Auth, Postgres, Realtime,
  Storage) + WebRTC for calls.
- **Design:** Apple-inspired, minimal. One accent colour
  (#007AFF), system font, no dark mode, no gradients.

## 2. Who it is for

Anyone who wants private 1-to-1 messaging without strangers landing in
their inbox. The Spark Request handshake is the product's core idea: no
conversation exists until both sides agree to it.

## 3. What makes Sparks different

Only real features are listed here — no invented claims.

1. **The Spark Request handshake.** Nobody can message you until you
   accept their Spark. Every conversation starts with your yes. No
   strangers, no spam in your inbox. This is the feature no big chat app
   has in this form, and it is the heart of Sparks.
2. **Private by design.** One-to-one chats only. Conversations are
   protected by sign-in, row-level security, and encryption in transit
   and at rest. End-to-end encryption is on the roadmap — we will not
   claim it before it is built (see `SECURITY_MODEL.md`).
3. **Calls that feel like calls.** Real peer-to-peer voice and video
   calls with a ringtone, a call history you can call back from, a
   camera-off avatar instead of a black box, and a connection that tries
   to recover before it gives up.

## 4. Feature list (v1.1.0)

| Feature | Status |
|---|---|
| Sign up with email + password, email OTP verification | ✅ |
| Sign in with email or @username, Google OAuth | ✅ |
| Profile: name, username, bio, avatar, location | ✅ |
| Find people by name / @username | ✅ |
| Spark Request: send, accept, decline (1-to-1 handshake) | ✅ |
| 1-to-1 text messaging | ✅ |
| Images, files (≤ 25 MB), voice notes | ✅ |
| Edit message, delete message (soft-delete tombstone) | ✅ |
| React to a message (one reaction per user per message) | ✅ |
| Reply to a message (quote shown in thread) | ✅ |
| Typing indicator, online status, last seen | ✅ |
| Read receipts (delivered / read ticks) | ✅ |
| Block / mute / pin / archive a chat | ✅ |
| Voice calls (WebRTC peer-to-peer) | ✅ |
| Video calls (WebRTC peer-to-peer, camera flip) | ✅ |
| Ringtone while ringing (WebAudio, no audio files) | ✅ |
| Call history with missed / answered / outgoing + call back | ✅ |
| Speaker toggle (volume level — see `CHAT_RULES.md` for the honest limit) | ✅ |
| Call reconnect: 5 s grace + one ICE restart before dropping | ✅ |
| Offline cache (IndexedDB) + reconnect sync | ✅ |
| Push-style in-app notifications + notification settings | ✅ |
| Appearance: font size, bubble size, light theme | ✅ |
| Settings: account, privacy, security, storage, language, help | ✅ |
| Landing page, privacy policy, terms, support page | ✅ |
| Group chats | 🚫 Out of scope by design (see §5) |
| End-to-end encryption | ❌ Not built in V1 (see `SECURITY_MODEL.md`) |
| AI features | 🚫 Out of scope by design |
| Dark mode | 🚫 Out of scope by design |

## 5. Hard rules (non-negotiable)

1. **1-to-1 only.** A chat can never have more than 2 members. Enforced
   in the database (`enforce_max_two_members` trigger + `is_group = false`
   check), not just in the UI. There is no group-chat UI anywhere; the
   "New group" entry on the new-chat screen is visibly disabled and says
   why.
2. **No conversation without consent.** Sending a message requires an
   accepted Spark Request. Blocked users cannot message you.
3. **Light theme only.** No dark mode, no `prefers-color-scheme` block.
4. **No fake things.** Every button either works or is visibly disabled
   with a reason. Nothing says "coming soon". Nothing shows invented
   people, messages, or data. The landing page preview shows the real
   empty state of the app, labelled as a preview.
5. **No secrets in the repo.** Env var names only, never values. No
   service-role key in client code.

## 6. Out of scope (deliberate)

- Group chats, channels, broadcasts.
- AI features of any kind.
- Dark mode.
- Desktop native apps (the web app is mobile-first and responsive).
- End-to-end encryption in V1 (planned for a future version with a
  proper recovery-key flow — it is not a small tweak).
