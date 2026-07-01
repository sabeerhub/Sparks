-- ============================================================================
-- Sparks — Migration 0004: Device metadata for session management
-- ─────────────────────────────────────────────────────────────────────────
-- Extends user_sessions with device metadata fields for the Settings →
-- Security → Device Management screen. Also adds:
--   - is_username_available() RPC for anonymous signup checks
--   - cleanup_failed_signup() RPC for signup rollback
--   - email_for_username() RPC for username-based login
--   - Case-insensitive username uniqueness index
--   - search_path hardening for all existing security-definer functions
-- ============================================================================

alter table public.user_sessions
  add column if not exists browser          text,
  add column if not exists os_name          text,
  add column if not exists device_type      text check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  add column if not exists ip_address       text,
  add column if not exists location_city    text,
  add column if not exists location_country text,
  add column if not exists user_agent       text;

create index if not exists idx_user_sessions_refresh_token
  on public.user_sessions (refresh_token_id);

-- Note: "remove a device" in the UI sets revoked_at (soft-revoke), never
-- a hard delete — preserves audit trail, no DELETE RLS policy needed.

-- ─── Anonymous username availability check ─────────────────────────────────
create or replace function public.is_username_available(p_username text)
returns boolean as $$
begin
  return not exists (
    select 1 from public.profiles where username = lower(p_username)
  );
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

grant execute on function public.is_username_available(text) to anon, authenticated;

-- ─── Case-insensitive username uniqueness ──────────────────────────────────
-- Defensive pre-check: surface a clear error if any existing data would
-- violate this before attempting to create the index.
do $$
declare
  v_conflict_count integer;
begin
  select count(*) into v_conflict_count
  from (
    select lower(username)
    from public.profiles
    group by lower(username)
    having count(*) > 1
  ) dupes;

  if v_conflict_count > 0 then
    raise exception
      'Cannot apply case-insensitive username uniqueness: % existing username(s) differ only by case. Resolve manually before re-running this migration.',
      v_conflict_count;
  end if;
end $$;

create unique index if not exists idx_profiles_username_lower
  on public.profiles (lower(username));

-- ─── Harden existing SECURITY DEFINER functions search_path ───────────────
-- Postgres recommends including pg_temp as the last element of search_path
-- on every SECURITY DEFINER function. The original migrations set only
-- `search_path = public` — this retroactively hardens all existing ones.
alter function public.is_chat_member(uuid) set search_path = public, pg_temp;
alter function public.is_blocked_by(uuid) set search_path = public, pg_temp;
alter function public.create_direct_chat(uuid) set search_path = public, pg_temp;
alter function public.can_send_message(int) set search_path = public, pg_temp;
alter function public.send_message(uuid, text, text, text, text, uuid) set search_path = public, pg_temp;
alter function public.cleanup_stale_typing_status() set search_path = public, pg_temp;
alter function public.prune_rate_log() set search_path = public, pg_temp;

-- ─── Signup rollback helper ─────────────────────────────────────────────────
-- Deletes an orphaned auth.users row (no profile yet) by email. Uses email
-- not auth.uid() because no session exists when "Confirm email" is ON.
-- Time-window guard prevents griefing: only cleans up rows that are either
-- very fresh (same-request rollback) or truly abandoned (>24h old) —
-- not accounts that are legitimately mid-confirmation.
create or replace function public.cleanup_failed_signup(p_email text)
returns void as $$
declare
  v_uid uuid;
  v_created_at timestamptz;
begin
  select id, created_at into v_uid, v_created_at
  from auth.users where email = p_email;

  if v_uid is null then
    return;
  end if;

  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Refusing to clean up: this account already has a profile';
  end if;

  -- Only delete if fresh enough to be a same-request rollback (<5 min)
  -- or old enough to be truly abandoned (>24h). The middle window is
  -- where a griefing attack would otherwise be possible.
  if v_created_at > now() - interval '5 minutes'
  or v_created_at < now() - interval '24 hours' then
    delete from auth.users where id = v_uid;
  end if;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

grant execute on function public.cleanup_failed_signup(text) to anon, authenticated;

-- ─── Username → email lookup for login ─────────────────────────────────────
-- Returns only the email for a given username — nothing else — so the login
-- page can accept username+password without exposing full profile data to
-- anonymous callers. Returns null on no match (not an error, so timing is
-- similar whether the username exists or not).
create or replace function public.email_for_username(p_username text)
returns text as $$
declare
  v_email text;
begin
  select au.email into v_email
  from public.profiles p
  join auth.users au on au.id = p.id
  where p.username = lower(p_username);

  return v_email;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

grant execute on function public.email_for_username(text) to anon, authenticated;
