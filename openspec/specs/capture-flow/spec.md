# capture-flow Specification

## Purpose

Takes a person from the photo guide to a usable face crop on `/analyze`. The capability runs the photo check on the device, asks for a retake with the right tip, and offers a quiz-only path when photos keep failing. It uploads nothing until the quiz is finished.

## Public Interface

```typescript
// apps/web/src/app/(flow)/analyze/flow-state.ts — the step machine, pure
type Step =
  | { name: "guide" }
  | { name: "capture" }
  | { name: "checking"; id: number }
  | { name: "retake"; problem: RetakeReason; offerQuizOnly: boolean; previewUrl: string | null }
  | { name: "quiz"; question: number }
  | { name: "analyzing" }
  | { name: "reveal"; result: Result }
  | { name: "no-result"; reason: "no-answers" | "answers-cancel" }
  | { name: "error"; blocked?: true }; // blocked: the route answered 403
function initialState(): FlowState;
type FlowEvent = { type: "start-camera" } | { type: "open-camera" } | /* … */; // start-camera: guide → capture in place, only on the opening guide
const CAMERA_START: Step; // the capture step start-camera puts in place, one object
function reduce(s: FlowState, e: FlowEvent): FlowState; // push = new history entry, replace = same entry, back = pop
function stepProgress(step: Step): number | null; // Photo 0, Quiz 1, Result 2; none on the reveal
function toFormData(r: AnalysisRequest): FormData; // answers always; traits + crop only with a photo; mask (mask.png) only when the photo has one

// apps/web/src/lib/capture/ (browser only)
function checkImage(source: Blob | ImageBitmap): Promise<CheckedPhoto>; // decode, ≤ 1280 px, landmarks, hair mask, checkPhoto, crop, outline
interface CheckedPhoto {
  /* … */ crop: Blob | null;
  mask: Blob | null;
  outline?: OutlineOutcome; // a pass only
  outlineMs?: number; // on `made` only, whole ms from the start of the outline
} // mask: the crop's PNG outline, null without a pass or a segmenter
type OutlineOutcome = "made" | "late" | "failed" | "mismatch" | "missed";
function pickFace(
  faces: readonly Landmarks[],
  width: number,
  height: number,
): { severalFaces: boolean; landmarks: Landmarks | null };
function cropBox(
  face: Box,
  width: number,
  height: number,
): Box & { outWidth: number; outHeight: number };
function loadVision(): Promise<{ landmarker: FaceLandmarker; segmenter: ImageSegmenter }>; // once per visit, CPU delegate; then starts loadPerson
function loadPerson(): Promise<ImageSegmenter>; // the selfie segmenter (PERSON_MODEL), confidence mask, cached on its own
export { track } from "@/lib/analytics"; // re-exported; owned by analytics, no-op without PostHog
function photoCheckedProps(o: {
  problem;
  faceCount;
  measures;
  attempt;
  source;
  outline?;
  outlineMs?;
}): Record<string, unknown>; // outline and outline_ms only when given, never null
```

## Behavior

- `Flow` (`flow.tsx`) is the only client component with state. It maps the reducer's trail onto browser history: one `pushState({ depth })` per trail entry, numbered from the entry it mounted on. A popstate below the shown depth dispatches `back` once per level; Forward is undone with `history.go`; an entry below the mount's base belongs to an earlier visit, so Back onto it leaves the flow. With no page before that entry the browser stays, and the flow re-bases on the guide.
- The check and the analysis replace their spinner with the outcome, so Back never lands on a spinner. Each check carries an id; a result whose id is not the shown `checking` step is dropped and not reported.
- The camera frame is taken before `checking` unmounts the camera. The photo is checked at ≤ 1280 px on its longer side; the crop is the face box plus 30 % per side, ≤ 512 px, JPEG 0.85.
- MediaPipe's wasm comes from jsDelivr at the exact installed `@mediapipe/tasks-vision` version, the models from Google's versioned paths; both start loading on the guide. The person segmenter (0.25 MB) starts once the other two have loaded, since MediaPipe's loaders share one global.
- After a pass, `checkImage` waits at most 3 s for the person segmenter and runs it on the crop canvas. The outline is black with alpha `round(confidence × 255)`, the crop's size, encoded `toBlob("image/png")`. It is dropped (`mask: null`) when the segmenter is late (`late`) or fails (`failed`), when the mask is missing or of another size (`mismatch`), or when the mean confidence over the crop's middle third is below 0.5 (`missed`), so it never empties the oval; `photo_checked` carries the outcome, and on `made` the time. The 3 s wait stays fixed until those outcomes show how often it is late (BL-104). Measured 2026-10-15 on a real selfie: 13.6 KB.
- A check that throws (an undecodable file, models that failed to load) shows the no-face retake and goes to Sentry.
- Each new step scrolls to the top and focuses its `main h1`; when `matchMedia("(hover: hover) and (pointer: fine)")` matches, a `main [data-autofocus]` element takes it instead (only the email step's field has one). The effect skips while the step is the one it last handled, which is the opening guide on mount and on StrictMode's second run, so `/analyze` opens without moving focus; Back to the guide still moves it. A camera start skips `CAMERA_START` once through a one-shot `opening` ref, so Back onto the capture step later still moves focus. `globals.css` draws no outline on `h1[tabindex="-1"]:focus`.
- `?start=camera` is read in a mount-only `useLayoutEffect`, before the first paint of the landing's soft navigation. It dispatches `start-camera` (a replace, not a push, so the capture step owns the entry the flow mounted on and Back leaves the flow) and calls `history.replaceState(history.state, "", "/analyze")`. The state keeps Next's `__NA` key: on a fresh load this runs before Next patches history, and entries without it reload the page on Back. Next's router therefore keeps `?start=camera` as its own URL (BL-95). StrictMode's second run finds no `start`.
- The retake screen takes the second-failure layout when `offerQuizOnly` is set: the photo as a 96 px thumbnail beside an `h1` styled `h2`, then the notes, then "Retake photo", "Continue with the quiz only" (secondary) and "Upload a different photo".
- `UploadNotice`, the lock-icon paragraph, is shared by the guide and the capture step, so both say the same thing about the crop.
- The guide shows one `PhotoTipCard` with the good reference and three bad examples; its actions stack `lg:flex-col-reverse` with `.sn-btn--lg-swap`, so upload is on top and primary from 1024 px while the DOM keeps "Take a selfie" first.

## Edge Cases

- Eyes closed, no face, or a face narrower than the core's minimum: the core decides; the flow only shows the tip.
- A blurred person behind, narrower than the core's minimum face width, is ignored rather than `several-faces`.
- A camera already blocked for the site still shows "Take a selfie" on the guide; the capture step then offers upload with the blocked caption.
- A reload starts again at the guide; answers and photo are not kept across visits.
- A hard load of `/analyze?start=camera` (a pasted link, a new tab, a tap before the landing hydrates) shows the server-rendered guide until the flow hydrates, then the camera; the guide's actions are disabled until then.
- Forward onto the camera's entry after Back to the landing opens the guide: the entry no longer carries `start`.
- iOS 16 lacks `AbortSignal.any`, so Back and the 45 s timeout share one controller.

## Requirements

### Requirement: The flow stays on one URL and Back returns to the previous step

Every step of the analysis flow SHALL render at `/analyze` without changing the URL. Each step change SHALL add a browser history entry, so the browser's Back shows the previous step instead of leaving the page. Moving from the analyzing step to its outcome (reveal, retake, no-result or error) SHALL replace the analyzing entry, so Back from the outcome returns to the step before analyzing. A reload SHALL start the flow again at the photo guide.

#### Scenario: Back inside the quiz

- **WHEN** a person on question 2 presses the browser's Back
- **THEN** question 1 is shown and the URL is still `/analyze`

#### Scenario: Back from the reveal

- **WHEN** a person on the reveal presses the browser's Back
- **THEN** the last quiz question is shown, not the analyzing screen

#### Scenario: Reload

- **WHEN** a person on question 3 reloads the page
- **THEN** the photo guide is shown

### Requirement: The photo guide and capture follow the canvas

Unless the address asks for the camera, the flow SHALL open on the photo guide of canvas artboard 02: the heading "Three things before your selfie", one card with the three tips and two actions, "Take a selfie" and "Upload a photo". The card SHALL show one good reference photo and three bad examples, one per tip: under a ceiling lamp, foundation and bronzer, and a beauty filter. Each SHALL be a photo with alt text, never a labeled placeholder. On a 375 × 812 screen, both actions SHALL be visible without scrolling. Below 1024 px wide, "Take a selfie" SHALL be the primary action. From 1024 px, "Upload a photo" SHALL be the primary action and "Take a selfie" the secondary.

Under the two actions, the guide SHALL show the upload notice in the canvas's words. The notice SHALL say:

- only a crop of the face is sent, and only once the quiz is finished;
- an AI model from Google, reached through Vercel, reads its colors and does not train on it;
- Seasonly deletes its copy of the crop within 24 hours, and Google may keep one up to 90 days for abuse checks.

It SHALL link to `/privacy`.

The capture step of canvas artboard 03 SHALL show the front camera's live view in the camera frame, with the caption "Face a window, no makeup or filter. Fit your face in the oval and hold still." It SHALL offer "Take photo" and "Upload a photo instead". When the camera cannot be opened, the capture step SHALL keep the upload action and show "Camera blocked or not working? Upload a selfie you took in daylight." Below its actions, the capture step SHALL show the same upload notice as the guide, with its link to `/privacy`, however the person reached it.

**Unenforced:** the live camera needs a camera device, which CI's browser lacks. A manual check on a phone covers it; the upload path is covered by E2E.

#### Scenario: The guide

- **WHEN** `/analyze` opens
- **THEN** the heading "Three things before your selfie" and the buttons "Take a selfie" and "Upload a photo" are shown

#### Scenario: The guide's example photos

- **WHEN** `/analyze` opens
- **THEN** the guide shows one image marked "Good" and three marked "Avoid", each with non-empty alt text, and no placeholder label

#### Scenario: The guide fits one phone screen

- **WHEN** `/analyze` opens in a 375 × 812 window
- **THEN** "Take a selfie" and "Upload a photo" are both inside the window without scrolling

#### Scenario: The guide names who reads the crop

- **WHEN** the photo guide is shown
- **THEN** below the two actions it says only a face crop is sent, once the quiz is finished. It also says an AI model from Google, through Vercel, reads it and does not train on it, that Seasonly deletes its copy within 24 hours, and that Google may keep one up to 90 days for abuse checks. It links to `/privacy`.

#### Scenario: The capture step names who reads the crop

- **WHEN** the capture step is shown, whether reached from the guide or from `/analyze?start=camera`
- **THEN** below its actions it shows the guide's upload notice with its link to `/privacy`, and the caption "Face a window, no makeup or filter. Fit your face in the oval and hold still."

#### Scenario: A desktop window

- **WHEN** `/analyze` opens 1280 px wide
- **THEN** "Upload a photo" is the primary action and "Take a selfie" the secondary one

#### Scenario: No camera

- **WHEN** the camera cannot be opened
- **THEN** the capture step still offers "Upload a photo instead" and shows the camera-blocked caption

### Requirement: Every photo is checked on the device before anything is uploaded

A taken or uploaded photo SHALL be checked in the browser: face landmarks, the face count, and the core photo check. Exactly one outcome SHALL follow:

- **Fails:** a retake screen with the heading "Let’s retake this one", the photo as taken, the problem's title and message as a danger note, its retake tip as a note with the tip's icon, and two actions: "Retake photo" and "Upload a different photo".
- **Passes:** the quiz's first question. If every question was already answered in this visit, the analysis starts instead. No step asks the person to agree before the quiz.

A checked photo's type SHALL carry its traits and its face crop exactly when it passes, so a pass can never reach the flow without the photo it uploads.

#### Scenario: A photo with no face

- **WHEN** a photo with no face is uploaded
- **THEN** the retake screen shows "No face found" and the no-face retake tip, and no request leaves the browser

#### Scenario: A good photo

- **WHEN** a well-lit single-face photo is uploaded
- **THEN** the quiz's first question is shown, and no request has gone to the analyze route

#### Scenario: A good retake after the quiz

- **WHEN** a person who has answered every question takes a new photo that passes
- **THEN** the analysis starts with that photo's crop, without showing the quiz again

#### Scenario: The type refuses a pass without its photo

- **WHEN** a checked photo, or the flow's checked event, is written with no problem and no traits or crop, or with a problem and a photo
- **THEN** it does not typecheck

### Requirement: Two measurable faces ask for a retake

When the photo holds two faces that are each at least the core's minimum face width, the check SHALL report `several-faces` and show its retake tip. When the second face is narrower, the photo SHALL be checked as the larger face alone. At most two faces SHALL be looked for.

The threshold is measured on the labeled eval set (`analysis-eval`, 2026-10-09): 1 of 72 usable photos is rejected as `several-faces`, and 10 of 16 photos with a second face of about the subject's size get `several-faces` (1 passes; the rest get another problem first). A narrower width would only reject more, so it stays.

#### Scenario: Two people

- **WHEN** a photo holds two faces, each 200 px wide
- **THEN** the retake screen shows the several-faces tip

#### Scenario: A small face in the background

- **WHEN** a photo holds a 400 px face and a 60 px face
- **THEN** only the 400 px face is checked

### Requirement: Only a face crop is uploaded

The upload SHALL hold only a crop of the face, never the whole photo. The crop SHALL be the face landmarks' bounding box widened by a margin on every side and clamped to the image. It SHALL be scaled down to at most 512 px on its longer side and encoded as JPEG. The traits SHALL be measured from the full photo the check passed, before cropping.

With the crop, the upload SHALL carry the crop's outline when the device can make one. The outline is a PNG with exactly the crop's width and height. Its alpha is the person segmenter's confidence that each pixel shows the person, so the background is transparent. The outline SHALL be made on the device from the crop alone. It SHALL change neither the crop nor the traits. When the person segmenter fails to load or to run, the photo SHALL still pass, and the upload SHALL carry the crop and the traits without an outline.

#### Scenario: A large photo

- **WHEN** a 3000 × 4000 photo with a face 1200 px wide passes
- **THEN** the uploaded crop is a JPEG no larger than 512 px on its longer side and contains the whole face box

#### Scenario: The crop's outline

- **WHEN** a photo passes and the person segmenter runs on its crop
- **THEN** the upload carries a PNG outline with the crop's width and height, opaque on the person and transparent on the background

#### Scenario: No person segmenter

- **WHEN** a photo passes but the person segmenter failed to load
- **THEN** the photo is not asked to be retaken, and the upload carries the crop and the traits without an outline

### Requirement: Repeated failures offer a quiz-only result

After the second failed check in a row, the retake screen SHALL say that this is the second try and offer to continue without a photo, as on canvas artboard 04f:

- the heading "Let’s try once more", with the line "That’s two tries. Try once more, or go on with the quiz alone.";
- the photo as taken at thumbnail size beside the heading, then the problem's danger note and its retake tip;
- the actions "Retake photo" (primary), "Continue with the quiz only" (secondary) and "Upload a different photo", in that order. On a 375 × 812 screen, "Continue with the quiz only" SHALL be visible without scrolling.

That path SHALL send no crop and no traits, and SHALL go to the quiz. Its result SHALL come from the quiz alone. A photo that passes SHALL reset the count.

#### Scenario: First failure

- **WHEN** the first photo fails the check
- **THEN** the retake screen reads "Let’s retake this one" and offers only "Retake photo" and "Upload a different photo"

#### Scenario: Second failure in a row

- **WHEN** the second photo in a row fails the check
- **THEN** the retake screen reads "Let’s try once more" and "That’s two tries.", and offers "Continue with the quiz only" as a secondary action right after "Retake photo"

#### Scenario: The way out is in view

- **WHEN** the second photo in a row fails the check in a 375 × 812 window
- **THEN** "Continue with the quiz only" is inside the window without scrolling

#### Scenario: Continuing without a photo

- **WHEN** the person chooses to continue with the quiz only and answers the quiz
- **THEN** the analyze request carries the answers only, with no crop and no traits

### Requirement: Each photo check is reported without photo data

Each check that completes and whose outcome is shown SHALL send one `photo_checked` event. A check overtaken by a newer photo, or by a second tap while checking, is not shown and SHALL NOT be reported; a check that crashes is reported to Sentry instead. The event SHALL carry:

- the problem, or none;
- the number of faces found;
- the face width;
- the eye-white and skin colors in Lab;
- the attempt number;
- whether the photo came from the camera or an upload.

It SHALL NOT carry pixels, the image, the landmarks or the crop. With PostHog off, no event SHALL be sent and the flow SHALL work the same.

#### Scenario: A dark photo

- **WHEN** a dark photo is checked on the first attempt
- **THEN** one `photo_checked` event is sent with problem `dark`, the face width and the eye-white color, and no image data

### Requirement: Nothing leaves the device before the quiz is finished

The photo, its face crop, the crop's outline and its traits SHALL NOT be sent anywhere before the person answers the quiz's last question. They SHALL be sent only with the analyze request. A person who leaves the flow before that sends nothing, whether by Back, by closing the page or by reloading it. The full photo SHALL never be sent.

#### Scenario: Leaving during the quiz

- **WHEN** a person whose photo passed answers two questions and then goes Back to the photo guide
- **THEN** no request has gone to the analyze route

#### Scenario: The quiz is finished

- **WHEN** the person answers the last question
- **THEN** one analyze request carries the answers, the traits and the face crop

#### Scenario: The quiz is finished with an outline

- **WHEN** the person whose photo passed with an outline answers the last question
- **THEN** that one analyze request also carries the outline, and no other request carries it

### Requirement: A new step moves focus to its heading, the first screen does not

When the flow moves to a new step, focus SHALL move to that step's main heading, so a screen reader announces the new screen. One step is the exception: on a device whose primary pointer is fine and can hover (a mouse or trackpad), the email step SHALL move focus to its email field instead, so the address can be typed at once. On every other device the email step SHALL focus its heading like the rest. The screen the flow opens on, the guide or the capture step from `/analyze?start=camera`, SHALL NOT take focus, so the page opens like any other. A heading that takes focus SHALL draw no focus outline, because it is not a control.

#### Scenario: Opening the flow

- **WHEN** `/analyze` opens
- **THEN** no element inside the page has focus, and no outline is drawn around the heading

#### Scenario: Opening the flow on the camera

- **WHEN** `/analyze?start=camera` opens
- **THEN** no element inside the page has focus

#### Scenario: A new step

- **WHEN** the person moves from the guide to the capture step
- **THEN** focus is on the capture step's heading, and the heading draws no outline

#### Scenario: The email step with a mouse

- **WHEN** a person on a device with a fine, hovering pointer chooses "Get my full report"
- **THEN** focus is on the email field

#### Scenario: The email step on a phone

- **WHEN** a person on a touch device chooses "Get my full report"
- **THEN** focus is on the email step's heading, not on the email field

### Requirement: The landing's camera link opens the flow on the camera

`/analyze?start=camera` SHALL open the flow on the capture step instead of the photo guide. The capture step SHALL then be the flow's first entry, so the browser's Back from it leaves the flow for the page before it. Once the flow has opened, the address SHALL read `/analyze` without the parameter, so a reload starts at the photo guide as on any other visit. Any other value of `start`, or none, SHALL open the photo guide. This opening is the one step change that adds no history entry, and removing `start` the one change to the address inside the flow; both exceptions hold over "The flow stays on one URL" here and over site-structure's "without changing the URL".

#### Scenario: Opening on the camera

- **WHEN** `/analyze?start=camera` opens
- **THEN** the capture step is shown, the photo guide is not, and the address reads `/analyze`

#### Scenario: Back from the camera

- **WHEN** a person taps "Take a selfie" on the landing and then presses the browser's Back on the capture step
- **THEN** the landing is shown

#### Scenario: Reload after opening on the camera

- **WHEN** a person who opened `/analyze?start=camera` reloads the page
- **THEN** the photo guide is shown

#### Scenario: An unknown start

- **WHEN** `/analyze?start=quiz` opens
- **THEN** the photo guide is shown
