## MODIFIED Requirements

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
