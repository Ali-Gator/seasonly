## 1. Design (user gate)

- [x] 1.1 The user pastes this prompt into Claude Design, on the MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3):

  ```text
  Using the "Seasonly" design system, add to the MVP canvas:

  1. Palette image, a new board next to "11 Share cards". It is a PNG people save to their phone
     and open in a shop: 1080 × 1920, shown at 324 px wide and at 120 px wide as a thumbnail.
     Content, Soft Autumn sample data from the full report:
     - "Soft Autumn" as the heading, with a small kicker such as "My colors";
     - all 30 colors: the 24 from "Your palette", then the 6 from "Your best neutrals", each in
       report order, each a chip with its name and hex code (never color alone);
     - the wordmark and "seasonly.me" in the footer, set as large as on the share card.
     No face, no quiz answers, no percentages. Ground is `surface`. Use the ShareCard's type and
     spacing so the two images read as one family. Flexbox-only layout (rows and columns, no CSS
     grid), because the PNG renderer has no grid.
  2. Full report (phone, board 10): add a secondary "Save my palette" button next to
     "Share my season", and its state after the tap ("Saved" with a check icon, or the phone's
     own save sheet if that reads clearer).
  3. Share cards (board 11): change the 1:1 card's color order to Terracotta, Deep Teal, Camel,
     Dusty Rose, Olive, Mushroom, the same order as the 9:16 card plus Mushroom.

  Anything missing from the design system goes into it first, then onto the canvas.
  ```

  Done when the user approves the new and changed artboards in chat. Record the date here and in `mvp-design-canvas` memory, and replace "the approved artboard" in design.md decision 2 with the board's name and file. Approved 2026-10-07.

## 2. Tracker and test-edit approval

- [x] 2.1 Update the plan for `t5-report-images` on branch `t5-report-images`:
  - add a "t5-report-images planned" Log line to the Tracker;
  - remove "t5-report-images: crop storage (t5-analysis-flow)" from "Carried in from finished changes" (Architecture and phases tab);
  - in the Architecture tab's stack table, change the "Images (palette, draping, share card)" row: `next/og` renders the share card and the palette image, and draping is the DOM DrapingPair over a face route (design.md decision 5), so the face lives in one stored object;
  - in the Phase 1 table's `t5-report-images` row, add to the exit check that the draping preview shows the stored crop.

  T5 stays In progress until `t5-report-delivery` and `t5-funnel-analytics` archive. Done when the Log shows the line and the carried list no longer holds the item.

- [x] 2.2 Ask the user to approve these edits to existing tests (CLAUDE.md gate), each of which the change would otherwise break:
  - `apps/web/src/app/api/analyze/route.test.ts` gains:
    - a partial `vi.mock("next/server", async (importOriginal) => …)` that keeps the module and overrides only `after`, to run its callback at once;
    - a `vi.mock("@/lib/draping/crops", …)`;
    - cases asserting when `storeCrop` is called.

    Without the mock, `after()` throws outside a request scope.

  - `apps/web/src/components/ds/ds.test.tsx`: the class-coverage fragment renders DrapingPair, with and without a face.

  Done when the user approves in chat; record the date here. Approved 2026-10-07.

## 3. Highlights (user gate)

- [x] 3.1 Draft 6 highlights for each of the 11 seasons other than Soft Autumn (design.md decision 4):
  - the draping best color first;
  - then 4 more best colors from different hue groups;
  - then one neutral.

  Show all 12 sets to the user as swatches with names and hex codes, in a scratch Artifact, with Soft Autumn's canvas set as the reference. Done when the user approves; record the date here. Approved as drafted 2026-10-07 (https://claude.ai/artifact/K24H42V67Uc7MkRs8p95y9). Nothing is committed to `data.ts` before then.

## 4. Tests first

Existing tests change only as approved in 2.2. Any other change to an existing test needs the user's approval first.

- [x] 4.1 In a new `packages/analysis/src/palettes/highlights.test.ts`, citing the season-palettes delta scenarios, cover:
  - every palette has 6 distinct highlights, each in `best` or `neutrals`;
  - Soft Autumn's six equal the canvas picks in order.

  Done when it fails for the missing field.

- [x] 4.2 In `apps/web/src/lib/share-card/share-card.test.ts`, citing the share-card scenarios, cover:
  - the element tree of Soft Autumn's story and post cards: the texts in order, and each chip's `background` equal to its hex;
  - the alt text string;
  - for all 24 params from `generateStaticParams`, `GET` answers `image/png` with IHDR 1080 × 1920 or 1080 × 1080 (design.md decision 9);
  - `dynamicParams` is `false`.

  Done when it fails for the missing modules.

- [x] 4.3 In `apps/web/src/lib/palette-image/palette-image.test.ts`, citing the palette-image scenarios, cover:
  - Soft Autumn's tree: the name, then the 30 colors in order with chip backgrounds, the wordmark and the address;
  - all 12 `GET`s answer 1080 × 1920 PNGs;
  - `dynamicParams` is `false`.

  Done when it fails for the missing modules.

- [x] 4.4 In `apps/web/src/lib/draping/crops.test.ts`, citing the draping-preview scenarios, cover:
  - `storeCrop` uploads `<id>.jpg` with `image/jpeg` and the exact bytes;
  - an upload error is sent to Sentry and does not throw;
  - an upload that hangs is aborted at 3 s with fake timers and sent to Sentry;
  - `readCrop` gives null for a `StorageApiError` with `status` 400 and `statusCode` `"404"`, and for one with `status` 404, and throws for other errors (design.md decision 6);
  - the bucket migration in PGlite, on a stub `storage.buckets`: `public` false, the 512 KB limit, only `image/jpeg`, and no `create policy`.

  Done when it fails for the missing module and migration.

- [x] 4.5 In `apps/web/src/app/api/face/[id]/route.test.ts`, citing the face-route scenarios, cover:
  - a stored crop: 200, with `image/jpeg`, `Cache-Control: private, no-store` and the bytes;
  - the id params `short` and `../reports`: 404, with `readCrop` not called;
  - a missing crop: 404;
  - a store error: 500, and Sentry is called.

  Done when it fails for the missing route.

- [x] 4.6 Make the edits approved in 2.2 to `route.test.ts`, citing the draping-preview scenarios. Cover:
  - a personal photo result and a fallback photo result each schedule `storeCrop(reportId, crop)`;
  - quiz-only, rejected, no-result and a null report id do not.

  Then add DrapingPair to `ds.test.tsx`'s fragment, and write `apps/web/src/components/ds/draping-pair.test.tsx` for the ui-components delta scenarios. Done when the new cases fail.

## 5. Implementation

- [x] 5.1 Add `highlights` to `Palette` and all 12 palettes in `packages/analysis/src/palettes/data.ts`: Soft Autumn's canvas picks, and the 11 sets approved in 3.1. Update the season-palettes Public Interface comment at archive (9.1). Done when 4.1 passes.
- [x] 5.2 Create `apps/web/src/lib/og/`:
  - fetch the static TTF instances (design.md decision 3);
  - commit them with `OFL.txt` and a README holding the fetch command;
  - write `index.ts` exporting `OG_FONTS` and `OG_COLORS` from `tokens.json`.

  First check that `ImageResponse` renders under Vitest with a throwaway test. If it does not, move the PNG-size cases of 4.2 and 4.3 to `e2e/report-images.spec.ts` (design.md decision 9), and note it here. Done when a throwaway 10 × 10 render gives a PNG. Rendered under Vitest on 2026-10-07, so the PNG-size cases stay in the unit tests. One OFL file per family (`OFL-BodoniModa.txt`, `OFL-InstrumentSans.txt`), since their copyright lines differ.

- [x] 5.3 Build `shareCard`, `shareCardAlt` and the `/images/share/[season]/[ratio]` route from `bundle.css` `.sn-share*` at 1080 px (design.md decision 2). Done when 4.2 passes. Two departures, both found on the rendered cards on 2026-10-07: a story card's rows share the list's height (at most 3 em each) so a two-line season name ("Light Summer") never pushes Olive into the footer; and the post card's names and hex codes are 0.55 em and 0.5 em, names on one line, so "Bright Turquoise" fits its column (the user's redesign). A test in `share-card.test.ts` draws every season's highlight names in the card's own font and checks the widest fits a column.
- [x] 5.4 Build `paletteImage` and the `/images/palette/[season]` route from the artboard approved in 1.1. Done when 4.3 passes.
- [x] 5.5 Write the migration `supabase/migrations/<ts>_crops_bucket.sql` (design.md decision 8) and `apps/web/src/lib/draping/crops.ts` (decision 6). Do not apply the migration. Done when 4.4 passes. `upload()` in `@supabase/storage-js` takes no abort signal, so `storeCrop` races the 3 s timeout without an `AbortController`: a hung upload is abandoned, not cancelled. `StorageApiError` is imported from `@supabase/supabase-js`, which re-exports it.
- [x] 5.6 Add the face route `apps/web/src/app/api/face/[id]/route.ts` (design.md decision 7). Done when 4.5 passes.
- [x] 5.7 Add the `after(() => storeCrop(...))` line to the analyze route. Done when 4.6's route cases pass and the season-reveal "declared limit" test still passes.
- [x] 5.8 Add DrapingPair to `apps/web/src/components/ds/` and its `.sn-draping` and `.sn-drape*` rules to `ds.css`, from `bundle.css` with token variables. Export it from `index.ts`. Done when 4.6's component cases and the class-coverage test pass.
- [x] 5.9 Run `pnpm fix`, `pnpm test` and `pnpm --filter web build`. Done when all pass, and the build output lists 24 `/images/share/…` and 12 `/images/palette/…` entries as prerendered.

## 6. Checks with the user

- [x] 6.1 Ask the user to confirm applying the crops-bucket migration to the Supabase project `seasonly` (ref `qisseuermrrwvvnfyjet`) through the connector, before 6.3, as `reports` was on 2026-10-03. Rename the local file to the applied version. Done when the user confirms, the connector lists the migration, and `storage.buckets` shows `crops` with `public` false. Applied 2026-10-07 as `20261007171413_crops_bucket`; `crops` is private, 524288 bytes, `image/jpeg` only, and `storage` has no policies.
- [x] 6.2 Show the user all 24 share cards and the 12 palette images, at full size and at 120 px wide, in a scratch Artifact built from the built PNGs. Done when the user confirms that the season name, the colors and `seasonly.me` read at thumbnail size, and that the palette images match the artboard. Record the date here. Approved 2026-10-07 (https://claude.ai/artifact/TuXp87Dwy3C922KiUnkE9b).
- [x] 6.3 On the preview deployment, with the user's yes for one paid analysis:
  1. run one photo analysis from the user's phone;
  2. after the migration is applied (6.1), open `/api/face/<report id>` from the response;
  3. check that it shows the crop with `Cache-Control: private, no-store`;
  4. check that a well-formed 22-character id with no crop answers 404, not 500: the invalid-id case never reaches storage, so only this one proves the not-found mapping.

  Then delete the test row and its crop. Done when a Tracker Log line records the result. Done 2026-10-07: the crop was stored (29,793 bytes); the face route answered 200 `image/jpeg` with `private, no-store` and `noindex`; a well-formed unknown id and `short` both answered 404. The row and crop were deleted, and the Log line was added.

## 7. Archive prep

- [ ] 7.1 At archive, add the README rows and re-add each new spec's Public Interface, Behavior and Edge Cases:
  - `share-card`: `apps/web/src/app/images/share/**`, `apps/web/src/lib/share-card/**`;
  - `palette-image`: `apps/web/src/app/images/palette/**`, `apps/web/src/lib/palette-image/**`;
  - `draping-preview`: `apps/web/src/app/api/face/**`, `apps/web/src/lib/draping/**`, `supabase/migrations/*_crops_bucket.sql`.

  Note under the table that `apps/web/src/lib/og/**` is shared by `share-card` and `palette-image` and has no row. Add `highlights` to the season-palettes Public Interface, and DrapingPair to the ui-components Public Interface.

  Update the plan's carried list:
  - **`t5-report-delivery`:** place DrapingPair with `/api/face/<id>` and handle its 404; the Share button and "Save my palette" from 1.1; the report email's 4 colors are the first 4 highlights.
  - **`t8-photo-privacy`:** delete crops older than 24 h and crops of `is_test` reports; disclose on the privacy page that the crop is kept up to 24 h for draping and is reachable by report link.
  - **`t7-paywall-off`:** the teaser's 4 colors are the first 4 highlights.

  Done when `openspec validate --specs` passes and the README mapping test passes.
