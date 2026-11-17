-- ============================================================================
-- Sparks — Migration 0006: Align the database with V1 plain-text messages
-- ─────────────────────────────────────────────────────────────────────────
-- V1 (see services/message-service.ts) sends PLAIN-TEXT messages. The
-- migrations before this one still describe the OLD abandoned E2E design:
--   - messages had no `content` column and required `ciphertext`/`iv`,
--     while the client calls send_message(p_content, ...) and reads
--     row.content — so against a fresh DB from 0001–0005 the app could
--     not send or read messages at all.
--   - No `calls` table existed, yet services/call-service.ts reads,
--     writes and subscribes to one.
--   - No `notifications` table existed, yet services/
--     notification-service.ts reads/writes one, and no trigger ever
--     created notification rows (a grep of 0001–0005 finds zero
--     references to `notifications`).
--   - get_storage_usage() did not exist, yet Settings → Storage and
--     Data calls it as an RPC.
-- This migration fixes exactly those four gaps, for a fresh database.
-- There is no known live Sparks Supabase project, so there is nothing
-- live to migrate: no data backfill is attempted here. `ciphertext`
-- and `iv` are kept (nullable) so a future E2E version can reuse them
-- without another schema change.
-- ============================================================================

-- ─── 1. messages: plain-text `content`, ciphertext/iv now nullable ─────────
alter table public.messages
  add column if not exists content text,
  alter column ciphertext drop not null,
  alter column iv drop not null;

-- Replace send_message with the signature the client actually calls.
-- Old signature (0003): (p_chat_id, p_ciphertext, p_iv, p_content_type,
-- p_media_path, p_reply_to_id). New signature matches
-- services/message-service.ts (p_content) and services/media-service.ts
-- (p_content = file display name, p_content_type = image/file/voice,
-- p_media_path set). Rate-limit check, transaction, and last_message_at
-- bump are unchanged from 0003.
drop function if exists public.send_message(uuid, text, text, text, text, uuid);

create or replace function public.send_message(
  p_chat_id uuid,
  p_content text,
  p_content_type text default 'text',
  p_media_path text default null,
  p_reply_to_id uuid default null
)
returns uuid as $$
declare
  v_message_id uuid;
begin
  if not public.is_chat_member(p_chat_id) then
    raise exception 'Not a member of this chat';
  end if;

  if not public.can_send_message() then
    raise exception 'Rate limit exceeded — please slow down' using errcode = '42901';
  end if;

  insert into public.messages (chat_id, sender_id, content, ciphertext, iv, content_type, media_path, reply_to_id)
  values (p_chat_id, auth.uid(), p_content, null, null, p_content_type, p_media_path, p_reply_to_id)
  returning id into v_message_id;

  insert into public.message_rate_log (user_id) values (auth.uid());

  update public.chats set last_message_at = now() where id = p_chat_id;

  return v_message_id;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- ─── 2. calls table (was missing entirely) ─────────────────────────────────
-- Columns match the CallRow type in services/call-service.ts exactly.
-- Signaling itself stays ephemeral (Realtime broadcast, never written
-- here); this table only holds call lifecycle state so history and
-- missed-call handling work.
create table public.calls (
  id              uuid primary key default gen_random_uuid(),
  caller_id       uuid not null references public.profiles(id) on delete cascade,
  callee_id       uuid not null references public.profiles(id) on delete cascade,
  call_type       text not null check (call_type in ('voice', 'video')),
  status          text not null default 'ringing'
                    check (status in ('ringing', 'accepted', 'declined', 'missed', 'ended')),
  started_at      timestamptz not null default now(),
  answered_at     timestamptz,
  ended_at        timestamptz,
  constraint calls_no_self_call check (caller_id <> callee_id)
);

create index idx_calls_callee_status on public.calls (callee_id, status);
create index idx_calls_caller on public.calls (caller_id);

alter table public.calls enable row level security;

-- A call is visible only to its two participants. Either participant may
-- update status (accept / decline / miss / end are done by different
-- sides); no client delete policy — calls are history, never deleted.
create policy "calls_select_participant"
  on public.calls for select
  to authenticated
  using (caller_id = auth.uid() or callee_id = auth.uid());

create policy "calls_insert_caller_self"
  on public.calls for insert
  to authenticated
  with check (caller_id = auth.uid());

create policy "calls_update_participant"
  on public.calls for update
  to authenticated
  using (caller_id = auth.uid() or callee_id = auth.uid())
  with check (caller_id = auth.uid() or callee_id = auth.uid());

-- Realtime: postgres_changes subscriptions in services/call-service.ts
-- (incoming calls, per-call status) need the full row on UPDATE, and
-- the table in the publication. NOTE: migration 0001 contains no
-- publication statements at all; the repo's only precedent is 0005
-- ("alter publication supabase_realtime add table
-- public.spark_requests;") — this copies that pattern exactly.
alter table public.calls replica identity full;
alter publication supabase_realtime add table public.calls;

-- ─── 3. notifications table (was missing entirely) ─────────────────────────
-- Columns match AppNotification in types/index.ts. NotificationType has
-- no call-specific value, so the missed-call trigger below uses 'message'.
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            text not null check (type in ('message', 'spark_request', 'spark_accepted', 'mention')),
  title           text not null,
  body            text,
  related_chat_id uuid references public.chats(id) on delete set null,
  related_user_id uuid references public.profiles(id) on delete set null,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_notifications_user_created on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Owner-only read/update/delete. Deliberately NO client INSERT policy:
-- notifications are created server-side only (triggers), never by the
-- client directly — see services/notification-service.ts.
create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_delete_own"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- Missed-call notification. No trigger in 0001–0005 inserts notification
-- rows at all (verified by grep), so this is the only one. Fires only on
-- the transition into 'missed' — re-marking an already-missed call does
-- not create a duplicate. SECURITY DEFINER so the insert bypasses RLS
-- (the trigger runs as the function owner, not as the caller).
create or replace function public.notify_missed_call()
returns trigger as $$
declare
  v_caller_name text;
begin
  if old.status = 'missed' or new.status <> 'missed' then
    return new;
  end if;

  select full_name into v_caller_name
  from public.profiles where id = new.caller_id;

  insert into public.notifications (user_id, type, title, body, related_user_id)
  values (
    new.callee_id,
    'message',
    'Missed call',
    'Missed ' || new.call_type || ' call from ' || coalesce(v_caller_name, 'Unknown'),
    new.caller_id
  );

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger trg_notify_missed_call
  after update of status on public.calls
  for each row execute function public.notify_missed_call();

-- ─── 4. get_storage_usage() (was missing entirely) ─────────────────────────
-- Called by app/(settings)/settings/storage/page.tsx as an RPC; it reads
-- data[0] as { images_bytes, files_bytes, voice_bytes, total_bytes }.
-- Computed from storage.objects metadata, bucket 'chat-media' (see 0002):
--   - size comes from metadata->>'size' (bytes, set by Supabase Storage
--     on upload); mimetype from metadata->>'mimetype'.
--   - Split follows services/media-service.ts kindFromMimeType():
--     image/* → images, audio/* → voice, everything else → files.
--   - Only objects OWNED by the caller are counted (owner = auth.uid()).
--     Honest approximation, documented here: media other people sent to
--     you is owned by the sender, so it is NOT counted in your total.
--     Objects with missing metadata contribute 0 bytes to their bucket
--     (sum ignores nulls) — no hardcoded numbers are returned.
-- SECURITY DEFINER so the function can read storage.objects regardless
-- of Storage RLS; the owner filter is the enforcement.
create or replace function public.get_storage_usage()
returns table (
  images_bytes bigint,
  files_bytes bigint,
  voice_bytes bigint,
  total_bytes bigint
) as $$
  select
    coalesce(sum((o.metadata ->> 'size')::bigint) filter (where o.metadata ->> 'mimetype' like 'image/%'), 0),
    coalesce(sum((o.metadata ->> 'size')::bigint) filter (where o.metadata ->> 'mimetype' not like 'image/%' and o.metadata ->> 'mimetype' not like 'audio/%'), 0),
    coalesce(sum((o.metadata ->> 'size')::bigint) filter (where o.metadata ->> 'mimetype' like 'audio/%'), 0),
    coalesce(sum((o.metadata ->> 'size')::bigint), 0)
  from storage.objects o
  where o.bucket_id = 'chat-media'
    and o.owner = auth.uid();
$$ language sql security definer stable set search_path = public, storage, pg_temp;

grant execute on function public.get_storage_usage() to authenticated;
