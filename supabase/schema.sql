-- Street Vibe — metering schema.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run: everything is `if not exists` / `create or replace`.

-- ---------------------------------------------------------------------------
-- users: one row per signed-in Clerk user. `plan` drives the daily quota and
-- is flipped to 'pro' by the Stripe webhook (added in a later step).
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id                 text primary key,                 -- Clerk user id
  email              text,
  plan               text not null default 'free',     -- 'free' | 'pro'
  stripe_customer_id text,
  created_at         timestamptz not null default now(),
  last_seen          timestamptz
);

-- ---------------------------------------------------------------------------
-- usage_daily: one row per subject per UTC day. `subject` is 'user:<clerkId>'
-- for signed-in users, 'ip:<sha256>' for anonymous visitors.
-- ---------------------------------------------------------------------------
create table if not exists public.usage_daily (
  subject         text not null,
  day             date not null,
  translate_count integer not null default 0,
  tts_count       integer not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (subject, day)
);

-- Tables are reached only through the service-role key in the API routes.
-- Lock out anon/authenticated client access entirely.
alter table public.users       enable row level security;
alter table public.usage_daily enable row level security;

-- ---------------------------------------------------------------------------
-- consume_usage: atomically count one use and report the quota state.
-- Returns (plan, used, limit, allowed). Increment-first — a blocked call still
-- counts, which keeps the check race-free.
-- ---------------------------------------------------------------------------
create or replace function public.consume_usage(
  p_user_id text,
  p_ip_hash text,
  p_kind    text,
  p_day     date
)
returns table (plan text, used integer, "limit" integer, allowed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject text;
  v_plan    text;
  v_limit   integer;
  v_used    integer;
begin
  if p_user_id is not null and p_user_id <> '' then
    v_subject := 'user:' || p_user_id;
    select u.plan into v_plan from public.users u where u.id = p_user_id;
    if v_plan is null then
      insert into public.users (id) values (p_user_id) on conflict (id) do nothing;
      v_plan := 'free';
    end if;
  else
    v_subject := 'ip:' || coalesce(p_ip_hash, 'unknown');
    v_plan := 'anon';
  end if;

  v_limit := case
    when v_plan = 'pro'  then 1000000
    when v_plan = 'free' and p_kind = 'translate' then 30
    when v_plan = 'free' and p_kind = 'tts'       then 15
    when v_plan = 'anon' and p_kind = 'translate' then 6
    when v_plan = 'anon' and p_kind = 'tts'       then 3
    else 6
  end;

  insert into public.usage_daily (subject, day, translate_count, tts_count)
  values (
    v_subject, p_day,
    case when p_kind = 'translate' then 1 else 0 end,
    case when p_kind = 'tts'       then 1 else 0 end
  )
  on conflict (subject, day) do update set
    translate_count = public.usage_daily.translate_count + (case when p_kind = 'translate' then 1 else 0 end),
    tts_count       = public.usage_daily.tts_count       + (case when p_kind = 'tts'       then 1 else 0 end),
    updated_at      = now()
  returning (case when p_kind = 'translate' then translate_count else tts_count end) into v_used;

  return query select v_plan, v_used, v_limit, (v_used <= v_limit);
end;
$$;

-- ---------------------------------------------------------------------------
-- peek_usage: read today's counts for both kinds without incrementing.
-- ---------------------------------------------------------------------------
create or replace function public.peek_usage(
  p_user_id text,
  p_ip_hash text,
  p_day     date
)
returns table (plan text, translate_used integer, tts_used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject text;
  v_plan    text;
  v_row     public.usage_daily%rowtype;
begin
  if p_user_id is not null and p_user_id <> '' then
    v_subject := 'user:' || p_user_id;
    select u.plan into v_plan from public.users u where u.id = p_user_id;
    v_plan := coalesce(v_plan, 'free');
  else
    v_subject := 'ip:' || coalesce(p_ip_hash, 'unknown');
    v_plan := 'anon';
  end if;

  select * into v_row from public.usage_daily where subject = v_subject and day = p_day;
  return query select v_plan, coalesce(v_row.translate_count, 0), coalesce(v_row.tts_count, 0);
end;
$$;

-- Allow the service role to execute the helpers (RLS is bypassed for it anyway,
-- but functions still need execute rights).
grant execute on function public.consume_usage(text, text, text, date) to service_role;
grant execute on function public.peek_usage(text, text, date) to service_role;
