## MODIFIED Requirements

### Requirement: The photo guide and capture follow the canvas

The flow SHALL open on the photo guide of canvas artboard 02: the heading "Three things before your selfie", one card with the three tips and two actions, "Take a selfie" and "Upload a photo". The card SHALL show one good reference photo and three bad examples, one per tip: under a ceiling lamp, foundation and bronzer, and a beauty filter. Each SHALL be a photo with alt text, never a labeled placeholder. On a 375 × 812 screen, both actions SHALL be visible without scrolling. Below 1024 px wide, "Take a selfie" SHALL be the primary action. From 1024 px, "Upload a photo" SHALL be the primary action and "Take a selfie" the secondary.

Under the two actions, the guide SHALL show the upload notice in the canvas's words. The notice SHALL say:

- only a crop of the face is sent, and only once the quiz is finished;
- an AI model from Google, reached through Vercel, reads its colors and does not train on it;
- Seasonly deletes its copy of the crop within 24 hours, and Google may keep one up to 90 days for abuse checks.

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
- **THEN** below the two actions it says only a face crop is sent, once the quiz is finished. It also says an AI model from Google, through Vercel, reads it and does not train on it, that Seasonly deletes its copy within 24 hours, and that Google may keep one up to 90 days for abuse checks. It links to `/privacy`.

#### Scenario: A desktop window

- **WHEN** `/analyze` opens 1280 px wide
- **THEN** "Upload a photo" is the primary action and "Take a selfie" the secondary one

#### Scenario: No camera

- **WHEN** the camera cannot be opened
- **THEN** the capture step still offers "Upload a photo instead" and shows the camera-blocked caption
