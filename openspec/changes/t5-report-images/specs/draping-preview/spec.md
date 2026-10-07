## Purpose

Keeps the face crop of a photo analysis under its report id, so the report can show the draping preview: the person's own face on their best color next to their worst. Only the server holds the crop, and the report reaches it by its unguessable id.

## ADDED Requirements

### Requirement: A photo result's crop is stored under its report id

When the analyze route stores a season result from a photo analysis, the face crop it received SHALL be stored byte for byte as `<report id>.jpg` in the private crop store. This holds whether the report text is personal or a fallback. The response SHALL NOT wait for the crop to be stored. Nothing SHALL be stored for a quiz-only result, a rejected photo, a no-result, or a result whose save failed.

#### Scenario: A photo result

- **WHEN** a photo analysis is saved under a report id
- **THEN** the crop it received is stored as `<report id>.jpg`, after the response is sent

#### Scenario: A fallback result with a photo

- **WHEN** a photo analysis falls back to the static text and is saved
- **THEN** its crop is stored too

#### Scenario: Nothing to store under

- **WHEN** a result is quiz-only, the photo is rejected, the answers give no result, or the save gives a null report id
- **THEN** no crop is stored

### Requirement: A failed crop upload changes nothing the person sees

The crop upload SHALL give up after 3 s. A failed or timed-out upload SHALL be reported to Sentry. The response, already sent, carries the season and the report id either way.

#### Scenario: The store is down

- **WHEN** storing the crop fails
- **THEN** the response still carries the season and the report id, and Sentry receives the error

#### Scenario: The store hangs

- **WHEN** storing the crop has not finished after 3 s
- **THEN** the upload is abandoned and Sentry receives a timeout error

### Requirement: Only the server can read or write crops

The crop store SHALL be a private bucket that accepts only `image/jpeg` files of at most 512 KB. No storage policy SHALL let the anonymous or the authenticated role list, read or write it, so only the server's secret key reaches it.

#### Scenario: The bucket's settings

- **WHEN** the crop bucket's migration is applied
- **THEN** the bucket is not public, allows only `image/jpeg`, limits files to 512 KB, and no storage policy names it

### Requirement: The face route serves a stored crop and nothing else

`GET /api/face/<report id>` SHALL answer the stored crop as `image/jpeg` with `Cache-Control: private, no-store`, so no browser or CDN keeps a copy past the crop's deletion. An id that is not 22 URL-safe base64 characters SHALL answer 404 without reaching the store. An id with no stored crop SHALL answer 404. A store error SHALL answer 500 and be reported to Sentry.

#### Scenario: A stored crop

- **WHEN** `/api/face/<id>` is requested for a report whose crop is stored
- **THEN** it answers 200, `image/jpeg`, `Cache-Control: private, no-store`, and the crop's bytes

#### Scenario: A malformed id

- **WHEN** the face route receives the id `../reports` or `short`
- **THEN** it answers 404, and the store is not called

#### Scenario: No crop

- **WHEN** `/api/face/<id>` is requested for a quiz-only report, an unknown id or a deleted crop
- **THEN** it answers 404
