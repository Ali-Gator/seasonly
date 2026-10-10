# Privacy requests

How a request sent to `care@seasonly.me` is handled. Requests are rare in the beta, so this is done
by hand. Answer every request within 30 days of receiving it.

Spec: `openspec/specs/data-retention/spec.md` (A deletion request is honored within 30 days).

## 1. Confirm who is asking

- **A report link** (`https://seasonly.me/r/<id>`): whoever holds the link controls the report. Take the
  22-character id from the link.
- **An email address only**: reply to that address and ask the person to confirm the request from it.
  Act only on a request that comes from the address itself.

## 2. Find the data

In the Supabase dashboard, project `seasonly`, SQL editor (it runs as the owner, so no grant is needed):

```sql
-- By report link
select id, created_at, season, is_test from public.reports where id = '<id>';
select email, created_at from public.report_emails where report_id = '<id>';
select created_at from public.interest_clicks where report_id = '<id>';

-- By address
select report_id, created_at from public.report_emails where email = lower(trim('<address>'));
```

For a request for a copy, send the rows above, with the report link, as the reply. For a correction,
the only editable data is an address: delete the wrong one and tell the person to send the report again
to the right one.

## 3. Delete

**By report link**: the report, its addresses, its interest record and its crop.

1. Storage → bucket `crops` → delete `<id>.jpg` if it is there (the daily job removes it after 24 h
   anyway).
2. Run:

   ```sql
   delete from public.reports where id = '<id>';
   ```

   The cascades delete its `report_emails` and `interest_clicks` rows.

3. Check that `https://seasonly.me/r/<id>` answers 404.

**By address only**: every stored copy of the address. Addresses are stored trimmed and lowercased,
so match them the same way. The reports stay, because the address alone
does not show who owns them.

```sql
delete from public.report_emails where email = lower(trim('<address>'));
```

## 4. Answer

Reply from `care@seasonly.me` saying what was deleted and when. Copies held by the services on
`/privacy` (Resend's 30-day email log, Sentry's error reports, PostHog's anonymous events) are not
reached by this; the policy says so, and the reply can repeat it.

Keep a one-line note of each request (date received, kind, date answered) outside the database.
