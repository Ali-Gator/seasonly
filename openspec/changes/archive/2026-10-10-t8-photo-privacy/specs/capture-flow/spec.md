## MODIFIED Requirements

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
