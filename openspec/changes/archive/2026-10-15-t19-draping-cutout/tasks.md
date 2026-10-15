## 1. Plan, design system and canvas

- [x] 1.1 Tracker (Claude Docs concept, https://claude.ai/code/artifact/23434923-c1ff-47d6-8ce6-7c86fd14856c): add row T19 "Draping cut-out (t19-draping-cutout, BL-53): the face sits on the drape color without the photo's background", Code, Claude Code + Claude Design, In progress. Add a Log line, newest first, naming the user's 2026-10-14 decisions (privacy yes with `/privacy` unchanged, model input unchanged, sample face cut out). Verify: the row and the Log line show.
  - Done 2026-10-14 (Tracker rev 75): the row is below T18 with status "In progress", and the Log line is at the top.
- [x] 1.2 MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3), edited in place after a bare `read`. Upload the sample face's outline as a canvas asset. In the canvas's copy of `ds/seasonly/components/bundle.js` and `bundle.css`, give DrapingPair `faceMaskSrc` (design decision 5). Boards 10 Full report 375 and 1280 get the sample face with its outline (until now they showed the "Face" placeholder); 18 Sample report and 19 GPT alternative 375 and 1280 get the outline. Verify: the canvas version is noted here, and the DS CSS renders the cut-out on both colors.
  - Done 2026-10-14: canvas version 57 (1792005518-40cf). Outline asset `/_blob/5460be2aae49ce66d64c60af273a3c58` (384 × 512, 23,778 bytes, made by the selfie segmenter from `face.webp`, the same file as `/_blob/584d16b3…`). 10d (no face) unchanged. Checked in Chromium over an http origin with the canvas's own `base.css` and `bundle.css`: the outline lines up with the zoomed image, and the oval shows Terracotta and Fuchsia where the grey wall was.
- [x] 1.3 Ask the user to approve boards 10, 18 and 19 (CLAUDE.md: the canvas before UI code). Verify: their approval and its date are recorded here. No task in groups 4–6 that touches UI starts before it.
  - Approved by the user on 2026-10-14 (canvas v57, "as drawn": the oval is kept). They saw the sample before and after, plus four eval photos cut out with the same model, where long hair still stops at the oval's edge. A no-oval variant, with the cut-out filling the frame, was offered and not chosen.
- [x] 1.4 Seasonly design system (https://claude.ai/code/artifact/69473bf0-748a-4814-892f-1cfe8b16ddac): port 1.2's DrapingPair change into `components/bundle.js` and `bundle.css`, with a README line saying an outline must be same-origin (design decision 5). Publish as memory says: a bare `read` of the url first, and `design-system.json` in a separate, last call. Record the new DS version in the canvas's `designSystems` entry. Verify: the DrapingPair preview still renders, and the version id is noted here.
  - Done 2026-10-14: DS version 33 (1792008391-e50a). `bundle.js`, `bundle.css`, `index.d.ts` and the DrapingPair README (the same-origin line) published, then the index (`lastChange`) last. Canvas v58 (1792008414-d518) records it in `designSystems`.
- [x] 1.5 Existing-test edits: none planned. The outline is optional, so `flow-state.test.ts`'s form keys (`["answers", "traits", "crop"]`), `route.test.ts`'s `storeCrop` and `faceCrop` assertions, `crops.test.ts`'s `.jpg`/`image/jpeg` cases and `report-text.test.ts`'s `mediaType` all hold unedited. If one breaks anyway, stop and ask the user before editing it (CLAUDE.md).
  - One existing-test edit after all: the crops mock in `route.test.ts` gained `storeMask: vi.fn()` (additive). Approved by the user on 2026-10-15.

## 2. Tests first (each cites its scenario at the permanent path)

- [x] 2.1 `season-reveal`: new cases in `apps/web/src/app/api/analyze/route.test.ts`:
  - an outline without a crop answers 400;
  - a JPEG outline answers 400;
  - an outline over 512 KB answers 400;
  - a photo without an outline passes;
  - with an outline, the report-text call gets exactly the crop and no outline bytes.
    Verify: each fails for the missing behavior, not for an import error.
  - Done. The crops mock in `route.test.ts` gained `storeMask: vi.fn()` (additive, no existing case changed). The 512 KB case cites the requirement.
- [x] 2.2 `draping-preview`:
  - New cases in `route.test.ts`: `storeMask` runs after the response with the outline, does not run without one or with a null report id, and its rejection leaves the response and `storeCrop` alone.
  - New cases in `apps/web/src/lib/draping/crops.test.ts`: `storeMask` uploads `<id>.mask.png` as `image/png` with the 3 s limit and Sentry, and `readMask` maps 404 to null.
  - A new `apps/web/src/app/api/face/[id]/mask/route.test.ts`, mirroring the face route's tests: 200 `image/png` with `private, no-store` and `noindex`, 404 for `../reports` and `short` without a store call, 404 for no outline, 500 through Sentry on a store error.
    Verify: they fail for the missing behavior.
  - Done. `storeMask`'s failure case lives in `crops.test.ts`, not `route.test.ts`: there `after` runs `void task()`, so a rejecting mock would be an unhandled rejection, and `storeMask` never rejects anyway. A new case applies every `*_crops_bucket*.sql` in order on PGlite and asserts JPEG and PNG; the old JPEG-only case still passes on the first migration alone.
- [x] 2.3 `data-retention`: a new case in `apps/web/src/lib/retention/retention.test.ts`. A 25-hour-old `<id>.jpg` and `<id>.mask.png` are both removed, and a 23-hour-old pair is kept. Verify: it passes today, since selection is by age alone. A passing proof is the point: it pins the behavior the outline relies on.
- [x] 2.4 `capture-flow`: new cases.
  - In `apps/web/src/app/(flow)/analyze/flow-state.test.ts`: a photo with an outline gives form keys `["answers", "traits", "crop", "mask"]`, with `mask` a `image/png` Blob named `mask.png`. A photo without one keeps today's keys.
  - In `e2e/analysis-flow.spec.ts`, two new tests on the real check of `e2e/fixtures/face.jpg`. jsdom has no canvas, so no unit test runs `checkImage`. Intercept `/api/analyze` and read `postDataBuffer()`, as `e2e/funnel.spec.ts` does.
    - "The crop's outline": the request has a `mask` part whose bytes start with the PNG signature.
    - "No person segmenter": `route.abort()` the `selfie_segmenter` model URL. The photo still reaches "Question 1 of 4", and the request has `crop` and `traits` but no `mask` part.
      Verify: they fail for the missing behavior.
- [x] 2.5 `ui-components`: new cases in `apps/web/src/components/ds/draping-pair.test.tsx`:
  - with `faceMaskSrc`, both slots carry `sn-drape__face--cut` and `--sn-face-mask: url("…")`;
  - without it, neither does;
  - `faceMaskSrc` without `faceSrc` changes nothing;
  - `ds.css` has the `--cut` rules with both `-webkit-mask` and `mask`, read the way the "every class has a style" test reads it.
    Verify: they fail for the missing behavior.
- [x] 2.6 `report-page`: new cases in `apps/web/src/lib/report/` (DOM test, `Image` stubbed):
  - while the outline is pending, the face images are hidden;
  - a loaded outline passes `/api/face/<id>/mask`;
  - a failed outline shows the face unmasked without the "couldn't load" line;
  - a failed face still shows the line.
    Verify: they fail for the missing behavior.
  - Done, in a new `draping-mask.dom.test.tsx` with `fetch` stubbed (see 5.2).
- [x] 2.7 `site-content`: a new case in `apps/web/src/lib/site-content/content.test.tsx` that the sample report's and the GPT-alternative page's draping slots carry the cut class and `/images/examples/face-mask.png`. Add a case to `e2e/sample-report.spec.ts` at 375 px: the face image's computed `mask-image` is not `none`, and no request goes to `/api/`. Verify: they fail on the current build.
- [x] 2.8 `analytics`: a new case beside the `maskReportIds` tests. `/api/face/<22 chars>/mask` becomes `/api/face/:id/mask`. Verify: it passes, pinning that the outline URL never leaks an id.

## 3. Capture (spec: `capture-flow`)

- [x] 3.1 `apps/web/src/lib/capture/mediapipe.ts`:
  - add `PERSON_MODEL` (`…/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite`);
  - add `loadPerson()`: its own cached promise, CPU delegate, `outputConfidenceMasks: true`, `outputCategoryMask: false`, reset on failure;
  - have `loadVision()` start `loadPerson()` without awaiting it.
    Update the capture-flow spec's Public Interface after archive. Verify: 2.4's failing-segmenter case passes, `evals/extract.ts`'s `EXTRACTOR_VERSION` is unchanged (print it before and after), and `flow.dom.test.tsx` passes unedited.
  - Done. `mediapipe.ts` imports `package.json` `with { type: "json" }`, so plain Node can load it for 5.3's script. `evals/extract.ts` and its four hashed constants are unchanged, so `EXTRACTOR_VERSION` is unchanged (it cannot be printed from plain Node: `photo.ts` uses extensionless imports). The eval gate's `inputsHash` does cover `photo.ts` and `mediapipe.ts`, so `results.json` needs a hash refresh (`pnpm eval:run`, see 7.1).
- [x] 3.2 `apps/web/src/lib/capture/photo.ts`:
  - after a pass, run the person segmenter on the crop canvas inside a try;
  - copy the confidence mask before `close()`, as the hair mask is copied;
  - write `rgba(0, 0, 0, round(c × 255))` into a canvas of the crop's size;
  - add `mask: await png(canvas)` to `CheckedPhoto`;
  - any failure gives `mask: null`.
    Verify: 2.4 passes, and an outline made on `pnpm dev` from a real photo is the crop's size and about 20–35 KB.
  - Done. `checkImage` waits at most 3 s for the person segmenter (a `ponytail:` note), then goes on with `mask: null`.
- [x] 3.3 `flow-state.ts` / `flow.tsx`: carry `mask` from `CheckedPhoto` into `AnalysisRequest.photo` (optional). `toFormData` appends it as `mask.png` only when present. Verify: 2.4 passes, and the existing form-keys case passes unedited.

## 4. Server (specs: `season-reveal`, `draping-preview`)

- [x] 4.1 `apps/web/src/lib/analysis/request.ts`: accept an optional `mask` only with a crop, with type `image/png`, the PNG signature and a size ≤ `MAX_CROP_BYTES`. `AnalyzeRequest.photo.mask?: Uint8Array`. Update the season-reveal spec's Behavior "Request:" line after archive. Verify: 2.1's validation cases pass.
- [x] 4.2 `apps/web/src/lib/draping/crops.ts`:
  - the default uploader takes `contentType` from the path's extension;
  - add `storeMask(id, bytes)` and `readMask(id)` through one inner helper with `storeCrop`/`readCrop`, which keep their signatures.
    `apps/web/src/app/api/analyze/route.ts`: `after(() => storeMask(reportId, mask))` beside `storeCrop`, only when both a report id and an outline exist. Verify: 2.1's model case and 2.2's store cases pass, and every existing `route.test.ts` and `crops.test.ts` case passes unedited.
- [x] 4.3 `apps/web/src/app/api/face/[id]/mask/route.ts`: mirrors the face route, wrapped in `withErrorCapture`, with `image/png`. Verify: 2.2's route cases pass.
- [x] 4.4 A new migration under `supabase/migrations/` (`supabase migration new crops_bucket_png`): `update storage.buckets set allowed_mime_types = array['image/jpeg','image/png'] where id = 'crops';`. Never edit `20261007171413_crops_bucket.sql`. Apply it to the Supabase project with the MCP `apply_migration` before the PR merges (design Migration Plan). Verify: `select allowed_mime_types from storage.buckets where id = 'crops'` lists both, and the result is recorded here.
  - Done 2026-10-14: applied with MCP `apply_migration`, version 20261014200206, and the local file named to match. `select allowed_mime_types from storage.buckets where id = 'crops'` gives `{image/jpeg,image/png}`; the bucket is still private with 524288.

## 5. Draping UI (specs: `ui-components`, `report-page`, `site-content`) — after 1.3

- [x] 5.1 Port 1.2's DrapingPair change to `apps/web/src/components/ds/draping-pair.tsx` (`faceMaskSrc` on `DrapingPairProps`, the cut class and `--sn-face-mask` on the slot) and `ds.css` (the two `--cut` rules). Update the ui-components spec's Public Interface after archive. Verify: 2.5 passes, and every existing `ds` test passes unedited.
- [x] 5.2 `apps/web/src/lib/report/draping.tsx`: preload `/api/face/<id>/mask` with `Image()`, through the states `pending`, `cut` and `plain`. Hide the face images while pending. Pass `faceMaskSrc` only on `cut`. A failed outline never sets `deleted`. Verify: 2.6 passes.
  - Done, with one change to design decision 6: the outline is fetched once with `fetch()` and passed as an object URL (revoked on unmount), not preloaded with `Image()`. The route is `no-store`, so a preload plus the CSS mask would request it twice, and a failed second request would hide the face. Pending hides the images with `[&_img]:invisible` on the wrapper; the swatches and the line stay.
- [x] 5.3 Add `scripts/sample-face-mask.ts` (design decision 7, with `PERSON_MODEL` from `mediapipe.ts`) and run it once to write `apps/web/public/images/examples/face-mask.png`. It must be byte-identical to, or visually match, canvas asset `5460be2a…`. Add `mask` to `SAMPLE_FACE` in `apps/web/src/lib/site-content/images.ts`, and pass it on `/sample-report` and `/color-analysis-gpt-alternative`. Update site-content's Behavior image line after archive. Verify: 2.7 passes.
  - Done. `node scripts/sample-face-mask.ts` wrote `face-mask.png`, 384 × 512, 23,778 bytes, byte-identical to canvas asset `5460be2a…` (sha256 afc3574d…). The outline is a separate `SAMPLE_FACE_MASK` export, not a `mask` key on `SAMPLE_FACE`: `content.test.tsx` compares the rendered images with `SAMPLE_FACE` by `toEqual`, so an extra key would break two existing cases.

## 6. Docs and backlog

- [x] 6.1 `docs/privacy-requests.md`: the by-link procedure also removes `<id>.mask.png` from the crops bucket. Verify: the step names the outline. Try the procedure once on a test report's crop and outline, and record the result here (data-retention's Unenforced note).
  - Done 2026-10-15 on test report `kAi5SJSsw1Nu6cfgW57fKw` (`is_test`, from 7.2): removed `<id>.jpg` and `<id>.mask.png` through the Storage API, then `delete from public.reports`. `/r/<id>`, `/api/face/<id>` and `/api/face/<id>/mask` all answer 404.
- [x] 6.2 `docs/backlog.md`: delete BL-53 in this change's PR. Log every review finding left unfixed as a new `BL-nn` (CLAUDE.md), with the ids named in the PR. Verify: `grep BL-53 docs/backlog.md` finds nothing.

## 7. Verify

- [x] 7.1 `pnpm fix`, then `pnpm test`. Verify: green, and `evals/results.json` is unchanged (`git diff --stat evals/`).
  - Done: `pnpm test` green (903 unit, 71 e2e). `pnpm eval:run` refreshed `results.json`, a hash-only diff (`inputsHash`; no metric moved), and `pnpm test:eval` is green.
- [x] 7.2 A manual photo run in the user's Chrome on `pnpm dev`, with their own selfie (memory: manual photo tests). Check that:
  - the analyze request carries `mask` (network panel);
  - storage holds `<id>.jpg` and `<id>.mask.png`;
  - the report shows the cut-out on both colors with no flash of the wall;
  - an older report (no outline) shows the face as before.
    Verify: screenshots of the report before and after are shared with the user.
  - Done 2026-10-15 in the user's Chrome on `pnpm dev` (this branch). The analyze request carried `mask`; storage held `<id>.jpg` (15,448 B) and `<id>.mask.png` (13,569 B, `image/png`); the report showed the cut-out on True Red and Mustard (screenshot shared). The first load after a cold dev compile took 4.1 s for the outline, past the 4 s limit, and showed the plain face, as designed; a reload cut it out (outline in about 0.5 s). An older report (no outline) got 404 for its outline and showed the face unmasked, with no "couldn't load" line.
- [x] 7.3 On the preview deployment, open a fresh photo report on an iPhone (Safari, or the Instagram in-app browser) to confirm the iOS path: the outline is encoded and the mask renders. Verify: the user confirms, or a screenshot from their phone is recorded here.
  - Done 2026-10-15: the user confirmed on their iPhone, on preview `seasonly-f0moujujf-aligators-projects.vercel.app`, that the outline was made and the face is cut out on both colors.

## 8. Review, archive and ship

- [x] 8.1 Phase review in a fresh `general-purpose` subagent with the `phase-review` skill (`/code-review high`). Fix its findings, and log what stays unfixed (6.2). Verify: findings and their outcome are listed here.
  - Done 2026-10-14 (fresh `general-purpose` subagent, `/code-review high`): nothing serious; nine findings.
    1. A near-empty outline would empty the oval: fixed. `outline()` returns null when the mean confidence over the crop's middle third is below 0.5.
    2. The face could stay hidden (no JS, or a hung outline): fixed. `sn-face-pending` in `globals.css` reveals the faces after 4 s without a script, and the fetch aborts at 4 s. Also fixed: the outline blob is decoded (`createImageBitmap`) before use, since CSS hides the face behind an undecodable mask.
    3. The model-input test could never fail: fixed. It asserts the call's exact keys.
    4. A third MediaPipe load at once could fail the check (shared `ModuleFactory` global): fixed. The person segmenter starts after `loadVision()` resolves.
    5. Outline misses go unreported: logged as BL-66.
    6. The download error message held the report id: fixed. The message is per kind.
    7. The e2e outline test checked only the signature: fixed. It decodes the outline and checks its size against the crop, alpha > 200 in the middle and < 50 in a top corner.
    8. The PNG content type was untested: fixed. A tested `contentType(path)` helper.
    9. The crops mock in `route.test.ts` gained `storeMask` without approval: additive; the user is asked to approve it (see 1.5).
- [x] 8.2 `/opsx:archive`. Then re-add Public Interface and Behavior lines in the permanent specs touched: `draping-preview` (`storeMask`, `readMask`, the mask route, the PNG migration), `capture-flow` (`loadPerson`, `CheckedPhoto.mask`), `season-reveal` (the request line), `ui-components` (`faceMaskSrc`), `site-content` (the outline image), `data-retention` (the bucket holds outlines). No new capability, so no README row. Verify: `openspec validate --specs` is green.
  - Done 2026-10-15: archived as `2026-10-15-t19-draping-cutout` (+5 added, ~7 modified requirements). Public Interface and Behavior lines updated in draping-preview, capture-flow, season-reveal, ui-components, site-content and data-retention. `openspec validate --specs`: 29 passed.
- [x] 8.3 Tracker: set T19 to Done, with a Log line in plain words. Push, open the PR to `main` (naming the BL ids added and removed), and turn on auto-merge with a merge commit (`gh pr merge --auto --merge`, never squash). Verify: the PR shows auto-merge on and CI green.
  - Done 2026-10-15: Tracker rev 76 (T19 Done, Log line). PR https://github.com/Ali-Gator/seasonly/pull/36 (BL-53 removed, BL-66 added), auto-merge on with a merge commit after the iPhone check. CI's first run failed on a Node 22 detail in the new DOM test (jsdom Blob in `Response`), fixed in 848d497.
