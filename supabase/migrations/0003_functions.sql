-- ============================================================================
-- Sparks — Functions: chat creation RPC, server-side rate limiting,
-- and ephemeral data cleanup (typing status, rate log pruning).
-- ============================================================================

-- ─── create_direct_chat ──────────────────────────────────────────────────────
-- Why this needs to be an RPC rather than two plain inserts from the client:
-- chat_members_insert_self_only only allows a user to insert a row for
-- themselves. Creating a 1-to-1 chat requires inserting the OTHER person's
-- membership row too. A security-definer function is the narrow, auditable
-- exception to that rule — it still re-validates the caller server-side
-- before doing anything on their behalf.
create or replace function public.create_direct_chat(p_other_user_id uuid)
returns uuid as $$
declare
  v_chat_id uuid;
  v_existing_chat_id uuid;
begin
  if p_other_user_id = auth.uid() then
    raise exception 'Cannot create a chat with yourself';
  end if;

  if public.is_blocked_by(p_other_user_id) then
    raise exception 'Unable to start chat with this user';
  end if;

  -- Reuse an existing direct chat between these two users if one exists,
  -- rather than creating duplicates.
  select cm1.chat_id into v_existing_chat_id
  from public.chat_members cm1
  join public.chat_members cm2 on cm1.chat_id = cm2.chat_id
  join public.chats c on c.id = cm1.chat_id
  where cm1.user_id = auth.uid()
    and cm2.user_id = p_other_user_id
    and c.is_group = false
  limit 1;

  if v_existing_chat_id is not null then
    return v_existing_chat_id;
  end if;

  insert into public.chats (created_by) values (auth.uid()) returning id into v_chat_id;
  insert into public.chat_members (chat_id, user_id) values (v_chat_id, auth.uid());
  insert into public.chat_members (chat_id, user_id) values (v_chat_id, p_other_user_id);

  return v_chat_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ─── can_send_message ────────────────────────────────────────────────────────
-- Server-side rate limit backstop (client also throttles optimistically in
-- lib/rateLimit.ts — that one's for UX, this one's the actual enforcement).
-- Sliding 60s window, default cap 25 messages/minute.
create or replace function public.can_send_message(p_limit int default 25)
returns boolean as $$
  select count(*) < p_limit
  from public.message_rate_log
  where user_id = auth.uid()
    and sent_at > now() - interval '60 seconds';
$$ language sql security definer stable set search_path = public;

-- ─── send_message ────────────────────────────────────────────────────────────
-- Wraps the rate check + message insert + rate-log insert + last_message_at
-- bump in one transaction so there's no race between "check" and "insert".
create or replace function public.send_message(
  p_chat_id uuid,
  p_ciphertext text,
  p_iv text,
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

  insert into public.messages (chat_id, sender_id, ciphertext, iv, content_type, media_path, reply_to_id)
  values (p_chat_id, auth.uid(), p_ciphertext, p_iv, p_content_type, p_media_path, p_reply_to_id)
  returning id into v_message_id;

  insert into public.message_rate_log (user_id) values (auth.uid());

  update public.chats set last_message_at = now() where id = p_chat_id;

  return v_message_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ─── cleanup_stale_typing_status ─────────────────────────────────────────────
-- Typing rows older than 10s are considered stale (client should also delete
-- its own row on blur/send, this is just a backstop against dropped clients).
create or replace function public.cleanup_stale_typing_status()
returns void as $$
  delete from public.typing_status where started_at < now() - interval '10 seconds';
$$ language sql security definer set search_path = public;

-- ─── prune_rate_log ───────────────────────────────────────────────────────────
-- Keeps message_rate_log from growing unbounded; only the last 60s window
-- is ever read, so anything older is safe to drop.
create or replace function public.prune_rate_log()
returns void as $$
  delete from public.message_rate_log where sent_at < now() - interval '5 minutes';
$$ language sql security definer set search_path = public;

-- Schedule both via pg_cron if the extension is available on your Supabase
-- project (Pro plan+). On Free tier, call these periodically from a Vercel
-- cron route instead (see app/api/cron/cleanup/route.ts).
-- select cron.schedule('cleanup-typing', '*/1 * * * *', 'select public.cleanup_stale_typing_status()');
-- select cron.schedule('prune-rate-log', '*/5 * * * *', 'select public.prune_rate_log()');
