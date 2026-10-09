## Purpose

Deletes what Seasonly promises not to keep: face crops after 24 hours and test reports from previews, local runs and CI. It also defines how a person's request to delete their data is handled. Everything else is kept until the person asks.

## ADDED Requirements

### Requirement: The job deletes face crops older than 24 hours

Each run of the retention job SHALL delete every object in the `crops` bucket that was created more than 24 hours before the run, and SHALL leave every younger object. A crop is selected by its age alone, so a crop that a missed or failed run left behind is deleted by the next run that succeeds. The job SHALL delete every old crop however many there are, not only the first page of a listing.

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
