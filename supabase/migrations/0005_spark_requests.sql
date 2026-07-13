-- ============================================================================
-- Sparks — Migration 0005: Spark Request System
-- ============================================================================

create table public.spark_requests (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  receiver_id   uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined')),
  message       text check (char_length(message) <= 200),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint spark_requests_no_self_request check (sender_id <> receiver_id),
  constraint spark_requests_unique_pair unique (sender_id, receiver_id)
);

create index idx_spark_requests_receiver on public.spark_requests (receiver_id, status);
create index idx_spark_requests_sender on public.spark_requests (sender_id);

create trigger trg_spark_requests_updated_at
  before update on public.spark_requests
  for each row execute function public.set_updated_at();

alter table public.spark_requests enable row level security;

create policy "spark_requests_select_own"
  on public.spark_requests for select
  to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "spark_requests_insert_sender"
  on public.spark_requests for insert
  to authenticated
  with check (sender_id = auth.uid());

create policy "spark_requests_update_receiver"
  on public.spark_requests for update
  to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());

create or replace function public.has_accepted_spark(p_other_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.spark_requests
    where status = 'accepted'
      and (
        (sender_id = auth.uid() and receiver_id = p_other_user_id)
        or
        (sender_id = p_other_user_id and receiver_id = auth.uid())
      )
  );
$$ language sql security definer stable set search_path = public, pg_temp;

grant execute on function public.has_accepted_spark(uuid) to authenticated;

create or replace function public.send_spark_request(
  p_receiver_id uuid,
  p_message     text default null
)
returns public.spark_requests as $$
declare
  v_existing public.spark_requests;
  v_result   public.spark_requests;
begin
  if p_receiver_id = auth.uid() then
    raise exception 'Cannot send a Spark Request to yourself';
  end if;

  if public.is_blocked_by(p_receiver_id) then
    raise exception 'Unable to send request to this user';
  end if;

  if public.has_accepted_spark(p_receiver_id) then
    raise exception 'Already connected with this user';
  end if;

  select * into v_existing
  from public.spark_requests
  where sender_id = p_receiver_id
    and receiver_id = auth.uid()
    and status = 'pending';

  if found then
    update public.spark_requests
    set status = 'accepted', updated_at = now()
    where id = v_existing.id
    returning * into v_result;
    return v_result;
  end if;

  select * into v_existing
  from public.spark_requests
  where sender_id = auth.uid()
    and receiver_id = p_receiver_id;

  if found then
    if v_existing.status = 'pending' then
      raise exception 'Request already pending';
    end if;
    if v_existing.status = 'declined'
      and v_existing.updated_at > now() - interval '24 hours' then
      raise exception 'Wait 24 hours before resending a request';
    end if;
    update public.spark_requests
    set status = 'pending',
        message = p_message,
        updated_at = now()
    where id = v_existing.id
    returning * into v_result;
    return v_result;
  end if;

  insert into public.spark_requests (sender_id, receiver_id, message)
  values (auth.uid(), p_receiver_id, p_message)
  returning * into v_result;

  return v_result;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

grant execute on function public.send_spark_request(uuid, text) to authenticated;

create or replace function public.respond_to_spark_request(
  p_request_id uuid,
  p_accept     boolean
)
returns uuid as $$
declare
  v_request public.spark_requests;
  v_chat_id uuid;
begin
  select * into v_request
  from public.spark_requests
  where id = p_request_id
    and receiver_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'Request not found or already responded to';
  end if;

  if p_accept then
    update public.spark_requests
    set status = 'accepted', updated_at = now()
    where id = p_request_id;

    insert into public.chats (created_by)
    values (v_request.sender_id)
    returning id into v_chat_id;

    insert into public.chat_members (chat_id, user_id)
    values (v_chat_id, v_request.sender_id);

    insert into public.chat_members (chat_id, user_id)
    values (v_chat_id, auth.uid());

    return v_chat_id;
  else
    update public.spark_requests
    set status = 'declined', updated_at = now()
    where id = p_request_id;

    return null;
  end if;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

grant execute on function public.respond_to_spark_request(uuid, boolean) to authenticated;

create or replace function public.create_direct_chat(p_other_user_id uuid)
returns uuid as $$
declare
  v_existing_chat_id uuid;
  v_chat_id uuid;
begin
  if p_other_user_id = auth.uid() then
    raise exception 'Cannot create a chat with yourself';
  end if;

  if public.is_blocked_by(p_other_user_id) then
    raise exception 'Unable to start chat with this user';
  end if;

  if not public.has_accepted_spark(p_other_user_id) then
    raise exception 'Send a Spark Request first to start chatting';
  end if;

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
$$ language plpgsql security definer set search_path = public, pg_temp;

alter publication supabase_realtime add table public.spark_requests;
