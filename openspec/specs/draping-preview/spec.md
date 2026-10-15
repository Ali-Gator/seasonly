# draping-preview Specification

## Purpose

Keeps the face crop of a photo analysis under its report id, so the report can show the draping preview: the person's own face on their best color next to their worst. Only the server holds the crop, and the report reaches it by its unguessable id.

## Public Interface

```typescript
// apps/web/src/lib/draping/crops.ts (server only)
export const REPORT_ID: RegExp; // /^[A-Za-z0-9_-]{22}$/
export type CropUpload = (path: string, bytes: Uint8Array) => PromiseLike<{ error: unknown }>;
export type CropDownload = (path: string) => PromiseLike<{ data: Blob | null; error: unknown }>;
export function storeCrop(
  id: string,
  bytes: Uint8Array,
  opts?: { upload?: CropUpload },
): Promise<void>; // never throws
export function readCrop(
  id: string,
  opts?: { download?: CropDownload },
): Promise<Uint8Array<ArrayBuffer> | null>;
export function storeMask(
  id: string,
  bytes: Uint8Array,
  opts?: { upload?: CropUpload },
): Promise<void>; // <id>.mask.png, never throws
export function readMask(
  id: string,
  opts?: { download?: CropDownload },
): Promise<Uint8Array<ArrayBuffer> | null>;
export function contentType(path: string): "image/png" | "image/jpeg"; // by extension

// apps/web/src/app/api/face/[id]/route.ts and apps/web/src/app/api/face/[id]/mask/route.ts
export const GET: (request: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>; // withErrorCapture
```

```sql
-- supabase/migrations/20261007171413_crops_bucket.sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crops', 'crops', false, 524288, array['image/jpeg']); -- no storage policy

-- supabase/migrations/20261014200206_crops_bucket_png.sql (t19-draping-cutout)
update storage.buckets set allowed_mime_types = array['image/jpeg', 'image/png'] where id = 'crops';
```

## Behavior

- The analyze route calls `after(() => storeCrop(reportId, crop))` once `saveReport` gives an id and the request had a photo. Saving first means a failed insert leaves no orphan crop, and `after()` keeps the reveal's latency unchanged.
- With an outline, the route also calls `after(() => storeMask(reportId, mask))`, under the same condition. The two uploads run side by side, and one failing leaves the other alone.
- `storeCrop` uploads `<id>.jpg` and `storeMask` `<id>.mask.png`, each with `contentType` from the extension (`contentType`) and `upsert: false`, racing a 3 s timeout. `upload()` takes no abort signal, so a hung upload is abandoned, not cancelled. A failure or timeout goes to Sentry and is flushed.
- `readCrop` and `readMask` share one reader. It maps a `StorageApiError` with HTTP 404, or HTTP 400 with `statusCode "404"`, to null, unless its message names the bucket. A missing bucket and every other error is thrown.
- The face route checks the id against `REPORT_ID` before any store call. It answers 404 for a malformed id or a missing crop, and 200 with `Content-Type: image/jpeg`, `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`. A thrown store error reaches Sentry through `withErrorCapture`, and Next answers 500. The outline route, `/api/face/<id>/mask`, does the same with `readMask` and `Content-Type: image/png`.
- Only the server's secret key reaches the bucket: RLS on `storage.objects` with no policy refuses anon and authenticated.
- Checked on a preview deployment 2026-10-07: a 29.8 KB crop stored after the response and served with `private, no-store`; a well-formed unknown id answered 404.

## Edge Cases

- The daily retention job (`data-retention`) deletes every crop older than 24 hours, `is_test` reports' crops included, and `/privacy` discloses the crop. The job runs once a day, so a crop can stay up to about 49 h (BL backlog item, deferred until Vercel Pro or before paid promotion).
- Anyone holding a report link can fetch its face: the same trust as the report itself, a 128-bit id and no listing.
- If the function is stopped before `after()` runs, the report has no crop and the face route answers 404, which the report page handles.

## Requirements

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

The crop store SHALL be a private bucket that accepts only `image/jpeg` and `image/png` files of at most 512 KB: the crops and their outlines. No storage policy SHALL let the anonymous or the authenticated role list, read or write it, so only the server's secret key reaches it.

#### Scenario: The bucket's settings

- **WHEN** the crop bucket's migrations are applied
- **THEN** the bucket is not public, allows only `image/jpeg` and `image/png`, limits files to 512 KB, and no storage policy names it

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
