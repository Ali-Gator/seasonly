## Context

See proposal.md for the motivation. Here is what exists today:

- **Crops.** They are stored as `<report id>.jpg` at the root of the private `crops` bucket (`lib/draping/crops.ts`). Nothing deletes them.
- **Grants.** `reports`, `report_emails` and `interest_clicks` grant `service_role` only `select, insert`. Both child tables reference `reports` with `on delete cascade`.
- **Test rows.** Rows written from previews, local runs and CI are tagged `is_test`. Nothing removes them on a schedule.
- **Plan.** Vercel is on Hobby, so a cron job runs at most once a day, at an hourly precision of ±59 min. An hourly schedule fails the deploy.
- **The 24-hour promise.** The consent screen (`_capture/steps.tsx`), the report footer (`lib/report/view.tsx`) and the report email (`lib/email/render.ts`) already say the photo is deleted within 24 hours.
- **Legal pages.** `/privacy` and `/terms` are stubs with `ready: false` in `lib/site/routes.ts`.
- **PostHog.** It keeps its first-party cookie, with no banner. That was the user's choice on 2026-10-09, and `analytics` already records it.
- **Sentry.** It receives report ids on purpose.
- **AI Gateway.** It runs without zero data retention. The vision call sends the crop, the season, the traits and the quiz answers (`lib/report-text/index.ts`).
- **The browser** downloads MediaPipe's wasm from jsDelivr and its models from `storage.googleapis.com` (`lib/capture/mediapipe.ts`), and loads Speed Insights and BotID.

## Goals / Non-Goals

**Goals:**

- A crop never outlives one daily run past its 24 hours.
- Test rows stop piling up.
- `/privacy` and `/terms` describe the system as it is.

**Non-Goals:**

- Hourly deletion, and the Vercel Pro upgrade (the user's choice).
- A cookie banner, PostHog cookieless mode, or masking report ids in Sentry. These are disclosed, not built.
- Self-serve deletion, data export, or an account.
- Deleting real reports on a schedule. They are kept until the person asks (the user's choice).
- Legal advice. The agent drafts from facts. Review is the user's gate.

## Decisions

### 1. Two new capabilities, `data-retention` and `legal-pages`, not the plan's `consent` and `photo-retention`

The consent step lives in `_capture/steps.tsx`, which the `capture-flow` row owns. A `consent` row would overlap it, and rows never overlap. So the consent copy is a `capture-flow` delta.

The job also deletes test reports, and the capability covers how a deletion request is handled, so `data-retention` names it better than `photo-retention`.

The README rows are added at archive:

- `data-retention`: `apps/web/src/app/api/cron/**`, `apps/web/src/lib/retention/**`, `supabase/migrations/*_retention.sql`.
- `legal-pages`: `apps/web/src/app/(site)/privacy/**`, `apps/web/src/app/(site)/terms/**`. These are scoped to the two folders, so `t9-site-content` can map the rest of `(site)` without overlapping them.

The phases table in the plan is renamed to match (task 2.1).

### 2. A daily Vercel Cron at 04:00 UTC with a 24 h cutoff

`apps/web/vercel.json` holds `{ "crons": [{ "path": "/api/cron/retention", "schedule": "0 4 * * *" }] }`. The cutoff is exactly 24 h, so a crop always lasts the full 24 h the report promises for draping.

The worst case is a crop stored just after a run. That crop lasts 24 h, plus the next run's 24 h, plus 59 min of jitter: about 49 h. The user accepted this gap for the beta on 2026-10-09, and it is logged as a backlog item.

Alternatives, all rejected by the user's choice:

- Supabase `pg_cron` with `pg_net`, calling the route hourly. Both are available on the project.
- A GitHub Actions schedule. It is delayed and can skip runs.
- Vercel Pro.
- A 12 h cutoff. That caps the worst case at about 37 h, but would cut the draping short of the promised 24 h.

### 3. A bearer-secret GET route, wrapped like every other route

Vercel Cron sends `GET` with `Authorization: Bearer $CRON_SECRET` when that variable is set. The route works like this:

- It compares the header with `Bearer ${CRON_SECRET}` in constant time (`timingSafeEqual` on equal-length buffers).
- An unset or empty `CRON_SECRET` refuses everything. This closes the `Bearer undefined` hole.
- It is wrapped in `withErrorCapture`, as the observability spec requires.
- It is not added to `BOTID_PROTECT`, because a cron request carries no BotID challenge.

`CRON_SECRET` is phase 1 and required, and it is server only. It goes into the code, `.env.example`, the catalogue in `openspec/specs/env/spec.md` and `scripts/verify-env.ts` together. The catalogue is the spec's Public Interface table and is edited directly, as `RESEND_API_KEY` was.

### 4. Crop deletion pages through a sorted listing until nothing old remains

`lib/retention/` takes injectable `list` and `remove` functions, following the `crops.ts` pattern, and loops:

1. List the bucket root, sorted by `created_at` ascending, limit 100.
2. Keep the names whose `created_at` is before the cutoff.
3. If there are none, stop.
4. `remove` them, then list again from offset 0. The deleted names are gone, so offset 0 is the next batch.

If a `remove` reports fewer deletions than it was asked for, the loop throws instead of spinning. A run deletes everything that is old whenever it runs, so a missed day is caught up. The listing is never offset-paged across deletions, which would skip objects.

### 5. Test reports are deleted with a delete grant on `reports`, and cascades do the rest

`<ts>_retention.sql` is a single line: `grant delete on public.reports to service_role;`. The job runs `delete from reports where is_test and created_at < cutoff` through supabase-js and counts the rows.

Postgres runs the `on delete cascade` actions on `report_emails` and `interest_clicks` as the owner of those tables, so neither child table needs a delete grant. The PGlite test proves the cascade, as `store.test.ts` does for the other tables. PGlite runs as a superuser, so it cannot prove the grant. The first run against Supabase does (task 7.2).

A security-definer function, like `claim_analysis_slot`, would also work. It is not needed, because there is no check to make atomic.

Test reports are deleted after crops. A storage error stops the run before the database step, and the next day retries both.

### 6. Deletion requests are handled by hand from a runbook

`docs/privacy-requests.md` gives the steps:

- confirm the request came from the address, or from someone holding the link;
- delete the crop in the Storage dashboard, if it is under 24 h old;
- run `delete from public.reports where id = '<id>'` in the SQL editor (the cascade removes the addresses and the interest record), or `delete from public.report_emails where email = '<address>'`;
- reply within 30 days.

It is a runbook, not code, because requests will be rare in the beta. The SQL editor runs as the owner, so no grant is needed. It is tried once on a test report (task 7.x).

### 7. The legal pages are static JSX drafted from a fact inventory

Both pages stay server components in their `page.tsx`, using the existing typography classes. They add no MDX and no dependency.

The text is drafted from three sources:

- the migrations, for what is stored;
- a recorded network capture of the photo flow, the email step and a report page on a preview, for who receives data;
- the user's answers on 2026-10-09, for retention, PostHog and Sentry.

The operator's name, country and contact address, the minimum age and the governing law come from the user at the gate. The agent invents none of them. Each page shows a "Last updated" date.

The pages are written in plain language: short sections, one per question a visitor asks. They are not modeled on boilerplate.

### 8. BL-10: one honest line, no status probe

The `<img>` error event cannot tell a 404 from a 500. Probing `/api/face/<id>` with `fetch` to read the status would add a request and a code path only to choose between two lines.

So one line covers both cases: "We couldn't load your photo, so this shows the two colors only." The exact copy is approved on the canvas (task 1.1). If the user changes it there, the report-page delta is updated before the tests cite it.

## Risks / Trade-offs

- [A crop can be stored for about 49 h while the pages say 24 h] → The user accepted this for the beta. It goes in the backlog, deferred until Vercel Pro or before paid promotion (T15). It closes by moving to an hourly scheduler (Pro, or `pg_cron` calling the same route) with no other code change.
- [The PostHog cookie is set without consent, an ePrivacy risk for EU visitors] → It is disclosed on `/privacy`. It goes in the backlog, with the trigger "before paid promotion or a complaint". The fix is `cookieless_mode`, or a banner with `on_reject`.
- [Google may keep the crop for abuse monitoring, without ZDR] → Disclosed. Restored by Vercel Pro and `providerOptions.gateway.zeroDataRetention`.
- [A cron run fails silently] → `withErrorCapture` sends the failure to Sentry. Selecting by age means the next run catches up.
- [`CRON_SECRET` missing in Production] → Every run answers 401, and Vercel's cron log shows it. `verify:env` catches a missing variable locally. The first scheduled run is checked in task 7.x.
- [The agent's text is mistaken for a legal review] → The legal check is a separate user gate with a recorded outcome (review, or a written waiver).
- [The network capture misses a host] → The capture covers all three surfaces (flow, email step, report page) on a deployment, and the page treats a missing service as a defect.

## Migration Plan

1. The user approves the canvas and copy, and gives the operator details (tasks 1.x).
2. Apply `<ts>_retention.sql` to Supabase `seasonly` after the user confirms.
3. Set `CRON_SECRET` in Vercel Production (the user, or the agent with permission).
4. Merge. The production deployment registers the cron.
5. Run the job once from the Vercel dashboard's Cron Jobs tab. Check that the response counts are right and that old test rows are gone.

Rollback: remove the `crons` entry and redeploy. The grant is harmless to keep.
