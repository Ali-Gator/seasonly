## Why

The draping preview is the report's proof: the person's face on their best color next to their worst. The stored face crop keeps the wall or window behind the face. That background shows at the oval's edges on both colors, so the skin meets a grey wall rather than the color (BL-53). `t18-design-review` zoomed the face to hide most of it and left the rest out of scope, because removing it changes what is uploaded and stored. On 2026-10-14 the user made BL-53 its own change and signed off on the privacy question.

## What Changes

- **A cut-out outline of the crop.** After a photo passes, the phone runs MediaPipe's selfie (person) segmenter on the face crop. It turns the result into an outline: a PNG the crop's size, opaque on the person and transparent on the background. The segmenter is about 0.25 MB and loads on its own. If it fails to load or run, the photo still passes and no outline is made.
- **The crop itself does not change.** It stays the same JPEG, with the same size and format, and it is still what the report-text model reads. The outline is only for display. So the model's verdicts (filter, heavy makeup, no face) cannot move, and no paid `eval:vision` run is needed. The traits and the hair mask are untouched too, so the free eval cannot move either.
- **The analyze request carries the outline.** `mask` is an optional field next to `crop`. It is a PNG of at most 512 KB, and it is accepted only together with a crop. A malformed outline answers 400, before anything is spent.
- **Stored and deleted with the crop.** The outline is kept as `<report id>.mask.png` in the private crops bucket. A new migration lets the bucket accept `image/png`. The daily retention job already deletes by age alone, so it deletes the outline on the same 24-hour schedule. A deletion request removes it with the crop.
- **A new route, `GET /api/face/<id>/mask`.** It works like the face route: the same id check, `private, no-store` and `noindex`, and 404 when no outline is stored.
- **A draping preview that drapes.** DrapingPair takes an optional outline source and masks the face image with it (CSS `mask-image`), so the frame's color shows wherever the wall was. The report shows the face only once the outline has loaded or failed, so the wall never flashes. Without an outline (an older report, a segmenter failure, a 404), the face shows exactly as today.
- **The sample face matches.** `/sample-report` and `/color-analysis-gpt-alternative` show the sample face cut out the same way. Its outline is made once with the same segmenter and shipped as a static PNG.
- **Canvas first.** Boards 10 (Full report, 375 and 1280), 18 (Sample report) and 19 (GPT alternative), and the design system's DrapingPair, get the cut-out face. The user approves them before any UI code (CLAUDE.md).
- **Folded in:** BL-53, deleted from `docs/backlog.md` when it ships.
- **Not in scope:**
  - Sending the cut-out to the model. The user chose on 2026-10-14 to keep the model's input as it is.
  - The Analyzing step's round thumbnail. It shows the person's own crop on their own screen, not a color.
  - The multiclass segmenter (16.4 MB), which could also drop clothes. The drape's collar already covers them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `capture-flow`: the upload holds the crop and, when the segmenter worked, its outline.
- `season-reveal`: the analyze route validates the optional outline. The outline never reaches the report-text model.
- `draping-preview`: the outline is stored next to the crop. The bucket accepts PNG. A new route serves the outline. A failed outline upload changes nothing the person sees.
- `data-retention`: the 24-hour job and deletion requests cover the outline.
- `ui-components`: DrapingPair masks the face with an optional outline.
- `report-page`: the draping preview cuts the face out once its outline loads, and falls back to today's look without one.
- `site-content`: the sample face is cut out on the sample report and the GPT-alternative page.

## Impact

- `apps/web/src/lib/capture/`: `mediapipe.ts` (a separately loaded person segmenter, `PERSON_MODEL`), `photo.ts` (`CheckedPhoto.mask`, the outline PNG).
- `apps/web/src/app/(flow)/analyze/`: `flow-state.ts` (`toFormData` adds `mask`), `flow.tsx` (passes it through).
- `apps/web/src/lib/analysis/request.ts` (the optional `mask` field), `apps/web/src/app/api/analyze/route.ts` (`after(() => storeMask(…))`).
- `apps/web/src/lib/draping/crops.ts` (`storeMask`, `readMask`), the new `apps/web/src/app/api/face/[id]/mask/route.ts`, and a new migration under `supabase/migrations/` that adds `image/png` to the crops bucket.
- `apps/web/src/components/ds/draping-pair.tsx`, `ds.css`; `apps/web/src/lib/report/draping.tsx`; `apps/web/src/lib/site-content/images.ts`, plus the new `apps/web/public/images/examples/face-mask.png`. A script under `scripts/` makes that PNG.
- `docs/privacy-requests.md`: the outline is part of a deletion request.
- Design: the MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) boards 10, 18 and 19, and the design system's DrapingPair.
- Tests: no existing test needs an edit. The outline is optional, so today's fixtures and key lists still hold. New tests cover the outline end to end.
- No new npm dependency. One new model file (0.25 MB), loaded from Google's versioned path like the other two. No paid run.
- Plan: a new Tracker row, T19 "Draping cut-out"; `docs/backlog.md` loses BL-53.
