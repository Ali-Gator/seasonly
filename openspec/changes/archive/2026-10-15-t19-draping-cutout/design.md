## Context

See proposal.md (Why). The current state that shapes the approach:

- The photo check (`lib/capture/photo.ts`) loads two MediaPipe models through `loadVision()`: the face landmarker and the hair segmenter. The hair segmenter is hair-vs-rest, so it cannot separate a face from a wall. That was BL-53's wrong premise. Its mask feeds hair sampling in `packages/analysis`.
- The crop path is JPEG end to end: canvas `toBlob("image/jpeg", 0.85)`, the analyze route's type and magic-byte check, `<id>.jpg` in a bucket that allows only `image/jpeg`, the face route's `Content-Type`, and the report-text call's `mediaType`.
- The audience is mostly on iPhones, in Safari or in the TikTok and Instagram in-app browsers (WKWebView). Safari's canvas cannot encode WebP. `toBlob("image/webp")` there silently returns a PNG (caniuse lists no Safari version through 26.5).
- DrapingPair (`components/ds/draping-pair.tsx`) puts a `Slot` (`.sn-slot`, `background: var(--sunken)`) in the oval `.sn-drape__face`. Its `img` uses `object-fit: cover`, `object-position: 50% 40%` and `transform: scale(1.15)`. A `::after` collar in the frame's color covers the bottom 24 % of the frame.
- The report's `ReportDraping` reads the face image's load error from the DOM and switches to "We couldn't load your photo…".

Decisions the user made on 2026-10-14, product and approval:

1. **Privacy: signed off.** The phone may upload a small outline of the crop, stored and deleted with the crop within 24 h. The `/privacy` wording stays as it is: "A crop of your face… to show your colors against your face" covers it.
2. **Model input: unchanged.** The report-text model keeps reading the crop with its background. So no paid `eval:vision` run is needed.
3. **Sample face: cut out too.** `/sample-report` and the GPT-alternative page match real reports.

## Goals / Non-Goals

**Goals:**

- The drape color meets the skin and hair, not the wall, on real reports and on the sample.
- Nothing the analysis measures or the model reads changes. Traits, hair mask, crop bytes and Gemini input are all byte-identical.
- An outline that fails anywhere (load, segment, upload, store, fetch) leaves today's look. It never leaves an empty oval or a retake.

**Non-Goals:**

- Removing clothes or accessories from the outline. The collar covers the neckline.
- Cutting out the Analyzing step's thumbnail, the share card or the palette image. None of them shows the face on a color.
- Raising outline quality past the segmenter's own, for example by feathering, thresholding or using a matting model.

## Decisions

### 1. Mask source: MediaPipe's selfie segmenter, run on the crop

The model is `image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite`, a pinned versioned path (HTTP 200 on 2026-10-14) of 249,537 bytes. It is an `ImageSegmenter` with `outputConfidenceMasks: true` and `outputCategoryMask: false`. It gives one confidence mask, person versus background, at the input's size. It runs on the crop canvas (≤ 512 px), after the crop is drawn.

A prototype on 2026-10-14 ran the app's crop and then this model in headless Chromium. It covered the sample face, the base example and four eval photos: indoor daylight, night flash, an orange stage and mixed indoor light. Wall, window, stage light and green backdrop all fell away, while hair, ears and earrings stayed. A microphone in front of one face stayed, as expected of a person mask. Segmenting took 7–47 ms per crop, and each outline PNG was 19–33 KB.

Alternatives:

- **The multiclass selfie segmenter** (`selfie_multiclass_256x256`) can also drop clothes. But it is 16,371,837 bytes, about 4× the face landmarker, on the photo check's critical path on phones. The collar already covers clothes.
- **The landmarker's FACE_OVAL contour joined with the hair mask** needs no new model. But it drops the ears and neck, and leaves gaps between the hairline and the contour.
- **Segmenting the full 1280 px photo and cropping the mask.** This gives the same result at lower effective resolution on the face, and adds work.

### 2. The person segmenter loads on its own and can fail alone

`mediapipe.ts` gains `PERSON_MODEL` and `loadPerson()`, with its own cached promise. Like `loadVision()`, it resets on failure so the next call retries. `loadVision()` starts `loadPerson()` without awaiting it, so the guide's existing prefetch in `flow.tsx` warms both, and `flow.tsx` does not change. `checkImage` awaits `loadPerson()` only after a pass, inside a try. Any failure yields `mask: null`, and the pass stands.

Folding it into `loadVision()` was rejected. A cosmetic model's failure would turn every check into the no-face retake, as a failed `loadVision()` does today.

### 3. Format: an outline PNG next to the unchanged JPEG crop

The outline is a canvas of the crop's exact size. Its pixels are `rgba(0, 0, 0, round(confidence × 255))`, encoded with `toBlob("image/png")`, which every browser encodes. The crop stays the same JPEG.

Alternatives:

- **WebP with alpha.** Safari's canvas cannot encode it and returns a PNG without an error, so iPhones, most of the audience, would send a different format.
- **A cut-out PNG crop** (RGBA photo). About 10× today's ~30 KB JPEG and close to the 512 KB cap. It also changes the model's input, which the user declined.
- **A server-side composite** (for example with `sharp`). This needs a new dependency and server CPU per analysis, and still needs the mask uploaded.

This also keeps the model input byte-identical (user decision 2). And it leaves the five tests the triage listed as JPEG-bound unchanged: the face route, crops ×2, the analyze route and report-text.

### 4. Request, storage and route

- **Client.** `CheckedPhoto` gains `mask: Blob | null`. `AnalysisRequest.photo` gains an optional `mask`; no object URL for it, since the Analyzing thumbnail stays as it is. `toFormData` appends `mask` (filename `mask.png`) only when present. So today's form-keys test (`["answers", "traits", "crop"]`) and fixtures still hold.
- **Server parse.** `parseAnalyzeRequest` accepts an optional `mask` Blob only alongside a crop. It must have type `image/png`, the PNG signature `89 50 4E 47 0D 0A 1A 0A`, and a size ≤ `MAX_CROP_BYTES`. Anything else returns null, which means 400. `AnalyzeRequest.photo.mask?: Uint8Array`.
- **Store.**
  - The route adds a second `after(() => storeMask(reportId, mask))` next to `storeCrop`. The existing `storeCrop` calls and assertions do not change.
  - In `crops.ts`, the default uploader takes its content type from the path's extension. `storeMask` and `readMask` share `storeCrop`/`readCrop`'s timeout, Sentry and 404 mapping through one inner helper.
- **Route.** `app/api/face/[id]/mask/route.ts` mirrors the face route, wrapped in `withErrorCapture`, with `image/png`. Analytics' `maskReportIds` already rewrites `/api/face/<22 chars>/mask`, because `/` ends the id. A new test pins this.
- **Migration.** A new file under `supabase/migrations/` runs `update storage.buckets set allowed_mime_types = array['image/jpeg','image/png'] where id = 'crops'`. The applied `20261007171413_crops_bucket.sql` is never edited.
- **Retention.** No code change. `deleteOldCrops` lists the bucket root and selects by `created_at` alone, so outlines go with crops. New tests prove it. `docs/privacy-requests.md` adds the outline to the by-link procedure.

### 5. Display: a CSS mask that mirrors the image's own fit

- DrapingPair takes `faceMaskSrc?: string`. With a face, it adds `sn-drape__face--cut` to the slot and sets `--sn-face-mask: url("…")` in the slot's `style`.
- `ds.css` handles the rest:
  - `.sn-drape__face--cut { background: none }`.
  - `.sn-drape__face--cut img { -webkit-mask: var(--sn-face-mask) 50% 40% / cover no-repeat; mask: var(--sn-face-mask) 50% 40% / cover no-repeat; }`.
- The outline has the crop's aspect ratio, so `cover` with the same position lines it up with `object-fit: cover` and `object-position: 50% 40%`. The `scale(1.15)` transform applies to the masked element as a whole.
- The `-webkit-` form covers iOS before 15.4.
- `mask-image` fetches in CORS mode. Same-origin URLs work: `/api/face/<id>/mask`, `/images/examples/face-mask.png`, and the canvas's `/_blob/`. A `file://` page renders the face fully transparent, as the 2026-10-14 check showed before it moved to an http origin. So the outline must stay same-origin, never a CDN or Storage URL.
- Checked on 2026-10-14 in Chromium with the DS's own `bundle.css`: the sample face masked by its outline lines up with the image on both colors.

The oval, its 1.15× zoom and the collar stay as `t18-design-review` left them. On a cut-out face, the collar takes the frame's color over a transparent background, so it no longer reads as cloth: the neck simply stops at the oval's bottom. Hair wider than the oval is still clipped by it. A no-oval variant was tried on 2026-10-14 on the sample and four eval photos, with the cut-out filling the frame and the collar over the clothes. It made faces much larger and showed the crop's straight top edge on tight crops. The user approved the oval (canvas v57) on 2026-10-14.

### 6. The report never sets a mask that has not loaded

Per CSS Masking, a mask image that fails to load is a transparent layer, which would hide the face entirely. So `ReportDraping` preloads `/api/face/<id>/mask` with an `Image()`. The state goes `pending` → `cut` (onload) or `plain` (onerror).

- While pending, the island's wrapper hides its `img`s (`visibility: hidden`), not removes them. The existing DOM-read face-error detection keeps working.
- `cut` passes `faceMaskSrc`. `plain` passes none. A failed outline never sets `deleted`.
- A report from before this change gets a 404 for its outline and shows as today.

The sample pages pass the static outline directly. It ships with the build, so it cannot 404.

### 7. The sample face's outline

`scripts/sample-face-mask.ts` reuses `evals/extract.ts`'s pattern: headless Chromium, the installed `vision_bundle.mjs`, and `PERSON_MODEL` from `mediapipe.ts`. It segments `public/images/examples/face.webp` as a whole, since that file is already the crop, and writes `public/images/examples/face-mask.png` (about 24 KB). `SAMPLE_FACE` gains `mask: "/images/examples/face-mask.png"`. The same PNG goes onto the canvas as an asset.

### 8. Eval

Neither eval can move:

- `EXTRACTOR_VERSION` hashes `extract.ts` and the named constants `WASM`, `FACE_MODEL`, `HAIR_MODEL` and `MAX_SIDE`, not `mediapipe.ts` as a whole. Adding `PERSON_MODEL` re-extracts nothing, and `results.json` stays put.
- The model's input is unchanged (decision 3).

So per CLAUDE.md's eval check, this change is not judged by the eval at all.

### 9. Canvas

Before any UI code, these get the cut-out sample face:

- the design system's DrapingPair (a `faceMaskSrc` prop and the two CSS rules);
- MVP canvas board 10 (Full report, 375 and 1280);
- board 18 (Sample report);
- board 19 (GPT alternative, 375 and 1280).

Board 10d (no face) does not change. The canvas uses the same `face-mask.png` as the app.

## Risks / Trade-offs

- **[Outline quality varies by photo.]** The segmenter can keep a held object, like the microphone in the prototype, or leave a faint halo against a busy, same-colored background. → It is still better than the full wall. The person can retake, and the design canvas shows the real model's output on the sample.
- **[Upload grows by about 20–35 KB per photo analysis.]** About double today's ~30 KB crop, still small on mobile, and it rides in the same request.
- **[The outline request hangs.]** The face would stay hidden. → The outline is served by the same function and store as the face, so a hang there would hang the face too. Today's behavior in that case is the same blank. No extra timeout is added. Add one if Sentry shows slow mask routes.
- **[Production bucket refuses PNG before the migration.]** Outline uploads would fail to Sentry and reports would show as today. → Apply the migration before the deploy that sends outlines (Migration Plan).
- **[Extra model on the phone.]** 0.25 MB and a few ms per pass, after the check has passed, so it never delays a retake.

## Migration Plan

1. Apply the bucket migration to the Supabase project (MCP `apply_migration`, as for `t5-report-images`) before the PR merges.
2. Merge. The client sends outlines and the server stores them. Old reports keep working without one.
3. Check on a preview deployment:
   - a photo analysis stores `<id>.jpg` and `<id>.mask.png`;
   - `/api/face/<id>/mask` answers `image/png`, `private, no-store`;
   - the report shows the cut-out on both colors;
   - an old report shows the face as before.
4. Rollback: revert the code. Stored outlines expire within 24 h. The migration can stay, since allowing PNG is harmless.
