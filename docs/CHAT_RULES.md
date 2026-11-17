# Sparks — Chat Rules

> The product rules for messaging and calls in v1.1.0. These are enforced
> in code and in the database where stated; the rest are UI rules.

## 1. The Spark handshake

1. To talk to someone, you send them a **Spark Request** (optionally
   with a short note).
2. You cannot send them a message until they **accept** it.
3. If they decline, no chat is created and you cannot message them.
4. If either side blocks the other, no Spark Request and no message can
   go through.
5. Accepting a Spark Request creates the 1-to-1 chat
   (`respond_to_spark_request` → `create_direct_chat`).

## 2. Chats

- **1-to-1 only, always.** Maximum 2 members per chat, enforced by the
  database trigger `enforce_max_two_members` and the
  `is_group = false` check. There are no group chats, no channels.
- A chat can be **pinned, muted, archived**, or **deleted for self**
  (deleting removes it from your side only).
- **Blocking** a user removes the chat from your side and prevents
  them from messaging you.
- The chat list shows the other person's name, the last message
  preview, the time, unread count, and pinned/muted state.

## 3. Messages

- Text, images, files (≤ 25 MB), voice notes.
- **Edit:** you can edit your own message; it shows an "edited" mark.
- **Delete:** you can delete your own message; the other side sees a
  "This message was deleted" tombstone. The row is soft-deleted, not
  hard-deleted.
- **React:** one reaction per user per message (emoji). Tapping a
  different emoji replaces it.
- **Reply:** replying quotes the original message in the thread.
- **Receipts:** a message is `pending` while sending, then
  `delivered`, then `read` (blue ticks) when the other side reads it.
  Read receipts can be turned off in Settings → Privacy — but then you
  do not see theirs either (the setting is per-user, not per-chat).
- **Typing:** the other side sees "typing…" while you type. It can be
  turned off in Settings → Privacy.
- **Rate limit:** 25 messages per window by default (server-side,
  `can_send_message`). The client also throttles and shows "slow down"
  without a round trip.
- **Offline:** messages you send while offline are queued in the
  IndexedDB outbox and sent when you reconnect.

## 4. Voice notes

- Hold the mic button to record; slide left to cancel, slide up to
  lock (hands-free); tap send to send, trash to delete.
- Voice notes are audio files stored in Supabase Storage, like other
  media.

## 5. Calls

- **Types:** voice and video, 1-to-1 only, peer-to-peer WebRTC.
- **Starting a call:** from a chat header (phone / video buttons) or
  from Call History (tap the call button to call back).
- **Ringing:** the other side's screen rings for up to 45 s, with a
  soft ringtone. If nobody answers, the call is marked **missed**.
- **Accept / decline:** incoming calls show Accept (green) and Decline
  (red). Declining marks the call declined.
- **During a call:** mute, camera on/off (video), flip camera (video),
  speaker toggle, duration display, large red end button.
- **Speaker — honest limit:** browsers expose no API to route audio to
  the earpiece instead of the loudspeaker. The speaker toggle switches
  the remote volume between loudspeaker level (1.0) and earpiece level
  (0.35). It never claims hardware routing it cannot do.
- **Camera off:** when a camera is off, the video box shows the
  person's avatar and name — never a black box.
- **Connection drops:** if the connection drops, the call shows
  "Reconnecting…", tries one ICE restart, and waits 5 s. If it
  recovers, the call continues. If not, the call ends with a clear
  "Call connection lost." message.
- **Missed calls:** a missed call appears in Call History in red, and
  a notification is created.
- **Call history:** `/calls` lists every call — name, voice/video,
  missed / answered / outgoing, duration, time — newest first.
  Tapping the call button calls that person back with the same type.
- **Notifications:** the Voice Calls / Video Calls toggles in Settings
  → Notifications control whether the ringtone sounds for that call
  type. The call screen still appears, so a silenced call is visible,
  just quiet.
- **What calls are not:** calls are not recorded, not stored, and not
  transcribed. Only the call *row* (who, when, type, status, duration)
  is stored, for history.

## 6. Privacy settings that change chat behaviour

- **Last Seen / Online Status:** hide them from others.
- **Read Receipts:** off means others do not see when you read.
- **Typing Indicator:** off means others do not see you typing.
- **Profile visibility / who can Spark:** who may find you and send
  you a Spark Request.
