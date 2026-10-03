## Context

`/analyze` is a stub inside `(flow)/layout.tsx`, which has a wordmark-only header (t14 decision 6). The core already gives the flow most of what it needs:

- `checkPhoto` with its `RETAKE_TIPS`;
- `samplePhoto`, which takes RGBA pixels, 468 or 478 landmarks and an optional hair mask, and returns traits;
- `classify`, which returns a `SeasonResult` or a `NoResult` with the reasons `no-answers` and `answers-cancel`;
- `QuizAnswersSchema` and `SEASON_COPY`.

`apps/web` has:

- `generateReportText`, which never throws. It returns `personal`, `static` with a fallback reason, or `rejected` with `no-face` or `several-faces`.
- `claimAnalysisSlot`, which has its own lazy Supabase client.
- `withErrorCapture`.
- `initPostHog` in `instrumentation-client.ts`.
- The ds components Button, Icon, Note, Swatch and ReportSection, rendered as server components and tested with `renderToStaticMarkup` in Vitest's node environment.

The site chrome's CTA already links to `/analyze`.

The approved canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) shows each step:

- Guide 02, Capture 03 and Bad 04a–d;
- Consent 05, Quiz 06 ×4, Analyzing 07 and Reveal 08.

Its design-system bundle (`project/ds/seasonly/components/bundle.js`) holds StepProgress, QuizOption, CameraFrame and PhotoTipCard. The step progress has the steps Photo, Quiz and Result: Photo is current from the guide to consent, Quiz during the quiz, and Result while analyzing. The reveal has no progress bar.

E2E runs `next start` on GitHub Actions with no secrets (`e2e.yml`).

Motivation: proposal.md. Requirements: the six delta specs under `specs/`.

## Goals / Non-Goals

**Goals:**

- Pixels never leave the phone before consent, and after it only the crop leaves. Everything else is numbers.
- The server is the only author of a stored result. The client sends measurements and answers, never a season or text.
- Every network outcome maps to a screen: reveal, retake, no-result or error. There is no stuck spinner.
- CI's E2E runs the real flow, with real MediaPipe on a real photo, at no cost.

**Non-Goals:**

- The email step, the report page, sharing and draping (the other t5 changes).
- Storing the crop (`t5-report-images`), and the retention cron (`t8-photo-privacy`).
- Funnel-step events (`t5-funnel-analytics`).
- A live face-tracking viewfinder. The camera shows a plain preview, and the check runs on the still photo.

## Decisions

### 1. Steps as a pure reducer plus one client component

`(flow)/analyze/page.tsx` stays a server component, which keeps the page's metadata. It renders `flow.tsx` (`"use client"`), which holds:

- the step;
- the photo result (crop blob, traits, face count);
- the answers;
- the failure count;
- the consent flag;
- the last request.

The transitions live in `flow-state.ts` as a pure `reduce(state, event)`, which is unit-tested in Node. Rendering each step is plain JSX in the private folders `_capture/`, `_quiz/` and `_reveal/`. The `_` prefix keeps them out of routing.

History follows t14 decision 5:

- Each step change calls `history.pushState({ step }, "")`, and `popstate` dispatches `back`.
- Analyzing to its outcome uses `replaceState` (capture-flow spec).
- Leaving analyzing by Back aborts the in-flight request.

A component-test setup (jsdom, Testing Library) was considered. It is not needed: the reducer carries the logic, and E2E carries the wiring.

### 2. Where each computation runs

| Work                                                                   | Where                   | Why                                                                                            |
| ---------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| Decode, downscale to ≤ 1280 px long side, landmarks, hair mask         | Browser (`lib/capture`) | MediaPipe is the per-platform adapter, outside the core (architecture-boundaries)              |
| `checkPhoto`, `samplePhoto`                                            | Browser                 | The check must run before consent; sampling needs the full photo, which never leaves the phone |
| Crop: landmark box + 30 % margin, clamped, ≤ 512 px, JPEG quality 0.85 | Browser                 | Only the crop leaves                                                                           |
| `classify`, `generateReportText`, save                                 | Server (`/api/analyze`) | The stored result must not be client-authored                                                  |

Decoding uses `createImageBitmap(file)`, which applies EXIF orientation by default. A canvas then gives `getImageData`. The camera path draws the current video frame onto the same canvas, mirrored only on screen.

Considered: sampling on the server. That needs the full photo or a JPEG decoder on the server, and both are worse.

### 3. MediaPipe: CPU delegate, assets from pinned CDN URLs

`@mediapipe/tasks-vision` (pinned) provides the models:

- `FaceLandmarker`, with `numFaces: 2`, image mode and 478 landmarks, so the irises are sampled;
- `ImageSegmenter`, with the hair segmenter model, for the category mask that becomes `hairMask`.

Both use the CPU delegate. For one still image it takes well under a second on a phone, and headless Chromium in CI has no GPU.

The assets come from pinned URLs:

- The wasm loads from `cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@<installed version>/wasm`. The version is read from the package's `package.json` at build time, so the code and the wasm never drift.
- The models load from `storage.googleapis.com/mediapipe-models/...`, on versioned paths, never `latest`:
  - `face_landmarker/face_landmarker/float16/1/face_landmarker.task`;
  - `image_segmenter/hair_segmenter/float32/1/hair_segmenter.tflite`, whose category mask is 0 for background and 1 for hair.

`FilesetResolver.forVisionTasks(wasmUrl)` loads the wasm. Both tasks are made with `createFromOptions(fileset, { baseOptions: { modelAssetPath, delegate: "CPU" }, runningMode: "IMAGE", … })`: the landmarker with `numFaces: 2`, the segmenter with `outputCategoryMask: true`. The mask is read with `categoryMask.getAsUint8Array()`. Checked against `@mediapipe/tasks-vision` 1.0.1, pinned exactly.

Loading starts when the guide mounts, so it overlaps reading the guide.

Considered: self-hosting under `public/`. That keeps all traffic first-party, but it commits about 15 MB of binaries or adds a copy-and-download build step. `ponytail:` CDN assets, so self-host if a CDN outage or the privacy page makes it worth the step.

Model paths and API names are checked against the installed package in task 3.1.

### 4. Two faces: largest first, a second at the core's minimum width

The landmarker returns up to two faces. The flow sorts them by landmark-box width:

- If the second is at least `MIN_FACE_WIDTH` px, the result is `several-faces`.
- Otherwise only the largest face goes to `checkPhoto`.

The rule is a pure function in `lib/capture/faces.ts`. `several-faces` is not a `PhotoProblem` of the core: it never comes out of `checkPhoto`. So `RETAKE_TIPS` becomes `Record<PhotoProblem | "several-faces", RetakeTip>` (photo-check delta). The retake screen looks up either the local problem or the server's rejection in the same map.

### 5. `POST /api/analyze` contract

The request is `multipart/form-data`, read with the native `request.formData()`, so it needs no base64 and no dependency. It has these fields:

- `answers`: JSON, `QuizAnswersSchema`, required;
- `traits`: JSON, three numbers in [-1, 1];
- `crop`: a file.

`traits` and `crop` come both or neither. The crop must be no larger than 512 KB, start with the JPEG magic bytes `FF D8 FF` and have type `image/jpeg`.

The handler runs in this order, and stops at the first step that answers:

1. `checkBotId()`: a bot gets 403.
2. Validation (zod in `lib/analysis/request.ts`): failure gets 400.
3. `classify`: a `NoResult` gets 200 `{ kind: "no-result", reason }`.
4. With a photo, `generateReportText`: `rejected` gets 200 `{ kind: "rejected", problem }`.
5. `saveReport` with a 3 s limit, which never throws.
6. 200 `{ kind: "result", reportId: string | null, season, agreement, confidence, photo, text }`.

`text` is `"personal" | FallbackReason | "quiz-only"`. `photo` is the verdict, or `null` when no call judged the photo.

The route exports `POST = withErrorCapture(...)` and `maxDuration = 60`. Its worst case is 26 s (season-reveal spec). The client gives up at 45 s. Its seams are module mocks of `botid/server`, `lib/report-text` and `lib/analysis/store`. The route has no injected parameters.

The personal summary and note are not returned to the browser: the reveal does not show them. The report page reads them from the record.

### 6. `reports` table

The migration `supabase/migrations/<ts>_reports.sql` creates this table:

```sql
create table public.reports (
  id text primary key,                -- 16 random bytes, base64url (22 chars)
  created_at timestamptz not null default now(),
  season text not null,
  runner_up text not null,
  confidence numeric(3,2) not null,
  agreement text not null,
  traits jsonb not null,
  answers jsonb not null,
  photo_verdict text,                 -- null: quiz-only or no model call
  text_source text not null,          -- personal | capped | cap-unavailable | failed | timeout | invalid | quiz-only
  summary text,                       -- personal only
  agreement_note text,                -- personal only
  is_test boolean not null
);
alter table public.reports enable row level security;   -- no policies
revoke all on public.reports from public, anon, authenticated;
grant select, insert on public.reports to service_role;
```

These follow `daily_cap.sql` and its PGlite test: Supabase's roles are recreated and its default grants replayed. `is_test` is `process.env.VERCEL_ENV !== "production"`, which also covers local runs and CI. The save fails in CI, though, since CI has no secrets. A `check` constraint on season and text source was considered and rejected: the zod-validated server is the only writer.

`claimAnalysisSlot` and `saveReport` share one lazy server client, moved to `apps/web/src/lib/supabase.ts`. The move is a small edit to `daily-cap.ts`; its tests keep passing through their `rpc` seam.

`saveReport` is wrapped like the claim:

- a 3 s abort, also raced;
- every failure reported to Sentry and flushed;
- `null` returned on failure.

### 7. BotID

Three pieces wire it in:

- `withBotId(nextConfig)` in `next.config.ts`, composed inside `withSentryConfig`;
- `initBotId({ protect: [{ path: "/api/analyze", method: "POST" }] })` in `instrumentation-client.ts`;
- `checkBotId()` first in the handler.

Off Vercel, `checkBotId` answers human by default, per its documented local behavior. Task 3.3 confirms this under `next start` before the E2E relies on it. If it does not hold, stop and ask: no test-only bypass env var is added on a guess.

### 8. Events from the browser

All three events go through `posthog.capture` in the client, where every outcome is already known. This also means no `posthog-node` dependency. The property names are in the capture-flow and season-reveal specs. A small `track(name, props)` in `lib/capture/events.ts` no-ops when PostHog is not initialised. Ad blockers drop some events; `t5-funnel-analytics` accepts the same.

### 9. Analyzing screen progress

The two first lines ("Checked the light", "Found your … colors") are true before the request starts. The other two lines tick on elapsed time. The bar eases toward 90 % over about 20 s and completes on the response. "About N seconds left" counts down from 20 and then shows "Almost done". The time is an estimate, and the copy says "under 30 seconds".

### 10. Copy to approve on the canvas

These artboards and states are added to the canvas, and the user approves them before any flow code (task 2.1):

- **Several-faces retake:** title, message, tip and icon.
- **Retake with offer:** a third action, "Continue without a photo", after the second failure in a row.
- **Quiz-only reveal:** a note saying the result comes from the quiz alone, and "Add a photo" in place of "Retake my photo".
- **No-result:** a heading and line, plus "Change my answers" (to question 1) and "Add a photo" (to capture).
- **Error:** a heading and line, plus "Try again".
- **Reveal lines:** 11 lines, each at most 160 characters. Each comes from that season's approved summary, with the sentence that names the season dropped. Soft Autumn's line is the canvas line.

The canvas note "gives you 30 colors" stays verbatim. `t5-report-delivery` checks it against the report it builds.

### 11. E2E

`e2e/analysis-flow.spec.ts` runs on a 390 × 844 viewport. It holds two tests:

1. **The exit check:** `/`, then the CTA, then "Upload a photo", then `setInputFiles` with `e2e/fixtures/face.jpg`, then "Agree and upload", then four answers, then the reveal shows a family name. All of it must finish within 30 s.
2. **No face:** a solid grey PNG, generated in the test, gets the "No face found" retake screen and makes no `/api/analyze` request.

The fixture is a CC0 or public-domain portrait: one adult in daylight, with no filter. `e2e/fixtures/README.md` records its URL and license.

E2E never spends anything, wherever it runs. Locally, `pnpm dev` would load `apps/web/.env.local`, which holds real Supabase, Gateway and Sentry values. So `playwright.config.ts` changes in three ways:

- `webServer.env` sets `SUPABASE_URL=http://127.0.0.1:9` (unreachable), and blanks `SUPABASE_SECRET_KEY`, `AI_GATEWAY_API_KEY` and `NEXT_PUBLIC_SENTRY_DSN`. Next gives variables already in `process.env` precedence over `.env*` files; task 4.6 confirms this holds for empty strings.
- The server runs on its own port, 3100, with `reuseExistingServer: false`, so E2E never attaches to a developer's live server.
- The claim then answers `unavailable`, so no model call is made, the static copy is used and the save returns `null`. The reveal still shows.

The test also trips on a leak: it waits for the `/api/analyze` response and asserts that `text` is not `personal` and `reportId` is `null`.

## Risks / Trade-offs

- [The MediaPipe download, about 10 MB of wasm and 4 MB of models, is slow on mobile data] → Loading starts on the guide. If the guide's "Take a selfie" is pressed before loading ends, the capture step shows the camera at once and the check waits. Speed Insights shows the real cost.
- [The CDN's wasm version could drift from the installed JS] → The URL is built from the installed `package.json` version.
- [Two-face false rejects from background people] → The second face must reach the minimum face width. `t6-eval-set` measures the rate (carried there already).
- [A CC0 face might not pass the photo check's provisional thresholds] → Task 4.6 runs the fixture through the check first, and picks another photo if it fails. Thresholds are not loosened for a fixture.
- [The client-sent traits could be forged] → It is the person's own result, and the server bounds every number. Text and season are never client-authored.
- [A failed save leaves a reveal with no report id] → It is reported to Sentry. `t5-report-delivery` decides what "Get my full report" does without an id.
- [BotID off Vercel may not default to human under `next start`] → Task 3.3 checks this before E2E depends on it.

## Migration Plan

1. The `reports` migration goes to the Supabase project `seasonly` through the connector, after the user confirms. Previews and production share it.
2. Deploy with the branch's preview. Then check on a real phone (task 8.3): the camera, a retake, and a full analysis with the personal text. That costs one vision call, so it waits for the user's yes.
3. Rollback: revert the deploy. The table can stay, because nothing else reads it yet.

## Open Questions

- Real photos for the guide's tip cards: the T3 open item. Until then they ship as labeled placeholders, as on the canvas.
