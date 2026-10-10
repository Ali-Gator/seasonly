# data-retention Specification

## Purpose

Deletes what Seasonly promises not to keep: face crops after 24 hours and test reports from previews, local runs and CI. It also defines how a person's request to delete their data is handled. Everything else is kept until the person asks.

## Public Interface

```typescript
// apps/web/src/lib/retention/retention.ts
export const PAGE = 100; // crops per listing
export type CropEntry = { name: string; id: string | null; created_at: string | null };
export type ListCrops = () => PromiseLike<{ data: CropEntry[] | null; error: unknown }>;
export type RemoveCrops = (
  names: string[],
) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
export type DeleteTestReports = (
  cutoff: string,
) => PromiseLike<{ count: number | null; error: unknown }>;
export function deleteOldCrops(
  cutoff: Date,
  deps?: { list?: ListCrops; remove?: RemoveCrops },
): Promise<number>;
export function runRetention(deps?: {
  now?: Date;
  list?;
  remove?;
  deleteTestReports?;
}): Promise<{ crops: number; testReports: number }>;
```

| Surface                                            | What                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `GET /api/cron/retention`                          | `Authorization: Bearer $CRON_SECRET`; 200 `{ crops, testReports }`, 401, or 500 via Sentry |
| `apps/web/vercel.json`                             | `{ "crons": [{ "path": "/api/cron/retention", "schedule": "0 4 * * *" }] }`                |
| `supabase/migrations/20261010084236_retention.sql` | `grant delete on public.reports to service_role`                                           |
| `CRON_SECRET`                                      | phase 1, required, server only (`openspec/specs/env/spec.md`)                              |
| `docs/privacy-requests.md`                         | the runbook for a request by report link or by address                                     |

## Behavior

The cutoff is exactly 24 hours before the run. `deleteOldCrops` lists the `crops` bucket root sorted by `created_at` ascending, 100 at a time, keeps the entries with an id and a `created_at` before the cutoff, removes them, and lists again from the start until a listing holds none. A remove may return fewer objects than asked when one is already gone; a name that lists again after its remove throws. `runRetention` deletes crops first, then `delete from reports where is_test and created_at < cutoff` (supabase-js, `count: "exact"`); `report_emails` and `interest_clicks` go by cascade, which Postgres runs as the tables' owner. A storage error stops the run before the database step.

The route compares the header with `Bearer ${CRON_SECRET}` in constant time. An unset or empty secret refuses every request and sends a Sentry message. The route is not in `BOTID_PROTECT`: a cron request carries no BotID challenge.

Proven on 2026-10-10 on a preview against the production project: 200 `{"crops":1,"testReports":1}` on seeded data, 401 without the header or with a wrong token, and the fresh crop and report kept.

## Edge Cases

- Vercel Hobby runs a cron once a day, ±59 min, so a crop can stay up to about 49 h while the pages say 24 h (BL-18, deferred until Vercel Pro or before paid promotion).
- A run that fails leaves the rest for the next one: selection is by age alone.
- Vercel can deliver a cron twice; the second run finds nothing old, or tolerates a crop the first removed.
- Supabase's default privileges already gave `service_role` delete on `reports`; the migration states the grant explicitly.
- The Free plan has no automatic backups, so a deleted row is gone. Copies held by the services on `/privacy` (Resend's 30-day log, Sentry, PostHog) are not reached by a deletion request.
- Addresses are stored trimmed and lowercased; the runbook matches `lower(trim('<address>'))`.

## Requirements

### Requirement: The job deletes face crops older than 24 hours

Each run of the retention job SHALL delete every crop in the `crops` bucket (one `<report id>.jpg` per photo report, at the bucket root) that was created more than 24 hours before the run, and SHALL leave every younger object. A crop is selected by its age alone, so a crop that a missed or failed run left behind is deleted by the next run that succeeds. The job SHALL delete every old crop however many there are, not only the first page of a listing.

#### Scenario: An old crop

- **WHEN** the job runs and a crop was stored 25 hours earlier
- **THEN** the crop is deleted and `/api/face/<id>` answers 404

#### Scenario: A young crop

- **WHEN** the job runs and a crop was stored 23 hours earlier
- **THEN** the crop is kept

#### Scenario: After a missed run

- **WHEN** one daily run did not happen and the next run finds crops stored 47 hours earlier
- **THEN** those crops are deleted

#### Scenario: More old crops than one listing holds

- **WHEN** the job runs and 250 crops are older than 24 hours
- **THEN** all 250 are deleted

### Requirement: The job deletes test reports older than 24 hours

Each run SHALL delete every report marked `is_test` that was created more than 24 hours before the run, together with its stored addresses and its interest record. It SHALL NOT delete any report that is not marked `is_test`, however old.

#### Scenario: An old test report

- **WHEN** the job runs and an `is_test` report from 25 hours earlier has two addresses and an interest record
- **THEN** the report, both addresses and the interest record are deleted

#### Scenario: A real report

- **WHEN** the job runs and a report that is not `is_test` was created a year earlier
- **THEN** the report, its addresses and its interest record are kept

#### Scenario: A fresh test report

- **WHEN** the job runs and an `is_test` report was created an hour earlier
- **THEN** it is kept

### Requirement: The job runs daily, only for the cron secret

`GET /api/cron/retention` SHALL run the job only when the request carries `Authorization: Bearer <CRON_SECRET>`. It SHALL answer every other request with 401 and delete nothing. While `CRON_SECRET` is unset, it SHALL answer every request with 401.

A run that succeeds SHALL answer 200 with the number of crops and the number of test reports it deleted. A storage or database error SHALL stop the run, answer 500 and be reported to Sentry. Whatever the run deleted before the error stays deleted, and the next run deletes the rest. The production deployment SHALL schedule the route once a day.

**Unenforced:** the schedule fires only on the production deployment. It is proven once by the cron listed for the production deployment and by the first scheduled run's log, both recorded in the change's tasks.

#### Scenario: No secret

- **WHEN** the route is requested without an `Authorization` header
- **THEN** it answers 401 and nothing is deleted

#### Scenario: A wrong secret

- **WHEN** the route is requested with a bearer token other than `CRON_SECRET`
- **THEN** it answers 401 and nothing is deleted

#### Scenario: The secret is not configured

- **WHEN** `CRON_SECRET` is unset and the route is requested with `Authorization: Bearer undefined`
- **THEN** it answers 401 and nothing is deleted

#### Scenario: A run

- **WHEN** the route is requested with the right secret, and 3 old crops and 1 old test report exist
- **THEN** it answers 200 with 3 crops and 1 test report deleted

#### Scenario: Storage fails

- **WHEN** listing the crops fails during a run
- **THEN** the route answers 500 and the error reaches Sentry

### Requirement: A deletion request is honored within 30 days

A request sent to the contact address on `/privacy` SHALL be answered within 30 days. A request that gives a report link SHALL delete that report's record, its addresses, its interest record and its crop. A request that gives only an email address SHALL delete every stored copy of that address. It SHALL keep the reports the address was stored under, because the address alone does not show who owns them.

**Unenforced:** requests are handled by hand, following the procedure in `docs/privacy-requests.md`. The procedure is tried once on a test report, and the result is recorded in the change's tasks.

#### Scenario: A request with a report link

- **WHEN** a person sends their report link and asks for deletion
- **THEN** the report, its addresses, its interest record and its crop are deleted, and the link answers 404

#### Scenario: A request with an address only

- **WHEN** a person sends only their email address and asks for deletion
- **THEN** that address is removed from every report it was stored under, and those reports remain
