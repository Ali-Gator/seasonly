## MODIFIED Requirements

### Requirement: The photo guide and capture follow the canvas

The flow SHALL open on the photo guide: the heading "Three things before your selfie", the three tip cards and two actions, "Take a selfie" and "Upload a photo". This is the copy of canvas artboard 02. Each tip card SHALL show its good and its bad example as a photo with alt text, never as a labeled placeholder.

Under the two actions, the guide SHALL show the upload notice in the canvas's words. The notice SHALL say:

- only a crop of the face is sent, and only once the quiz is finished;
- an AI model from Google, reached through Vercel, reads its colors and does not train on it;
- the crop is deleted within 24 hours.

It SHALL link to `/privacy`.

The capture step SHALL show the front camera's live view in the camera frame, with the caption "Fit your face in the oval, at eye level. Hold still." It SHALL offer "Take photo" and "Upload a photo instead". When the camera cannot be opened, the capture step SHALL keep the upload action and show "Camera blocked or not working? Upload a selfie you took in daylight."

**Unenforced:** the live camera needs a camera device, which CI's browser lacks. The upload path is covered by E2E.

#### Scenario: The guide

- **WHEN** `/analyze` opens
- **THEN** the heading "Three things before your selfie" and the buttons "Take a selfie" and "Upload a photo" are shown

#### Scenario: The guide's example photos

- **WHEN** `/analyze` opens
- **THEN** each of the three tip cards shows two images, each with non-empty alt text, and no placeholder label

#### Scenario: The guide names who reads the crop

- **WHEN** the photo guide is shown
- **THEN** below the two actions it says only a face crop is sent, once the quiz is finished. It also says an AI model from Google, through Vercel, reads it and does not train on it, and that the crop is deleted within 24 hours. It links to `/privacy`.

#### Scenario: No camera

- **WHEN** the camera cannot be opened
- **THEN** the capture step still offers "Upload a photo instead" and shows the camera-blocked caption

### Requirement: Every photo is checked on the device before anything is uploaded

A taken or uploaded photo SHALL be checked in the browser: face landmarks, the face count, and the core photo check. Exactly one outcome SHALL follow:

- **Fails:** a retake screen with the heading "Let's retake this one", the photo as taken, the problem's title and message as a danger note, its retake tip as a note with the tip's icon, and two actions: "Retake photo" and "Upload a different photo".
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

### Requirement: Repeated failures offer a quiz-only result

After the second failed check in a row, the retake screen SHALL also offer to continue without a photo. That path SHALL send no crop and no traits, and SHALL go to the quiz. Its result SHALL come from the quiz alone. A photo that passes SHALL reset the count.

#### Scenario: First failure

- **WHEN** the first photo fails the check
- **THEN** the retake screen offers only "Retake photo" and "Upload a different photo"

#### Scenario: Second failure in a row

- **WHEN** the second photo in a row fails the check
- **THEN** the retake screen also offers to continue without a photo

#### Scenario: Continuing without a photo

- **WHEN** the person chooses to continue without a photo and answers the quiz
- **THEN** the analyze request carries the answers only, with no crop and no traits

## REMOVED Requirements

### Requirement: Nothing leaves the device before consent

**Reason**: The consent step is removed to cut a full screen from the flow before the quiz. The disclosure it carried moves to the photo guide, before the person chooses a photo. The legal basis for using the crop moves from consent to the analysis the person asked for (`legal-pages`).

**Migration**: The promise is now "Nothing leaves the device before the quiz is finished", below. The scenario "The consent step names who reads the crop" becomes "The guide names who reads the crop" under "The photo guide and capture follow the canvas". Citations of `#requirement-nothing-leaves-the-device-before-consent`, `#scenario-consent-declined`, `#scenario-consent-given` and `#scenario-the-consent-step-names-who-reads-the-crop` move to the new anchors.

## ADDED Requirements

### Requirement: Nothing leaves the device before the quiz is finished

The photo, its face crop and its traits SHALL NOT be sent anywhere before the person answers the quiz's last question. They SHALL be sent only with the analyze request. A person who leaves the flow before that sends nothing, whether by Back, by closing the page or by reloading it. The full photo SHALL never be sent.

#### Scenario: Leaving during the quiz

- **WHEN** a person whose photo passed answers two questions and then goes Back to the photo guide
- **THEN** no request has gone to the analyze route

#### Scenario: The quiz is finished

- **WHEN** the person answers the last question
- **THEN** one analyze request carries the answers, the traits and the face crop
