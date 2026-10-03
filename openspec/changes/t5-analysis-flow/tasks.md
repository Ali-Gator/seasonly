## 1. Tracker

- [x] 1.1 Update the plan for `t5-analysis-flow` on branch `t5-analysis-flow`:
  - add a "T5 planned" Log line to the Tracker;
  - set T5 to In progress;
  - remove the items this change folds in from "Carried in from finished changes" (Architecture and phases tab).

  T5 stays In progress until `t5-report-delivery`, `t5-report-images` and `t5-funnel-analytics` archive as well. Done when the Log shows the line and the carried list no longer holds the folded items.

## 2. Copy approval (user gate)

- [x] 2.1 Add to the MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) the states in design.md decision 10:
  - the several-faces retake;
  - the retake screen with "Continue without a photo";
  - the quiz-only reveal;
  - the no-result and error screens;
  - the 11 reveal lines, shown with each season's tagline. Soft Autumn's line is the canvas line verbatim. Each line stays within 160 characters and never names its season.

  Done when the user approves in chat; record the date here and in `mvp-design-canvas` memory. Approved 2026-10-03 (canvas v14: artboards 04e, 04f, 08b–08e).

- [x] 2.2 Ask the user to approve these edits to existing tests (CLAUDE.md gate), each of which the new data or components would otherwise break:
  - `packages/analysis/src/photo-check/photo-check.test.ts`: the whole-map `toEqual` on `RETAKE_TIPS` gains the several-faces tip;
  - `packages/analysis/src/report-text/report-text.test.ts`: `FIELDS` gains `revealLine`, and the Soft Autumn `toEqual` gains its canvas reveal line;
  - `apps/web/src/components/ds/ds.test.tsx`: the class-coverage fragment renders the four new components in every variant.

  Done when the user approves in chat; record the date here. Approved 2026-10-03.

## 3. Setup

- [x] 3.1 Add `@mediapipe/tasks-vision` and `botid` to `apps/web`. Check these names against the installed packages and docs, and fix design.md decisions 3 and 7 wherever a name differs:
  - `FilesetResolver.forVisionTasks`;
  - `FaceLandmarker` with `numFaces`, `runningMode: "IMAGE"` and `delegate: "CPU"`;
  - `ImageSegmenter`'s category mask, and the hair segmenter model's versioned path and class index;
  - `withBotId`, `initBotId` and `checkBotId`.

  Done when `pnpm install` succeeds and design.md matches.

- [x] 3.2 Move the lazy Supabase server client from `apps/web/src/lib/abuse/daily-cap.ts` to `apps/web/src/lib/supabase.ts` (design.md decision 6). Done when the unchanged `daily-cap.test.ts` passes.
- [x] 3.3 Wire BotID (design.md decision 7):
  - `withBotId` in `next.config.ts`;
  - `BOTID_PROTECT` (the analyze route, `POST`) in `apps/web/src/lib/abuse/botid.ts`;
  - `initBotId({ protect: BOTID_PROTECT })` in `instrumentation-client.ts`.

  Then run `pnpm build && pnpm start` with `CI=1` and no env, and call `checkBotId()` from a throwaway route. Done when it answers not-a-bot and the throwaway route is deleted. If it answers bot, stop and ask the user. 2026-10-03: plain `checkBotId()` threw (no OIDC token under `next start`); the user chose `isDevelopment: process.env.VERCEL !== "1"`, which answered human under `next start`.

## 4. Tests first

Existing tests change only as approved in 2.2. Any other change to an existing test needs the user's approval first.

- [ ] 4.1 Make the edits approved in 2.2 to `photo-check.test.ts` and `report-text.test.ts`, and write `packages/analysis/src/report-text/reveal-line.test.ts`, citing the photo-check and report-text delta scenarios. Cover:
  - the several-faces tip exists, differs from the other four and equals its approved copy;
  - every season has a reveal line within 160 characters that does not contain its season's name;
  - Soft Autumn's line equals the canvas.

  Done when they fail for the missing data.

- [x] 4.2 Write `apps/web/src/components/ds/flow-components.test.tsx`, citing the ui-components delta scenarios. Cover StepProgress, QuizOption, CameraFrame and PhotoTipCard, with `renderToStaticMarkup` as in `ds.test.tsx`. Add the four components to `ds.test.tsx`'s class-coverage fragment, as approved in 2.2. Done when both fail for the missing components.
- [ ] 4.3 Write `apps/web/src/lib/capture/capture.test.ts`, citing the capture-flow scenarios. Cover:
  - the two-face rule: 200 px + 200 px gives `several-faces`; 400 px + 60 px checks only the 400 px face;
  - the crop box for a 3000 × 4000 photo with a 1200 px face: it contains the face box, stays in the image and scales to ≤ 512 px;
  - `track` sends nothing without PostHog;
  - the `photo_checked` properties carry no pixel, landmark or image field.

  Done when it fails for the missing module.

- [ ] 4.4 Write `apps/web/src/app/(flow)/analyze/flow-state.test.ts`, citing the capture-flow, quiz and season-reveal scenarios. Cover:
  - Back from question 2 gives question 1;
  - an outcome replaces analyzing, so Back from the reveal gives question 4;
  - a reload state starts at the guide;
  - consent is asked once per visit;
  - the continue-without-a-photo offer appears only on the second failure in a row, and a pass resets the count;
  - the quiz-only request carries answers only;
  - no preselected answer, and Next is blocked until one is chosen;
  - answers survive Back, a rejection and "Retake my photo";
  - a retake after the quiz goes straight to analyzing;
  - a 403 or a timeout gives the error screen, and "Try again" re-sends the same request.

  Done when it fails for the missing module.

- [ ] 4.5 Write `apps/web/src/app/api/analyze/route.test.ts`, citing the season-reveal and abuse-controls scenarios. Mock `botid/server`, `@/lib/report-text`, `@/lib/analysis/store` and `@sentry/nextjs`. Cover:
  - 400 for each malformed input, with no claim, no call and no save;
  - the server classifies Soft Autumn's reference traits;
  - one report-text call with exactly the crop for a photo, and none for quiz-only;
  - a rejection stores nothing;
  - `no-result` for `answers-cancel`;
  - a bot gets 403, with no call and no save;
  - a failed save returns a null id;
  - `maxDuration` is 60;
  - `BOTID_PROTECT` holds `POST /api/analyze`.

  Also write `apps/web/src/lib/analysis/store.test.ts` against the migration in PGlite, as in `daily-cap.test.ts`. Cover:
  - a personal result's row and its 22-character id;
  - `is_test` true when `VERCEL_ENV` is not `production`;
  - `anon` is refused both select and insert;
  - a hanging client gives `null` after 3 s.

  Done when both fail for the missing modules and migration.

- [ ] 4.6 Add `e2e/fixtures/face.jpg`: a CC0 or public-domain portrait of one adult in daylight, with no filter. Record its URL and license in `e2e/fixtures/README.md`. Change `playwright.config.ts` as design.md decision 11 says: starved `webServer.env`, port 3100, `reuseExistingServer: false`. Confirm that Next keeps an empty pre-set variable over `.env.local`. Then write `e2e/analysis-flow.spec.ts` (design.md decision 11), citing the season-reveal exit and spend-nothing scenarios and the capture-flow no-face scenario. Its tripwire asserts that the analyze response is not `personal` and has a null `reportId`. Done when it fails because the flow is missing. Once the flow exists (7.x), the fixture must pass the photo check. If it does not, pick another photo; never loosen a threshold.

## 5. Core

- [ ] 5.1 Add the approved several-faces tip to `RETAKE_TIPS` as `Record<PhotoProblem | "several-faces", RetakeTip>` (export `RetakeReason`). Add `revealLine` (limit 160) to `SeasonCopy`, `COPY_LIMITS` and the 12 seasons. Done when 4.1 and the existing core tests pass.

## 6. Components

- [x] 6.1 Port StepProgress, QuizOption, CameraFrame and PhotoTipCard from the canvas bundle into `apps/web/src/components/ds/`, with their `bundle.css` rules in `ds.css`. Two adaptations: CameraFrame takes `children` (a `<video>` or `<img>`) in place of `src`, and PhotoTipCard's slots take an optional image. Export them from `index.ts`. Done when 4.2 and the existing "every class has a rule" test pass.

## 7. Flow and route

- [ ] 7.1 Add `supabase/migrations/<timestamp>_reports.sql` and `apps/web/src/lib/analysis/store.ts` (design.md decision 6). Done when `store.test.ts` passes.
- [ ] 7.2 Add `apps/web/src/lib/analysis/request.ts` (zod form-data parsing) and `apps/web/src/app/api/analyze/route.ts` (design.md decision 5). Done when `route.test.ts` passes.
- [ ] 7.3 Add `apps/web/src/lib/capture/`:
  - `mediapipe.ts`: lazy singletons and CDN URLs from the installed version (design.md decision 3);
  - `photo.ts`: decode and downscale, landmarks, hair mask, `checkPhoto` and `samplePhoto`, then the crop;
  - `faces.ts`;
  - `events.ts`.

  Done when 4.3 passes.

- [ ] 7.4 Add `flow-state.ts`, `flow.tsx` and `page.tsx` in `apps/web/src/app/(flow)/analyze/`, and the steps:
  - `_capture/`: guide, capture, retake, consent;
  - `_quiz/`: four questions;
  - `_reveal/`: analyzing, reveal, no-result, error.

  Use the canvas copy and the copy approved in 2.1. Done when 4.4 passes and 4.6's E2E passes locally on a 390 × 844 viewport in under 30 s.

## 8. Gate and external (each external step needs the user's yes in chat)

- [ ] 8.1 Run `pnpm fix` then `pnpm test`. Done when both are green.
- [ ] 8.2 With the user's confirmation, apply the `reports` migration to the Supabase project `seasonly` (ref `qisseuermrrwvvnfyjet`) through the connector. As `anon`, `select` from `public.reports` and expect a permission error. Done when the connector lists the migration and `anon` was refused.
- [ ] 8.3 Push the branch. On the Vercel preview, on a real phone, check:
  - the camera's live view and the camera-blocked upload path;
  - a deliberately dark photo gets the dark retake;
  - a good photo goes through to the reveal, timed. With the user's yes, this is one paid vision call.
  - the `reports` row has `is_test` true and source `personal`;
  - the BotID challenge header is present on the analyze request;
  - the PostHog events arrive in project 290879.

  Then delete the test row. Done when the user has seen the timing and a Tracker Log line records the result.

## 9. Archive prep

- [ ] 9.1 At archive, add the README rows, re-add each new spec's Public Interface, Behavior and Edge Cases, and update the plan's carried list:
  - `capture-flow`: `apps/web/src/app/(flow)/analyze/page.tsx`, `apps/web/src/app/(flow)/analyze/flow.tsx`, `apps/web/src/app/(flow)/analyze/flow-state.ts`, `apps/web/src/app/(flow)/analyze/_capture/**`, `apps/web/src/lib/capture/**`;
  - `quiz`: `apps/web/src/app/(flow)/analyze/_quiz/**`;
  - `season-reveal`: `apps/web/src/app/(flow)/analyze/_reveal/**`, `apps/web/src/app/api/analyze/**`, `apps/web/src/lib/analysis/**`.

  The carried list gets three groups of items:
  - **`t5-report-delivery`:** "Get my full report" on the reveal; a reveal with no report id; reading `reports`; checking "30 colors".
  - **`t5-report-images`:** crop storage.
  - **`t8-photo-privacy`:** consent; deleting `is_test` rows on a schedule; the jsDelivr and Google model downloads.
  - **`t7-paywall-off`:** the analyze response carries the season, and the reveal's tagline and line are unique per season. So the subtype can be worked out from the free teaser, and the paywall must withhold both when it is on.

  Also edit the Purpose of `abuse-controls` and the Edge Cases line on BotID. Done when `openspec validate --specs` passes and the README mapping test passes.
