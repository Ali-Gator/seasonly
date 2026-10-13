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
function reduce(s: FlowState, e: FlowEvent): FlowState; // push = new history entry, replace = same entry, back = pop
function stepProgress(step: Step): number | null; // Photo 0, Quiz 1, Result 2; none on the reveal
function toFormData(r: AnalysisRequest): FormData; // answers always; traits + crop only with a photo

// apps/web/src/lib/capture/ (browser only)
function checkImage(source: Blob | ImageBitmap): Promise<CheckedPhoto>; // decode, ≤ 1280 px, landmarks, hair mask, checkPhoto, crop
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
function loadVision(): Promise<{ landmarker: FaceLandmarker; segmenter: ImageSegmenter }>; // once per visit, CPU delegate
export { track } from "@/lib/analytics"; // re-exported; owned by analytics, no-op without PostHog
function photoCheckedProps(o: {
  problem;
  faceCount;
  measures;
  attempt;
  source;
}): Record<string, unknown>;
```

## Behavior

- `Flow` (`flow.tsx`) is the only client component with state. It maps the reducer's trail onto browser history: one `pushState({ depth })` per trail entry, numbered from the entry it mounted on. A popstate below the shown depth dispatches `back` once per level; Forward is undone with `history.go`; an entry below the mount's base belongs to an earlier visit, so Back onto it leaves the flow. With no page before that entry the browser stays, and the flow re-bases on the guide.
- The check and the analysis replace their spinner with the outcome, so Back never lands on a spinner. Each check carries an id; a result whose id is not the shown `checking` step is dropped and not reported.
- The camera frame is taken before `checking` unmounts the camera. The photo is checked at ≤ 1280 px on its longer side; the crop is the face box plus 30 % per side, ≤ 512 px, JPEG 0.85.
- MediaPipe's wasm comes from jsDelivr at the exact installed `@mediapipe/tasks-vision` version, the models from Google's versioned paths; both start loading on the guide.
- A check that throws (an undecodable file, models that failed to load) shows the no-face retake and goes to Sentry.
- Each new step scrolls to the top and focuses its `main h1`. The effect skips while the step is the one it last handled, which is the opening guide on mount and on StrictMode's second run, so `/analyze` opens without moving focus; Back to the guide still moves it. `globals.css` draws no outline on `h1[tabindex="-1"]:focus`.
- The retake screen takes the second-failure layout when `offerQuizOnly` is set: the photo as a 96 px thumbnail beside an `h1` styled `h2`, then the notes, then "Retake photo", "Continue with the quiz only" (secondary) and "Upload a different photo".
- The guide shows one `PhotoTipCard` with the good reference and three bad examples; its actions stack `lg:flex-col-reverse` with `.sn-btn--lg-swap`, so upload is on top and primary from 1024 px while the DOM keeps "Take a selfie" first.

## Edge Cases

- Eyes closed, no face, or a face narrower than the core's minimum: the core decides; the flow only shows the tip.
- A blurred person behind, narrower than the core's minimum face width, is ignored rather than `several-faces`.
- A camera already blocked for the site still shows "Take a selfie" on the guide; the capture step then offers upload with the blocked caption.
- A reload starts again at the guide; answers and photo are not kept across visits.
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

The flow SHALL open on the photo guide of canvas artboard 02: the heading "Three things before your selfie", one card with the three tips and two actions, "Take a selfie" and "Upload a photo". The card SHALL show one good reference photo and three bad examples, one per tip: under a ceiling lamp, foundation and bronzer, and a beauty filter. Each SHALL be a photo with alt text, never a labeled placeholder. On a 375 × 812 screen, both actions SHALL be visible without scrolling. Below 1024 px wide, "Take a selfie" SHALL be the primary action. From 1024 px, "Upload a photo" SHALL be the primary action and "Take a selfie" the secondary.

Under the two actions, the guide SHALL show the upload notice in the canvas's words. The notice SHALL say:

- only a crop of the face is sent, and only once the quiz is finished;
- an AI model from Google, reached through Vercel, reads its colors and does not train on it;
- the crop is deleted within 24 hours.

It SHALL link to `/privacy`.

The capture step SHALL show the front camera's live view in the camera frame, with the caption "Fit your face in the oval, at eye level. Hold still." It SHALL offer "Take photo" and "Upload a photo instead". When the camera cannot be opened, the capture step SHALL keep the upload action and show "Camera blocked or not working? Upload a selfie you took in daylight."

**Unenforced:** the live camera needs a camera device, which CI's browser lacks. Task 8.3's manual check on a phone covers it; the upload path is covered by E2E.

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
- **THEN** below the two actions it says only a face crop is sent, once the quiz is finished. It also says an AI model from Google, through Vercel, reads it and does not train on it, and that the crop is deleted within 24 hours. It links to `/privacy`.

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

#### Scenario: A photo with no face

- **WHEN** a photo with no face is uploaded
- **THEN** the retake screen shows "No face found" and the no-face retake tip, and no request leaves the browser

#### Scenario: A good photo

- **WHEN** a well-lit single-face photo is uploaded
- **THEN** the quiz's first question is shown, and no request has gone to the analyze route

#### Scenario: A good retake after the quiz

- **WHEN** a person who has answered every question takes a new photo that passes
- **THEN** the analysis starts with that photo's crop, without showing the quiz again

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

#### Scenario: A large photo

- **WHEN** a 3000 × 4000 photo with a face 1200 px wide passes
- **THEN** the uploaded crop is a JPEG no larger than 512 px on its longer side and contains the whole face box

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

The photo, its face crop and its traits SHALL NOT be sent anywhere before the person answers the quiz's last question. They SHALL be sent only with the analyze request. A person who leaves the flow before that sends nothing, whether by Back, by closing the page or by reloading it. The full photo SHALL never be sent.

#### Scenario: Leaving during the quiz

- **WHEN** a person whose photo passed answers two questions and then goes Back to the photo guide
- **THEN** no request has gone to the analyze route

#### Scenario: The quiz is finished

- **WHEN** the person answers the last question
- **THEN** one analyze request carries the answers, the traits and the face crop

### Requirement: A new step moves focus to its heading, the first screen does not

When the flow moves to a new step, focus SHALL move to that step's main heading, so a screen reader announces the new screen. The guide, shown when `/analyze` opens, SHALL NOT take focus, so the page opens like any other. A heading that takes focus SHALL draw no focus outline, because it is not a control.

#### Scenario: Opening the flow

- **WHEN** `/analyze` opens
- **THEN** no element inside the page has focus, and no outline is drawn around the heading

#### Scenario: A new step

- **WHEN** the person moves from the guide to the capture step
- **THEN** focus is on the capture step's heading, and the heading draws no outline
