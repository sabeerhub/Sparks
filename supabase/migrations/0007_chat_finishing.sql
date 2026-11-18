-- ============================================================================
-- Sparks — Migration 0007: finish the Chats phase
-- ─────────────────────────────────────────────────────────────────────────
-- Three things, all inside Chats:
--   1. `messages.is_forwarded` — the "Forwarded" label. The client sets
--      it with a plain update after sending (see services/
--      message-service.ts markForwarded), which degrades gracefully:
--      before this migration runs, the update simply fails and the
--      message still delivers, just without the label.
--   2. New-message notifications. Until now only missed calls created a
--      notification row (0006), so the Activity screen stayed empty when
--      messages arrived. This trigger creates one per message for the
--      other member — title is the sender's name, body is a short
--      preview (never more than a preview). It skips: muted chats,
--      senders the recipient blocked, and self-chats (sender is the
--      only member, so there is no one to notify). It uses the existing
--      'message' type — no new NotificationType was needed. The client
--      clears a chat's notifications when the thread opens (see
--      services/notification-service.ts markChatNotificationsRead), so
--      a notification only stays unread while you are NOT looking at
--      that chat — the database cannot know which screen is open.
--   3. Auto-unarchive. A new message in an archived chat brings it
--      back to the main list (WhatsApp behaviour), for both members —
--      sending or receiving unarchives. The thread also unarchives on
--      send from the client, so the sender's side works before this
--      migration is run; this trigger is what covers the recipient.
--
-- LOCAL ONLY — like 0006, this is written for the project, not applied
-- by this repo. Run it in the Supabase SQL Editor (in order, after
-- 0006) before the new-message notifications and the "Forwarded"
-- label work live. Everything else in v1.5.1 works without it.
-- ============================================================================

-- ─── 1. messages.is_forwarded ─────────────────────────────────────────────
alter table public.messages
  add column if not exists is_forwarded boolean not null default false;

-- ─── 2. new-message notifications ─────────────────────────────────────────
create or replace function public.notify_new_message()
returns trigger as $$
declare
  v_member record;
  v_sender_name text;
  v_body text;
begin
  select full_name into v_sender_name
  from public.profiles where id = new.sender_id;

  if new.content_type = 'image' then
    v_body := 'Photo';
  elsif new.content_type = 'voice' then
    v_body := 'Voice message';
  elsif new.content_type = 'file' then
    v_body := coalesce(new.content, 'File');
  else
    v_body := left(coalesce(new.content, ''), 120);
  end if;

  for v_member in
    select user_id, is_muted
    from public.chat_members
    where chat_id = new.chat_id
      and user_id <> new.sender_id
  loop
    -- Muted chats stay silent.
    if v_member.is_muted then
      continue;
    end if;

    -- Blocked senders never notify.
    if exists (
      select 1 from public.blocked_users
      where blocker_id = v_member.user_id
        and blocked_id = new.sender_id
    ) then
      continue;
    end if;

    insert into public.notifications (user_id, type, title, body, related_chat_id, related_user_id)
    values (
      v_member.user_id,
      'message',
      coalesce(v_sender_name, 'New message'),
      v_body,
      new.chat_id,
      new.sender_id
    );
  end loop;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- Drop first so the file can be run again safely — CREATE TRIGGER has
-- no IF NOT EXISTS, so a second run used to die here with 42710.
drop trigger if exists trg_notify_new_message on public.messages;

create trigger trg_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- ─── 3. auto-unarchive on new message ─────────────────────────────────────
create or replace function public.unarchive_chat_on_message()
returns trigger as $$
begin
  update public.chat_members
  set is_archived = false
  where chat_id = new.chat_id
    and is_archived = true;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- Same drop-first guard as above: safe to re-run.
drop trigger if exists trg_unarchive_on_message on public.messages;

create trigger trg_unarchive_on_message
  after insert on public.messages
  for each row execute function public.unarchive_chat_on_message();
