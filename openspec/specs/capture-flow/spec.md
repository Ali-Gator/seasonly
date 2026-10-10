# capture-flow Specification

## Purpose

Takes a person from the photo guide to a usable face crop on `/analyze`. The capability runs the photo check on the device, asks for a retake with the right tip, and offers a quiz-only path when photos keep failing. It uploads nothing until the person agrees on the consent step.

## Public Interface

```typescript
// apps/web/src/app/(flow)/analyze/flow-state.ts — the step machine, pure
type Step =
  | { name: "guide" }
  | { name: "capture" }
  | { name: "checking"; id: number }
  | { name: "retake"; problem: RetakeReason; offerQuizOnly: boolean; previewUrl: string | null }
  | { name: "consent" }
  | { name: "quiz"; question: number }
  | { name: "analyzing" }
  | { name: "reveal"; result: Result }
  | { name: "no-result"; reason: "no-answers" | "answers-cancel" }
  | { name: "error" };
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
- Leaving an unanswered consent by Back keeps no photo, as declining does; the request never carries a photo without consent.
- The camera frame is taken before `checking` unmounts the camera. The photo is checked at ≤ 1280 px on its longer side; the crop is the face box plus 30 % per side, ≤ 512 px, JPEG 0.85.
- MediaPipe's wasm comes from jsDelivr at the exact installed `@mediapipe/tasks-vision` version, the models from Google's versioned paths; both start loading on the guide.
- A check that throws (an undecodable file, models that failed to load) shows the no-face retake and goes to Sentry.

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

The flow SHALL open on the photo guide: the heading "Three things before your selfie", the three tip cards and two actions, "Take a selfie" and "Upload a photo". This is the copy of canvas artboard 02. Each tip card SHALL show its good and its bad example as a photo with alt text, never as a labeled placeholder. The capture step SHALL show the front camera's live view in the camera frame, with the caption "Fit your face in the oval, at eye level. Hold still." It SHALL offer "Take photo" and "Upload a photo instead". When the camera cannot be opened, the capture step SHALL keep the upload action and show "Camera blocked or not working? Upload a selfie you took in daylight."

**Unenforced:** the live camera needs a camera device, which CI's browser lacks. Task 8.3's manual check on a phone covers it; the upload path is covered by E2E.

#### Scenario: The guide

- **WHEN** `/analyze` opens
- **THEN** the heading "Three things before your selfie" and the buttons "Take a selfie" and "Upload a photo" are shown

#### Scenario: The guide's example photos

- **WHEN** `/analyze` opens
- **THEN** each of the three tip cards shows two images, each with non-empty alt text, and no placeholder label

#### Scenario: No camera

- **WHEN** the camera cannot be opened
- **THEN** the capture step still offers "Upload a photo instead" and shows the camera-blocked caption

### Requirement: Every photo is checked on the device before anything is uploaded

A taken or uploaded photo SHALL be checked in the browser: face landmarks, the face count, and the core photo check. Exactly one outcome SHALL follow:

- **Fails:** a retake screen with the heading "Let's retake this one", the photo as taken, the problem's title and message as a danger note, its retake tip as a note with the tip's icon, and two actions: "Retake photo" and "Upload a different photo".
- **Passes:** the consent step.

#### Scenario: A photo with no face

- **WHEN** a photo with no face is uploaded
- **THEN** the retake screen shows "No face found" and the no-face retake tip, and no request leaves the browser

#### Scenario: A good photo

- **WHEN** a well-lit single-face photo is uploaded
- **THEN** the consent step is shown with the photo's face crop

### Requirement: Two measurable faces ask for a retake

When the photo holds two faces that are each at least the core's minimum face width, the check SHALL report `several-faces` and show its retake tip. When the second face is narrower, the photo SHALL be checked as the larger face alone. At most two faces SHALL be looked for.

The threshold is measured on the labeled eval set (`analysis-eval`, 2026-10-09): 1 of 72 usable photos is rejected as `several-faces`, and 10 of 16 photos with a second face of about the subject's size get `several-faces` (1 passes; the rest get another problem first). A narrower width would only reject more, so it stays.

#### Scenario: Two people

- **WHEN** a photo holds two faces, each 200 px wide
- **THEN** the retake screen shows the several-faces tip

#### Scenario: A small face in the background

- **WHEN** a photo holds a 400 px face and a 60 px face
- **THEN** only the 400 px face is checked

### Requirement: Nothing leaves the device before consent

The photo, its face crop and its traits SHALL NOT be sent anywhere before the person chooses "Agree and upload" on the consent step. The consent step SHALL show the face crop that will be sent and the canvas copy of artboard 05: what is uploaded and why, who reads it, and that it is deleted within 24 hours. "Who reads it" means an AI model from Google, reached through Vercel, that does not train on the crop. "Not now, go back" SHALL return to capture and send nothing. Consent SHALL be asked once per visit: a later photo that passes in the same visit goes on without asking again.

#### Scenario: Consent declined

- **WHEN** a person whose photo passed chooses "Not now, go back"
- **THEN** the capture step is shown and no request was made to the analyze route

#### Scenario: Consent given

- **WHEN** the person chooses "Agree and upload"
- **THEN** the quiz starts, and the face crop is first sent only when the quiz is finished

#### Scenario: The consent step names who reads the crop

- **WHEN** the consent step is shown
- **THEN** it says an AI model from Google, through Vercel, reads the crop and does not train on it, and it links to `/privacy`

### Requirement: Only a face crop is uploaded

The upload SHALL hold only a crop of the face, never the whole photo. The crop SHALL be the face landmarks' bounding box widened by a margin on every side and clamped to the image. It SHALL be scaled down to at most 512 px on its longer side and encoded as JPEG. The traits SHALL be measured from the full photo the check passed, before cropping.

#### Scenario: A large photo

- **WHEN** a 3000 × 4000 photo with a face 1200 px wide passes
- **THEN** the uploaded crop is a JPEG no larger than 512 px on its longer side and contains the whole face box

### Requirement: Repeated failures offer a quiz-only result

After the second failed check in a row, the retake screen SHALL also offer to continue without a photo. That path SHALL skip consent and the upload and go to the quiz. Its result SHALL come from the quiz alone. A photo that passes SHALL reset the count.

#### Scenario: First failure

- **WHEN** the first photo fails the check
- **THEN** the retake screen offers only "Retake photo" and "Upload a different photo"

#### Scenario: Second failure in a row

- **WHEN** the second photo in a row fails the check
- **THEN** the retake screen also offers to continue without a photo

#### Scenario: Continuing without a photo

- **WHEN** the person chooses to continue without a photo and answers the quiz
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
