## 1. Plan and canvas

- [x] 1.1 Tracker (Claude Docs concept, https://claude.ai/code/artifact/23434923-c1ff-47d6-8ce6-7c86fd14856c): add row T20 "Camera straight from the landing (t20-camera-from-home): Take a selfie opens the camera; desktop email focus", Code, Claude Code + Claude Design, In progress. Add a Log line, newest first. Verify: the row and the Log line show.
  - Done 2026-10-17 (Tracker rev 88): the row is below T19 with status "In progress", and the Log line is at the top.
- [x] 1.2 MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3), edited in place after a bare `read`:
  - Board 03 Capture: the caption becomes "Face a window, no makeup or filter. Fit your face in the oval and hold still."
  - Board 03 Capture: below "Camera blocked or not working?…", add the guide's lock-icon upload notice with its Privacy policy link (copy from board 02).
  - Boards 01 Landing 375 and Landing-1280: the hero's "Take a selfie" links to board 03 instead of 02. "Upload a photo" stays on 02.

  No DS change. Verify: the canvas version is noted here. Board 03 at 375 shows the camera frame, both actions, the blocked caption and the notice. The landing's Take a selfie opens 03 in the canvas's Play mode.
  - Done 2026-10-17, canvas version 61 (1792265748-41c5). Board 03 has the new caption and the guide's lock notice with its Privacy policy link; it grew from 960 to 1080 px. The landing boards link to real routes since T14, not to boards, so their hero "Take a selfie" now reads `href="/analyze?start=camera"` (as the app will); "Upload a photo" stays `/analyze`.

- [x] 1.3 Ask the user to approve board 03 and the two link changes (CLAUDE.md: the canvas before UI code). If the approved caption differs from 1.2's draft, update `specs/capture-flow/spec.md` first. Verify: their approval and its date are recorded here. No task in groups 2–3 starts before it.
  - Approved by the user on 2026-10-17 as drawn (canvas version 61). The caption matches 1.2's draft, so the spec stays.
- [x] 1.4 Existing-test edit, one, needs the user's yes (CLAUDE.md). In `apps/web/src/lib/site-content/content.test.tsx` ("has the hero, the three steps…"), the hero assertion `href="\/analyze"[^>]*>.*?Take a selfie` must become `href="\/analyze\?start=camera"[^>]*>.*?Take a selfie`. The Upload assertion stays. No other existing test pins the hero href, the guide-first open, the capture caption or the email focus:
  - `CameraFrame`'s test passes its own caption.
  - jsdom has no `matchMedia`, so the DOM focus tests keep the heading.
  - E2E starts from "Find my colors" or `/analyze`.

  If another breaks anyway, stop and ask. Verify: approval recorded here.
  - Approved by the user on 2026-10-17: the hero's Take a selfie assertion becomes `/analyze?start=camera`.

## 2. Tests first (each cites its scenario at the permanent path)

- [x] 2.1 `capture-flow`, reducer: new cases in `apps/web/src/app/(flow)/analyze/flow-state.test.ts`:
  - `start-camera` on the initial state gives `{ name: "capture" }` with an empty trail;
  - on any other state (a quiz question, a non-empty trail) it changes nothing.

  Verify: they fail for the missing event.

- [x] 2.2 `capture-flow`, DOM: new cases in `apps/web/src/app/(flow)/analyze/flow.dom.test.tsx`:
  - with `location` at `/analyze?start=camera`, the capture heading renders and the guide heading does not;
  - `location.pathname + location.search` reads `/analyze` afterwards;
  - no element has focus, StrictMode included (the file's existing StrictMode wrapper);
  - `?start=quiz` renders the guide;
  - with `matchMedia` stubbed to match `(hover: hover) and (pointer: fine)`, reaching the email step focuses the email input;
  - with it stubbed not to match, the email step focuses its `h1`.

  Reach the email step the way the file's existing email cases do. Verify: each fails for the missing behavior, not for an import error.
  - Done 2026-10-17. The file had no email cases, so the new ones stub `fetch` with a saved result and click "Get my full report", and a file-level `vi.mock("next/navigation")` gives `EmailStep` a router. That is new setup; no existing assertion changed. Before 3.x the camera case and the mouse case failed on their assertions.

- [x] 2.3 `capture-flow`, capture screen: new cases in `apps/web/src/app/(flow)/analyze/_capture/guide.test.tsx`. `Capture` renders the new caption, and below its actions the upload notice: crop only once the quiz is finished, Google through Vercel without training, 24 hours, 90 days, and a link to `/privacy`. The guide's notice case still passes. Verify: it fails on today's `Capture`.
- [x] 2.4 `site-content`: after 1.4's approved edit, the hero case asserts Take a selfie → `/analyze?start=camera` and Upload → `/analyze`. Add the "The hero's actions" scenario's citation. Verify: it fails on today's landing.
- [x] 2.5 E2E, new tests in `e2e/analysis-flow.spec.ts`:
  - "Opening on the camera": from `/`, click the hero's "Take a selfie". The heading "Take your selfie" is attached, and the URL ends `/analyze`. To prove the guide never painted, a `page.addInitScript` `MutationObserver` sets a window flag if "Three things before your selfie" ever enters the DOM; assert the flag is false.
  - "Back from the camera": then `page.goBack()` shows the landing's h1.
  - "Reload after opening on the camera": `page.reload()` shows the guide.

  CI's Chromium has no camera, so the capture step shows the blocked caption, which is fine. Verify: they fail on today's build.
  - Done 2026-10-17 as one test, plus a second: a fresh load of `/analyze?start=camera`, two quiz steps in, then Back must stay in the flow with no reload. With `replaceState(null, …)` that test fails (the flow's entries lose Next's `__NA` key and Back reloads the page), so it guards decision 1's state pass-through. The first test also checks that the URL has no search part once the quiz opens.

- [x] 2.6 `analytics`: a new case in `e2e/funnel.spec.ts`, same capture helpers. From `/`, the hero's "Take a selfie" sends `$pageview /analyze` exactly once. Verify: it passes after 3.x, and fails if the strip fires a second pageview.

## 3. Code (specs: `capture-flow`, `site-content`)

- [x] 3.1 `flow-state.ts`: add `{ type: "start-camera" }` to `FlowEvent`. In `reduce`, it replaces the step with `{ name: "capture" }` only when the step is `guide` and the trail is empty; otherwise it returns the state as is (design decision 2). Verify: 2.1 passes.
- [x] 3.2 `flow.tsx`: add a mount-only `useLayoutEffect` (design decisions 1 and 3):
  - if `new URLSearchParams(location.search).get("start") === "camera"`, compute the next state with `reduce`, set `focused.current` to its step, dispatch `start-camera`, and call `history.replaceState(history.state, "", "/analyze")`;
  - in the focus effect, pick `main [data-autofocus]` when `window.matchMedia?.("(hover: hover) and (pointer: fine)").matches`, else `main h1` (design decision 5).

  Before writing, read the Next 16 docs under `node_modules/next/dist/docs/` on native `history.replaceState` (AGENTS.md). Verify: 2.2 passes, and the existing focus and history cases pass unedited.
  - Done 2026-10-17, with two refinements. (1) `start-camera` returns the module constant `CAMERA_START`, and a one-shot `opening` ref skips focus for it. Setting `focused.current` alone fails: the mount's own focus effect then sees the guide, so the capture heading took focus. (2) Next's patched `replaceState` skips syncing its router when the state carries `__NA`, so Next's own copy of the URL keeps `?start=camera`. Nothing on `/analyze` reads it (no `useSearchParams`/`usePathname`), and the E2E checks that the URL stays clean. Passing `null` would sync it, but on a fresh load this effect runs before Next patches history, and Back would then reload the page.

- [x] 3.3 `_capture/steps.tsx`: move the lock-icon paragraph out of `Guide` into `UploadNotice`, rendered by `Guide` and below `Capture`'s blocked caption. Set `CAMERA_CAPTION` to the approved text. Verify: 2.3 passes, and the guide's existing cases pass unedited.
- [x] 3.4 `_email/step.tsx`: pass `data-autofocus` to `EmailInput`. Verify: 2.2's desktop case passes, and `email-step.test.tsx` passes unedited.
- [x] 3.5 `apps/web/src/app/(site)/page.tsx`: the hero's "Take a selfie" `href="/analyze?start=camera"`, plus a one-line comment citing the site-content requirement. Verify: 2.4 and 2.5 pass.

## 4. Gate and checks

- [ ] 4.1 `pnpm fix`, then `pnpm test`, then `pnpm test:eval`. The analysis is untouched, so `results.json` should not be stale. If it is, run `pnpm eval:run` and commit `evals/results.json` (CLAUDE.md). Verify: all three pass.
- [x] 4.2 `pnpm e2e` locally, at least `analysis-flow.spec.ts`, `funnel.spec.ts` and `design-review.spec.ts`. Verify: green.
- [ ] 4.3 Manual check in the browser pane on `pnpm dev`:
  - the landing's Take a selfie paints the capture step with no guide frame (screenshot);
  - Back returns to the landing;
  - reload shows the guide;
  - the email step at desktop width has the cursor in the field.

  Then ask the user to try Take a selfie from the landing on their iPhone on the preview deployment: the camera prompt appears directly, and the notice is below. Verify: results recorded here.

## 5. After archive

- [ ] 5.1 `openspec/specs/capture-flow/spec.md` Behavior and Edge Cases, which archive does not touch:
  - the focus bullet gains the email-field exception and the camera opening screen;
  - a new bullet describes `?start=camera` (mount-time layout effect, `replaceState`, replace not push);
  - the guide bullet notes `UploadNotice` is shared with the capture step;
  - Edge Cases gains "A hard load of `/analyze?start=camera` shows the guide for one frame".

  Public Interface gains `{ type: "start-camera" }`. Verify: `openspec validate --specs` passes.

- [ ] 5.2 Tracker: T20 status Done, plus a Log line in plain words. Verify: the row shows Done.
