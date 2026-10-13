## MODIFIED Requirements

### Requirement: The photo guide and capture follow the canvas

The flow SHALL open on the photo guide of canvas artboard 02: the heading "Three things before your selfie", one card with the three tips and two actions, "Take a selfie" and "Upload a photo". The card SHALL show one good reference photo and three bad examples, one per tip: under a ceiling lamp, foundation and bronzer, and a beauty filter. Each SHALL be a photo with alt text, never a labeled placeholder. On a 375 × 812 screen, both actions SHALL be visible without scrolling. Below 1024 px wide, "Take a selfie" SHALL be the primary action. From 1024 px, "Upload a photo" SHALL be the primary action and "Take a selfie" the secondary.

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

#### Scenario: A desktop window

- **WHEN** `/analyze` opens 1280 px wide
- **THEN** "Upload a photo" is the primary action and "Take a selfie" the secondary one

#### Scenario: No camera

- **WHEN** the camera cannot be opened
- **THEN** the capture step still offers "Upload a photo instead" and shows the camera-blocked caption

### Requirement: Every photo is checked on the device before anything is uploaded

A taken or uploaded photo SHALL be checked in the browser: face landmarks, the face count, and the core photo check. Exactly one outcome SHALL follow:

- **Fails:** a retake screen with the heading "Let’s retake this one", the photo as taken, the problem's title and message as a danger note, its retake tip as a note with the tip's icon, and two actions: "Retake photo" and "Upload a different photo".
- **Passes:** the consent step.

#### Scenario: A photo with no face

- **WHEN** a photo with no face is uploaded
- **THEN** the retake screen shows "No face found" and the no-face retake tip, and no request leaves the browser

#### Scenario: A good photo

- **WHEN** a well-lit single-face photo is uploaded
- **THEN** the consent step is shown with the photo's face crop

### Requirement: Repeated failures offer a quiz-only result

After the second failed check in a row, the retake screen SHALL say that this is the second try and offer to continue without a photo, as on canvas artboard 04f:

- the heading "Let’s try once more", with the line "That’s two tries. Try once more, or go on with the quiz alone.";
- the photo as taken at thumbnail size beside the heading, then the problem's danger note and its retake tip;
- the actions "Retake photo" (primary), "Continue with the quiz only" (secondary) and "Upload a different photo", in that order. On a 375 × 812 screen, "Continue with the quiz only" SHALL be visible without scrolling.

That path SHALL skip consent and the upload and go to the quiz. Its result SHALL come from the quiz alone. A photo that passes SHALL reset the count.

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

## ADDED Requirements

### Requirement: A new step moves focus to its heading, the first screen does not

When the flow moves to a new step, focus SHALL move to that step's main heading, so a screen reader announces the new screen. The guide, shown when `/analyze` opens, SHALL NOT take focus, so the page opens like any other. A heading that takes focus SHALL draw no focus outline, because it is not a control.

#### Scenario: Opening the flow

- **WHEN** `/analyze` opens
- **THEN** no element inside the page has focus, and no outline is drawn around the heading

#### Scenario: A new step

- **WHEN** the person moves from the guide to the capture step
- **THEN** focus is on the capture step's heading, and the heading draws no outline
