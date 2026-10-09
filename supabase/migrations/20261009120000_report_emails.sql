-- The addresses a report's email went to, written only by the report email route with the
-- server's secret key, through store_report_email. Rows from previews, local runs and CI are
-- is_test. Deleting a report deletes its addresses.
-- openspec/specs/email-capture/spec.md

create table public.report_emails (
  id bigint generated always as identity primary key,
  report_id text not null references public.reports (id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  created_at timestamptz not null default now(),
  is_test boolean not null
);

create index report_emails_report_id_created_at on public.report_emails (report_id, created_at desc);

-- RLS with no policies, and Supabase's default grants on public revoked, so only the server's
-- role reads and writes.
alter table public.report_emails enable row level security;
revoke all on public.report_emails from public, anon, authenticated;
grant select, insert on public.report_emails to service_role;

-- 'stored' with the new row's id, 'limit' once the report has 3 addresses, 'unknown' for no
-- report. Locking the report row makes the count and the insert one step, so two calls at once
-- cannot both pass 3. Security definer, as claim_analysis_slot, so the lock does not depend on
-- the caller's grants on reports.
-- openspec/specs/abuse-controls/spec.md
create function public.store_report_email(p_report_id text, p_email text, p_is_test boolean)
  returns table (outcome text, email_id bigint)
  language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.reports where id = p_report_id for update;
  if not found then
    return query select 'unknown'::text, null::bigint;
    return;
  end if;
  if (select count(*) from public.report_emails e where e.report_id = p_report_id) >= 3 then
    return query select 'limit'::text, null::bigint;
    return;
  end if;
  return query
    insert into public.report_emails (report_id, email, is_test)
    values (p_report_id, p_email, p_is_test)
    returning 'stored'::text, id;
end
$$;

revoke execute on function public.store_report_email(text, text, boolean) from public, anon, authenticated;
grant execute on function public.store_report_email(text, text, boolean) to service_role;
