-- Lets the retention job delete test reports older than 24 hours. Supabase's default privileges
-- may already give service_role every privilege on public tables; this states the one it needs.
-- The cascades on report_emails and interest_clicks run as those tables' owner, so neither needs a
-- delete grant.
-- openspec/specs/data-retention/spec.md

grant delete on public.reports to service_role;
