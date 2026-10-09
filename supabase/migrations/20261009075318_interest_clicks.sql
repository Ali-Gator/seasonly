-- One row per report whose Premium button was tapped, written only by the interest route with
-- the server's secret key. A repeat tap inserts nothing (on conflict do nothing). Rows from
-- previews, local runs and CI are is_test. Deleting a report deletes its interest.
-- Demand gate: select count(*) from public.interest_clicks where not is_test.
-- openspec/specs/interest-button/spec.md

create table public.interest_clicks (
  report_id text primary key references public.reports (id) on delete cascade,
  created_at timestamptz not null default now(),
  is_test boolean not null
);

-- RLS with no policies, and Supabase's default grants on public revoked, so only the server's
-- role reads and writes.
alter table public.interest_clicks enable row level security;
revoke all on public.interest_clicks from public, anon, authenticated;
grant select, insert on public.interest_clicks to service_role;
