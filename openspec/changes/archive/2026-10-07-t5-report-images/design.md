## Context

The analyze route (`apps/web/src/app/api/analyze/route.ts`) has the face crop as `input.photo.crop`, a validated JPEG of at most 512 KB. It saves the result with `saveReport`, which gives a 22-character id or null, and then drops the crop. `apps/web/src/lib/supabase.ts` is the server's lazy Supabase client with the secret key. Supabase Storage has no bucket yet.

`@seasonly/analysis` exports `PALETTES`, each palette with 24 `best`, 6 `neutrals` and a `draping` pair. `apps/web/src/lib/site/routes.ts` has `seasonName(slug)` ("Soft Autumn"). `apps/web/src/styles/tokens.json` holds the token hex values.

The design inputs:

- **ShareCard and DrapingPair:** the design-system bundle on the MVP canvas (`project/ds/seasonly/components/bundle.js` and `bundle.css` on https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3). ShareCard sizes everything in `em` off `width / 270 × 16px`. DrapingPair is a 3:4 color frame holding a 62 %-wide oval face slot with a 3 px surface ring.
- **Palette PNG:** board "11b Palette image" (`project/PaletteImage.dc.html`), the design system's `PaletteCard`: two colors per row, 24 colors then 6 under "Neutrals", flex only. Approved 2026-10-07 (task 1.1).

`ImageResponse` (`next/og`) supports flexbox and a subset of CSS. It has no `display: grid`. It reads TTF, OTF and WOFF, but not WOFF2 or variable fonts. A route handler with `generateStaticParams` and `dynamicParams = false` is rendered at build time, and an unlisted param answers 404. `after()` runs a callback once the response is sent, within the route's `maxDuration`.

Motivation: proposal.md. Requirements: the seven delta specs under `specs/`.

## Goals / Non-Goals

**Goals:**

- No request ever renders an image. The 36 PNGs are files made at build time.
- The face is copied into exactly one place, the crop store, so `t8-photo-privacy` deletes one object per report.
- The reveal gets no slower.

**Non-Goals:**

- Placing anything on the report page: the Share button, "Save my palette", DrapingPair, and the no-face state (`t5-report-delivery`).
- Deleting crops (`t8-photo-privacy`).
- Share events (`t5-funnel-analytics`).
- Season-page OG images. The cards can serve as those later, but wiring them is SEO work (T9).
- A face cut-out. The approved DrapingPair crops the face into an oval, so the selfie segmenter is not needed.

## Decisions

### 1. Share card and palette image: static per season, keyed by slug

Both images depend only on the season, so they are keyed by slug, not by report id:

- There is no database read and no personal data.
- Every visitor of a season shares the same 3 files.
- The cards can later serve as season-page OG images.

Routes:

| Route                              | File                                                       | Capability      |
| ---------------------------------- | ---------------------------------------------------------- | --------------- |
| `/images/share/<slug>/story\|post` | `apps/web/src/app/images/share/[season]/[ratio]/route.tsx` | `share-card`    |
| `/images/palette/<slug>`           | `apps/web/src/app/images/palette/[season]/route.tsx`       | `palette-image` |

Each route exports:

- `generateStaticParams`, which lists all 12 slugs, times both ratios for the share card;
- `dynamicParams = false`;
- `GET`, which returns `new ImageResponse(element, { width, height, fonts })`.

A route file may export only handlers and segment config. So the element builders live outside the route files:

- `shareCard(slug, ratio)` and `shareCardAlt(slug, ratio)` in `apps/web/src/lib/share-card/`;
- `paletteImage(slug)` in `apps/web/src/lib/palette-image/`.

Both builders return plain JSX objects. A test walks them for text and chip colors without rendering.

`/images/` is not under `/api/`, so robots may fetch the cards. The site-structure delta adds `/images/` to the paths that are not page paths.

Alternatives considered:

- A per-report route (`/r/<id>/share`). It needs a database read and a dynamic render for content that is the same for every person of a season.
- Rendering the DOM ShareCard and screenshotting it. That needs a headless browser, which the stack rules out.

### 2. Satori layout from the design-system CSS

`bundle.css` `.sn-share*` is translated into inline styles at 1080 px wide, so `em` = 64 px:

- every `display` is `flex`;
- the 1:1 card's 3 × 2 grid becomes two flex rows of three, each chip `flex: 1`.

The PNG is the card full-bleed. The rounded corners and shadow belong to the in-page preview and are dropped.

Colors come from `tokens.json` (`surface`, `ink`, `ink-muted`, `line` and `swatch-edge` for the chip edge), never literals. This is the token rule `ui-components` already enforces for `ds.css`.

The palette image follows board "11b Palette image" (`project/PaletteImage.dc.html`) the same way.

### 3. Fonts: committed static TTF instances

`apps/web/src/lib/og/fonts/` holds static TTF instances with the OFL license:

- Bodoni Moda 500 at `opsz` 24, the wordmark's setting;
- Instrument Sans 400 and 600.

They are fetched once from the Google Fonts CSS API with a non-WOFF2 user agent, which serves static TTF instances, and the command is recorded in the folder's README. `apps/web/src/lib/og/index.ts` reads them once at module scope and exports `OG_FONTS` and `OG_COLORS` from `tokens.json`. Fetching fonts at render time would make the build depend on Google being reachable.

`lib/og` is shared by two capabilities, so it gets no README row, like `lib/supabase.ts`.

### 4. Highlights live in the palette data

`highlights: readonly Swatch[]` (6) goes on `Palette`, as literal swatches next to `best` and `neutrals`, and a test checks each one against those two lists. Soft Autumn's are the canvas picks.

The other 11 are drafted to echo the canvas's mix: the draping best color first, then 4 more best colors from different hue groups, then one neutral. They are shown to the user as swatches before they are committed (task 3.1).

The canvas's 1:1 card lists the same six in another order. The spec's single order wins, and task 1.1 updates the canvas.

### 5. Draping: the DOM component plus a face route, not a PNG

The architecture table lists `next/og` for draping. A PNG would bake the face into a second file that `t8-photo-privacy` would also have to find and delete, and that the browser and CDN would cache. Instead:

- **DrapingPair** is a server-renderable DOM component in `apps/web/src/components/ds/draping-pair.tsx`, with its `.sn-draping` and `.sn-drape*` rules copied from `bundle.css` into `ds.css` (`ui-components`). It reuses the existing Slot and Icon.
- **The face route** `GET /api/face/[id]` streams the stored crop. `t5-report-delivery` passes `/api/face/<id>` as `faceSrc`. The same bytes show on both sides, and only the frame color changes.

The face lives in one object, and deleting it removes it everywhere at once.

### 6. Crop store and upload after the response

`apps/web/src/lib/draping/crops.ts` (`draping-preview`) exports:

- `storeCrop(id, bytes, { upload })`: uploads `<id>.jpg` with `contentType: image/jpeg` and `upsert: false`. It races a 3 s timeout with an `AbortController`, and sends a failure to Sentry and flushes. It never throws. It mirrors `saveReport` in `lib/analysis/store.ts`, with the same injectable-dependency pattern for tests.
- `readCrop(id, { download })`: returns the bytes, or null when the store says not found, and throws on other errors. Storage can answer a missing object with HTTP 400 and `statusCode: "404"` in the body, so not-found is a `StorageApiError` (`@supabase/storage-js`) whose `statusCode` is `"404"` or whose `status` is 404. Test fakes build that error class.
- `REPORT_ID = /^[A-Za-z0-9_-]{22}$/`.

The analyze route adds one line after a non-null `reportId` with a photo:

```ts
if (reportId && input.photo) after(() => storeCrop(reportId, input.photo.crop));
```

Upload order is save first, then crop, so a failed insert leaves no orphan crop. `after()` keeps the reveal latency unchanged. The 60 s `maxDuration` already covers 26 s before the response plus 3 s after (season-reveal delta).

The existing `route.test.ts` mocks `next/server`'s `after` to run its callback at once, and asserts the call conditions.

### 7. The face route

`apps/web/src/app/api/face/[id]/route.ts` is wrapped in `withErrorCapture`, the observability requirement for route handlers:

1. A malformed id gives 404 before any store call.
2. `readCrop` null gives 404.
3. Otherwise it answers 200 with the bytes and these headers:
   - `Content-Type: image/jpeg`;
   - `Cache-Control: private, no-store`;
   - `X-Robots-Tag: noindex`.

A thrown store error becomes `withErrorCapture`'s 500 and goes to Sentry.

The route is dynamic. Its handler reads params, and it has no `generateStaticParams`.

### 8. The bucket migration

`supabase/migrations/<ts>_crops_bucket.sql`:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crops', 'crops', false, 524288, array['image/jpeg']);
```

It adds no policy. Supabase enables RLS on `storage.objects`, so anon and authenticated get nothing, and the secret key bypasses RLS.

The test loads the migration into PGlite on a minimal stub `storage.buckets`. It asserts:

- the row's settings;
- that the migration text has no `create policy`.

The README row: `draping-preview` owns `supabase/migrations/*_crops_bucket.sql`.

### 9. Proving the PNGs

`share-card.test.ts` and `palette-image.test.ts` call each route's `GET` for every param from `generateStaticParams`. They check:

- the `image/png` content type;
- the PNG signature;
- width and height read from the IHDR chunk (bytes 16–23, big-endian). No decoder dependency is needed.

They run in Vitest's node environment. If `next/og`'s wasm renderer will not load under Vitest, the fallback is a Playwright check in `e2e/report-images.spec.ts` against `next start`, making the same assertions over HTTP, and the content tests stay on the element tree. Task 5.2 tries Vitest first.

## Risks / Trade-offs

- **[Production keeps crops with no deletion until t8]** → The user accepted this on 2026-10-06. The launch gate needs `t8-photo-privacy`, and the carried list names the job.
- **[Anyone with the report link can fetch the face]** → This is the same trust as the report itself: a 128-bit id and no listing. `t8-photo-privacy` discloses it, and deletion after 24 h bounds it.
- **[The `ImageResponse` bundle limit (500 KB)]** → The fonts are 3 static instances, Latin only. The routes render at build, not at the edge.
- **[A chip color drifts from its hex]** → `next/og` writes the exact RGB of a solid fill. The content test pins each chip's `background` to its hex.
- **[`after()` is dropped if the function is killed early]** → This is the same as any failed upload: the report has no face, and the report page handles the 404.
- **[Thumbnail legibility]** → This is a human gate, task 6.2.

## Migration Plan

1. The bucket migration is applied to the Supabase project `seasonly` through the connector once the user confirms, before the live check (task 6.1). This is how `reports` was applied on 2026-10-03. The insert only adds an empty private bucket. Until then, preview uploads fail softly into Sentry, and the face route answers 404.
2. Rollback means reverting the PR. The bucket can stay. Dropping it after rollback needs the user's confirmation, because it deletes crops.
