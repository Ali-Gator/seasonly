## ADDED Requirements

### Requirement: A photo result's outline is stored next to its crop

Whenever a photo result's crop is stored, the outline the request carried SHALL also be stored, byte for byte, as `<report id>.mask.png` in the same private store. It SHALL be stored after the response is sent, with the same 3 s limit as the crop. A failed or timed-out outline upload SHALL be reported to Sentry and SHALL change nothing else: the crop is still stored, and the response still carries the season and the report id. A request without an outline SHALL store the crop alone. Nothing SHALL be stored under a report id that the crop would not be stored under.

#### Scenario: A photo result with an outline

- **WHEN** a photo analysis with an outline is saved under a report id
- **THEN** the crop is stored as `<report id>.jpg` and the outline as `<report id>.mask.png`, both after the response is sent

#### Scenario: A photo result without an outline

- **WHEN** a photo analysis without an outline is saved under a report id
- **THEN** only `<report id>.jpg` is stored

#### Scenario: The outline upload fails

- **WHEN** storing the outline fails or has not finished after 3 s
- **THEN** the crop is still stored, the response still carries the season and the report id, and Sentry receives the error

#### Scenario: Nothing to store the outline under

- **WHEN** a result with an outline gets a null report id from the save
- **THEN** neither the crop nor the outline is stored

### Requirement: The outline route serves a stored outline and nothing else

`GET /api/face/<report id>/mask` SHALL answer the stored outline as `image/png`, with `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`. An id that is not 22 URL-safe base64 characters SHALL answer 404 without reaching the store. A report with no stored outline SHALL answer 404, whether it never had one or it was deleted. A store error SHALL answer 500 and be reported to Sentry.

#### Scenario: A stored outline

- **WHEN** `/api/face/<id>/mask` is requested for a report whose outline is stored
- **THEN** it answers 200, `image/png`, `Cache-Control: private, no-store`, and the outline's bytes

#### Scenario: A malformed id

- **WHEN** the outline route receives the id `../reports` or `short`
- **THEN** it answers 404, and the store is not called

#### Scenario: No outline

- **WHEN** `/api/face/<id>/mask` is requested for a report stored without an outline, an unknown id or a deleted outline
- **THEN** it answers 404

## MODIFIED Requirements

### Requirement: Only the server can read or write crops

The crop store SHALL be a private bucket that accepts only `image/jpeg` and `image/png` files of at most 512 KB: the crops and their outlines. No storage policy SHALL let the anonymous or the authenticated role list, read or write it, so only the server's secret key reaches it.

#### Scenario: The bucket's settings

- **WHEN** the crop bucket's migrations are applied
- **THEN** the bucket is not public, allows only `image/jpeg` and `image/png`, limits files to 512 KB, and no storage policy names it
