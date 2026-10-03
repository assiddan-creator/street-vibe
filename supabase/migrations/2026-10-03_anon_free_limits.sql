-- 2026-10-03: anonymous visitors get the same free allowance as signed-in free users
-- (10 translations + 5 voice plays a day), matching the landing page promise.
--
-- Run once in the Supabase SQL editor (Dashboard -> SQL -> New query).
-- Safe to run whether the database currently has the old 4-argument
-- consume_usage or the 5-argument one (with p_tts_limit_override):
--   1. drop the old 4-arg overload if it exists, so there is never more than one
--      consume_usage (two overloads would make the RPC ambiguous -> fail open);
--   2. create or replace the 5-arg function with the new anon limits;
--   3. grant execute on the exact signature to service_role.
-- Usage counts in public.usage_daily are not touched.

begin;

drop function if exists public.consume_usage(text, text, text, date);

create or replace function public.consume_usage(
  p_user_id text,
  p_ip_hash text,
  p_kind    text,
  p_day     date,
  -- Preview-only escape hatch (see USAGE_TTS_DAILY_LIMIT_OVERRIDE in
  -- lib/usage.ts). Applies ONLY to anon/free `tts`, never `translate`, never
  -- `pro`. Defaulting to null means every existing caller that doesn't pass
  -- this argument (Production, every other Preview branch) is completely
  -- unaffected — this is additive, not a change to the old signature's
  -- behavior.
  p_tts_limit_override integer default null
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
    when v_plan = 'free' and p_kind = 'translate' then 10
    when v_plan = 'free' and p_kind = 'tts'       then
      case when p_tts_limit_override > 0 then p_tts_limit_override else 5 end
    -- Anonymous visitors get the same free allowance as signed-in free users.
    when v_plan = 'anon' and p_kind = 'translate' then 10
    when v_plan = 'anon' and p_kind = 'tts'       then
      case when p_tts_limit_override > 0 then p_tts_limit_override else 5 end
    else 4
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

grant execute on function public.consume_usage(text, text, text, date, integer) to service_role;

commit;

-- Verify (should list exactly one row, with 5 arguments):
--   select oid::regprocedure from pg_proc where proname = 'consume_usage';
