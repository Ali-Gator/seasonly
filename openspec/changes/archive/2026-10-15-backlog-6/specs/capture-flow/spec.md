## MODIFIED Requirements

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
