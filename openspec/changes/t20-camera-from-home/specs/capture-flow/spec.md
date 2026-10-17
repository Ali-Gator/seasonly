## ADDED Requirements

### Requirement: The landing's camera link opens the flow on the camera

`/analyze?start=camera` SHALL open the flow on the capture step instead of the photo guide. The capture step SHALL then be the flow's first entry, so the browser's Back from it leaves the flow for the page before it. Once the flow has opened, the address SHALL read `/analyze` without the parameter, so a reload starts at the photo guide as on any other visit. Any other value of `start`, or none, SHALL open the photo guide.

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

## MODIFIED Requirements

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
