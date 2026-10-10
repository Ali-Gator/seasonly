-- Lets the retention job delete test reports older than 24 hours. The cascades on report_emails
-- and interest_clicks run as those tables' owner, so neither needs a delete grant.
-- openspec/specs/data-retention/spec.md

grant delete on public.reports to service_role;
