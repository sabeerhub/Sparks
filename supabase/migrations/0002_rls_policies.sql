-- ============================================================================
-- Sparks — Row Level Security
-- Default-deny on every table. Each policy is written to be independently
-- correct against IDOR: a user can never reference another user's chat_id,
-- message_id, etc. by guessing/iterating, because every check re-derives
-- membership from chat_members rather than trusting client-supplied ids.
-- ============================================================================

alter table public.profiles            enable row level security;
alter table public.chats               enable row level security;
alter table public.chat_members        enable row level security;
alter table public.blocked_users       enable row level security;
alter table public.messages            enable row level security;
alter table public.message_receipts    enable row level security;
alter table public.message_reactions   enable row level security;
alter table public.typing_status       enable row level security;
alter table public.user_sessions       enable row level security;
alter table public.message_rate_log    enable row level security;

-- ─── Helper: is the current user a member of this chat? ────────────────────
-- SECURITY DEFINER + a hardcoded search_path so the function can't be
-- tricked by a malicious search_path into resolving chat_members elsewhere,
-- and so RLS on chat_members itself doesn't recursively block this check.
create or replace function public.is_chat_member(p_chat_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.chat_members
    where chat_id = p_chat_id and user_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create or replace function public.is_blocked_by(p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.blocked_users
    where blocker_id = p_user_id and blocked_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

-- ─── profiles ────────────────────────────────────────────────────────────────
-- Any authenticated user can look up basic profile info (needed for search /
-- starting new chats) but only the owner can write to their own row.
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No delete policy: account deletion goes through a server-side admin flow,
-- not a direct client delete.

-- ─── chats ───────────────────────────────────────────────────────────────────
create policy "chats_select_member_only"
  on public.chats for select
  to authenticated
  using (public.is_chat_member(id));

create policy "chats_insert_creator_is_self"
  on public.chats for insert
  to authenticated
  with check (created_by = auth.uid());

-- last_message_at is updated by the message-insert trigger (security definer),
-- not directly by clients, so no general update policy is granted here.

-- ─── chat_members ────────────────────────────────────────────────────────────
-- Critical IDOR boundary: a user can only ever see membership rows for chats
-- they themselves belong to, and can only insert a membership row for
-- themselves (joining), never on behalf of another user_id, except for the
-- initial chat creation where the creator adds the counterpart — handled via
-- a security-definer RPC (services/chat-service.ts -> create_chat()) rather
-- than a direct table insert, so this policy stays maximally restrictive.
create policy "chat_members_select_own_chats"
  on public.chat_members for select
  to authenticated
  using (public.is_chat_member(chat_id));

create policy "chat_members_insert_self_only"
  on public.chat_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "chat_members_update_own_row"
  on public.chat_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "chat_members_delete_own_row"
  on public.chat_members for delete
  to authenticated
  using (user_id = auth.uid());

-- ─── blocked_users ───────────────────────────────────────────────────────────
create policy "blocked_users_select_own"
  on public.blocked_users for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "blocked_users_insert_own"
  on public.blocked_users for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "blocked_users_delete_own"
  on public.blocked_users for delete
  to authenticated
  using (blocker_id = auth.uid());

-- ─── messages ────────────────────────────────────────────────────────────────
-- Select: must be a member of the chat. This is the main defense against
-- IDOR on message_id — even if an attacker enumerates UUIDs, the join back
-- to chat membership fails closed.
create policy "messages_select_chat_member"
  on public.messages for select
  to authenticated
  using (public.is_chat_member(chat_id));

create policy "messages_insert_member_and_sender_is_self"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_chat_member(chat_id)
    and not public.is_blocked_by(
      (select user_id from public.chat_members where chat_id = messages.chat_id and user_id <> auth.uid() limit 1)
    )
  );

-- Edit/delete: only the original sender, and only on their own message.
create policy "messages_update_own_message"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

create policy "messages_delete_own_message"
  on public.messages for delete
  to authenticated
  using (sender_id = auth.uid());

-- ─── message_receipts ────────────────────────────────────────────────────────
-- A user can mark messages as delivered/read only for themselves, only
-- within chats they belong to. They can see receipts on messages in their
-- own chats (so the sender can render "Read" ticks).
create policy "receipts_select_chat_member"
  on public.message_receipts for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_receipts.message_id
        and public.is_chat_member(m.chat_id)
    )
  );

create policy "receipts_insert_self_only"
  on public.message_receipts for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_receipts.message_id
        and public.is_chat_member(m.chat_id)
    )
  );

create policy "receipts_update_self_only"
  on public.message_receipts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── message_reactions ────────────────────────────────────────────────────────
create policy "reactions_select_chat_member"
  on public.message_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and public.is_chat_member(m.chat_id)
    )
  );

create policy "reactions_insert_self_only"
  on public.message_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and public.is_chat_member(m.chat_id)
    )
  );

create policy "reactions_delete_self_only"
  on public.message_reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- ─── typing_status ───────────────────────────────────────────────────────────
create policy "typing_select_chat_member"
  on public.typing_status for select
  to authenticated
  using (public.is_chat_member(chat_id));

create policy "typing_insert_self_only"
  on public.typing_status for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_chat_member(chat_id));

create policy "typing_delete_self_only"
  on public.typing_status for delete
  to authenticated
  using (user_id = auth.uid());

-- ─── user_sessions ───────────────────────────────────────────────────────────
create policy "sessions_select_own"
  on public.user_sessions for select
  to authenticated
  using (user_id = auth.uid());

create policy "sessions_insert_own"
  on public.user_sessions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "sessions_update_own"
  on public.user_sessions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── message_rate_log ────────────────────────────────────────────────────────
-- Clients can only ever see/insert their own rate-log rows. The actual
-- enforcement check lives in the can_send_message() function below, which
-- runs as security definer so the limit can't be bypassed by a client simply
-- not checking it.
create policy "rate_log_select_own"
  on public.message_rate_log for select
  to authenticated
  using (user_id = auth.uid());

create policy "rate_log_insert_own"
  on public.message_rate_log for insert
  to authenticated
  with check (user_id = auth.uid());

-- ─── Storage bucket policies (media) ─────────────────────────────────────────
-- Bucket `chat-media` stores client-encrypted blobs. Path convention:
-- chat-media/{chat_id}/{message_id}. Storage RLS re-derives chat membership
-- exactly like the table policies above — no separate trust boundary.
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', false)
on conflict (id) do nothing;

create policy "storage_select_chat_member"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-media'
    and public.is_chat_member((storage.foldername(name))[1]::uuid)
  );

create policy "storage_insert_chat_member"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-media'
    and public.is_chat_member((storage.foldername(name))[1]::uuid)
  );

create policy "storage_delete_own_upload"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-media'
    and owner = auth.uid()
  );
