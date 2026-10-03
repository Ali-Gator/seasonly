## Why

The analysis core, the photo check, the report text and the design-system components all exist, but `/analyze` is still a stub: nobody can take a selfie and get a season. This change builds the flow from the photo guide to the season reveal, on the approved MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3, rows 1 and 2). It also folds in the items earlier changes carried here. The Tracker's exit check is: an E2E run goes from the landing to the season reveal on a mobile viewport in under 30 s.

## What Changes

- **One-route flow at `/analyze`.** These steps run in client state:
  1. photo guide;
  2. capture (front camera, or upload);
  3. on-device photo check, with a retake screen when it fails;
  4. consent;
  5. four quiz questions;
  6. analyzing;
  7. reveal.

  Each step pushes a history entry, so Back stays inside the flow; this is t14 design decision 5. A refresh restarts the flow.

- **On-device photo check before anything leaves the phone.**
  - MediaPipe face landmarker and hair segmenter run in the browser.
  - The face landmarker looks for up to two faces. Two measurable faces is a `several-faces` retake.
  - `checkPhoto` from the core gives `no-face`, `dark`, `tint` or `filter`, each with its retake tip.
  - A photo that passes is sampled into traits, and the browser cuts a face crop.
  - Nothing is uploaded before the person agrees on the consent step.
- **Quiz-only fallback.** After two failed checks in a row, the retake screen also offers to continue without a photo. That path skips consent and the upload, and classifies from the quiz alone. No vision call is made, and the static copy is used.
- **`POST /api/analyze`.** The route works in this order:
  1. It refuses bots with Vercel BotID.
  2. It validates the traits, the answers and the JPEG crop.
  3. It classifies on the server.
  4. With a photo, it calls `generateReportText`.
  5. It saves the result in a new `reports` table and returns an unguessable report id.

  The report id is the handle `t5-report-delivery` attaches an email to, so the report's text is always written by the server and never by the client. Some outcomes skip the save:
  - A model rejection (`no-face`, `several-faces`) returns the problem, so the flow shows the retake screen.
  - A quiz with nothing to classify on (`answers-cancel`, `no-answers`) returns that reason.
  - If the save fails, the reveal is still shown, with no report id.

- **Season reveal.** It shows the season family, the season's tagline and a new per-season reveal line, plus the canvas note that the full report names the subtype. A quiz-only result says so. "Retake my photo" keeps the quiz answers. The canvas's "Get my full report" button comes with `t5-report-delivery`, which owns the email step it leads to.
- **Events (PostHog, no photo data).** Three events:
  - `photo_checked`: the problem, the face count and the measurements;
  - `analysis_result`: the photo verdict and the text source, which is `personal`, a fallback reason or `quiz-only`;
  - `quiz_no_result`: the reason and the answers.

  `t5-funnel-analytics` later adds the funnel steps around them.

- **New copy, approved on the canvas before code:**
  - the several-faces retake tip;
  - the reveal line for the 11 seasons other than Soft Autumn, whose line is the canvas copy;
  - the continue-without-a-photo offer;
  - the quiz-only reveal;
  - the no-result screen;
  - the error screen for a failed request.
- **Components** from the design system, carried here by t3: StepProgress, QuizOption, CameraFrame and PhotoTipCard.
- **Not done:** `import "server-only"`, which was optional in the carried list. The analyze route is the only importer of `lib/report-text` and `lib/abuse`, and the browser reaches them over HTTP only. The face crop is not stored: `t5-report-images` adds storage for draping, and `t8-photo-privacy` adds retention.

## Capabilities

### New Capabilities

- `capture-flow`: the `/analyze` step machine and history, photo guide, capture and upload, the on-device check (landmarks, face count, hair mask, `checkPhoto`), retake screens, the consent step as an upload gate, the face crop, the quiz-only fallback offer and the `photo_checked` event.
- `quiz`: the four questions from the canvas as single-choice steps. No answer is preselected, and answers are kept across a retake.
- `season-reveal`: the analyze route (BotID, validation, classification, vision call, `reports` row), the analyzing screen, the reveal, the no-result and error screens, and the `analysis_result` and `quiz_no_result` events.

### Modified Capabilities

- `abuse-controls`: adds a requirement that the analyze route refuses requests BotID classifies as bots, before any slot claim or vision call. This was moved here from t4-report-text.
- `photo-check`: "Each problem has its own retake tip" now also covers `several-faces`, which the web flow detects from the face count and the vision call reports.
- `report-text`: "Every season has its report copy" adds a reveal line per season, within a length limit.
- `ui-components`: adds requirements for StepProgress, QuizOption, CameraFrame and PhotoTipCard.

## Impact

- **Code**
  - `apps/web/src/app/(flow)/analyze/`: the page, the flow, and the private folders `_capture/`, `_quiz/` and `_reveal/`.
  - `apps/web/src/lib/capture/`: MediaPipe, the crop and the face-count rule.
  - `apps/web/src/lib/analysis/`: request validation and the report store.
  - `apps/web/src/app/api/analyze/route.ts`.
  - `apps/web/src/components/ds/`: the four components.
  - `packages/analysis/src/photo-check/tips.ts` and `report-text/`.
  - `apps/web/instrumentation-client.ts` and `next.config.ts`: BotID.
- **Database:** the migration `supabase/migrations/<ts>_reports.sql` creates `public.reports`. RLS is on, there are no policies and only the server writes. Rows from previews and tests are tagged `is_test`. It is applied to the Supabase project `seasonly` after the user confirms.
- **Dependencies:** `@mediapipe/tasks-vision` and `botid` in `apps/web`. The MediaPipe wasm and models load from pinned CDN URLs (design.md decision 3).
- **Env:** no new variable. `VERCEL_ENV` is injected by the platform.
- **E2E:** an E2E test uses a committed CC0 face photo, `e2e/fixtures/`, with its source and license recorded. CI carries no Supabase or Gateway secrets, so E2E never makes a paid call: the claim answers `unavailable`, the static copy is used and the save fails softly.
- **Downstream**
  - `t5-report-delivery`: reads `reports` by id, adds the email step and the reveal's "Get my full report" button, and handles a reveal with no report id.
  - `t5-report-images`: stores the crop for draping.
  - `t8-photo-privacy`:
    - formalizes consent;
    - deletes `is_test` rows on a schedule;
    - says on the privacy page that the MediaPipe files load from jsDelivr and Google, with no photo data.
  - `t6-eval-set`: tunes the two-face rule.
