-- The daily cap on vision calls: one row per UTC day, claimed only through
-- claim_analysis_slot, which runs only with the server's secret key.
-- openspec/specs/abuse-controls/spec.md

create table public.analysis_daily_count (
  day date primary key,
  count integer not null
);

-- RLS with no policies, and Supabase's default grants on public revoked, so only the
-- function below (security definer) touches the table.
alter table public.analysis_daily_count enable row level security;
revoke all on public.analysis_daily_count from anon, authenticated;

-- true when a slot is granted; null once today's count has reached cap. The upsert
-- locks the day's row, so a concurrent claim waits and re-checks count < cap.
create function public.claim_analysis_slot(cap integer) returns boolean
  language sql security definer set search_path = '' as $$
  insert into public.analysis_daily_count as c (day, count)
  values ((now() at time zone 'utc')::date, 1)
  on conflict (day) do update set count = c.count + 1 where c.count < cap
  returning true
$$;

revoke execute on function public.claim_analysis_slot(integer) from public, anon, authenticated;
grant execute on function public.claim_analysis_slot(integer) to service_role;
