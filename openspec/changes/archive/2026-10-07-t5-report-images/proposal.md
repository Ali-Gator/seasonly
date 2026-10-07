## Why

The report needs three images that nothing renders yet: the share card, the main free growth loop; the palette PNG, a palette to keep on the phone; and the draping preview, best and worst color on the person's own face, which is how the product proves its result. `t5-analysis-flow` sends the face crop to the vision call and throws it away, so draping has no face to show. The Phase 1 table gives this change `palette-image`, `draping-preview` and `share-card`, with the exit check "PNGs render at 1:1 and 9:16 and stay readable as thumbnails". It also carries in crop storage from `t5-analysis-flow`.

## What Changes

- **Design gate first.** The MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) has the share cards (board 11) and the draping pair (report section 6). It has no palette PNG and no button that saves one. tasks.md opens with a Claude Design prompt for both, and the user approves the artboards before any palette-image code. The same pass reorders the canvas's 1:1 card to the highlight order below.
- **Six highlight colors per season.** Each palette in `season-palettes` gets an ordered `highlights` list of 6 colors, taken from its best colors and neutrals. Soft Autumn's are the canvas picks: Terracotta, Deep Teal, Camel, Dusty Rose, Olive, Mushroom. The other 11 are drafted, and the user approves them as swatches before they are committed. Consumers use them this way:
  - the 9:16 card shows the first 5;
  - the 1:1 card shows all 6;
  - the report email (`t5-report-delivery`) and the paywall teaser (`t7-paywall-off`) show the first 4.
- **Share card PNGs.** A static PNG per season and ratio, 24 in all, rendered with `next/og` at build time:
  - `/images/share/<slug>/story`: 1080 × 1920;
  - `/images/share/<slug>/post`: 1080 × 1080.

  Each card shows the kicker, the season name, its highlight colors with names and hex codes, the wordmark and `seasonly.me`. It shows no face, no answers and no percentages. Its alt text is exported for the page that shows it.

- **Palette PNG.** `/images/palette/<slug>` is a static 1080 × 1920 PNG of the season's 30 colors (24 best and 6 neutrals), each with its name and hex code, laid out as the approved artboard shows.
- **Crop storage.** When a photo analysis is saved, the analyze route stores the face crop in a private Supabase Storage bucket `crops`, as `<report id>.jpg`. The upload runs after the response is sent (`after()`), so the reveal waits for nothing new. A quiz-only result or a failed save stores no crop. An upload that fails or takes over 3 s is reported to Sentry and changes nothing the person sees.
- **Face route.** `GET /api/face/<report id>` returns the stored crop as `image/jpeg`. It never lets a browser or CDN cache it, and answers 404 for a malformed id or a missing crop.
- **DrapingPair component.** It shows the face on the best color next to the worst, from the design-system bundle. The verdicts are words with icons, and each frame has its color's name and hex code. With no face it shows a labeled slot. `t5-report-delivery` places it on the report.
- **Known gap, accepted by the user on 2026-10-06.** The consent step promises deletion within 24 hours. Nothing deletes crops until `t8-photo-privacy` ships its retention job, so in production that promise is untrue for crops stored before then. The launch gate needs `t8-photo-privacy` archived, so no launch happens with the gap.

## Capabilities

### New Capabilities

- `share-card`: the 9:16 and 1:1 share card PNGs per season, their content, size and alt text.
- `palette-image`: the 1080 × 1920 palette PNG per season with its 30 named colors.
- `draping-preview`: storing the face crop under its report id, the private bucket, and the face route that serves it to the report.

### Modified Capabilities

- `season-palettes`: every palette names 6 ordered highlight colors from its best colors and neutrals; Soft Autumn's match the canvas.
- `ui-components`: adds DrapingPair.
- `site-structure`: "The public routes are fixed" adds the generated images under `/images/` to the paths that are not page paths.
- `season-reveal`: "The route outlasts its slowest path" now counts the crop upload. A failed upload is covered by `draping-preview`: it runs after the response, so it cannot block the reveal.

## Impact

- **Code**
  - `packages/analysis/src/palettes/`: the `highlights` field and its data.
  - `apps/web/src/app/images/share/[season]/[ratio]/route.tsx` and `apps/web/src/lib/share-card/`.
  - `apps/web/src/app/images/palette/[season]/route.tsx` and `apps/web/src/lib/palette-image/`.
  - `apps/web/src/lib/og/`: fonts and token colors shared by both renderers. No README row, like `lib/supabase.ts`.
  - `apps/web/src/app/api/face/[id]/route.ts` and `apps/web/src/lib/draping/`: the crop store.
  - `apps/web/src/app/api/analyze/route.ts`: one `after()` call.
  - `apps/web/src/components/ds/draping-pair.tsx` and its `ds.css` rules.
- **Database:** the migration `supabase/migrations/<ts>_crops_bucket.sql` creates the private bucket `crops`: JPEG only, at most 512 KB, and no policies, so only the server's key reads or writes it. It is applied to the Supabase project `seasonly` after the user confirms, before the preview check (task 6.1).
- **Fonts:** static TTF instances of Bodoni Moda (500) and Instrument Sans (400, 600) are committed with their OFL licenses, because `next/og` cannot read variable fonts or WOFF2.
- **Dependencies:** none. `next/og` ships with Next.
- **Env:** none. The crop store uses `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
- **Routes:** `/images/` joins the paths that are not page paths (site-structure delta), and robots.txt allows it, so the cards can later serve as season-page OG images. `/api/face/` is disallowed like the rest of `/api/`.
- **Downstream**
  - `t5-report-delivery`:
    - places DrapingPair with `/api/face/<id>`;
    - hides it, or shows the no-face state, for a quiz-only result or a crop that is gone (404);
    - adds the Share button and "Save my palette" from the approved artboards;
    - shows the first 4 highlights in the report email.
  - `t8-photo-privacy`:
    - deletes crops older than 24 h, and crops of `is_test` reports;
    - says on the privacy page that the crop is kept up to 24 h for the draping preview;
    - says the face route is reachable by anyone holding the report link.
  - `t7-paywall-off`: the teaser's 4 colors are the first 4 highlights.
  - `t5-funnel-analytics`: the share and save events fire from the report page's buttons, not from these routes.
