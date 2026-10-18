## Why

A person who taps "Take a selfie" on the landing lands on the photo guide, which asks again: "Take a selfie" or "Upload a photo". That is one extra tap and a choice made twice, right at the top of the funnel. The guide adds nothing for this person: the landing already shows the same tip card, the same "Face a window, skip the makeup and the filter" line and the photo-handling block. The user raised it on 2026-10-17 and chose to go straight to the camera from the landing. In the same session they also asked about focusing the email field when its step opens; the chosen answer is to do it on desktop only.

## What Changes

- **The landing's "Take a selfie" opens the camera.** The hero's "Take a selfie" links to `/analyze?start=camera`. The flow opens on the capture step instead of the guide, and removes the parameter from the address. A reload therefore still starts at the guide, and browser Back from the camera returns to the landing.
- **Everything else still opens the guide.** The hero's "Upload a photo" stays on `/analyze`: a browser opens a file picker only from the tap itself, so skipping the guide for upload would need the file handed across pages. The header's "Find my colors", the landing's closing action, the season pages, the sample report, how-it-works, the GPT-alternative page and the chat plugin's link are unchanged.
- **The capture step carries what the guide said.** People who skip the guide never see its upload notice or its tips. So the capture step gains the guide's upload notice (crop only, after the quiz, Google through Vercel, 24 hours, 90 days, link to `/privacy`). Its caption names the light, makeup and filter tips. This holds on the capture step whichever way the person reached it.
- **The email field takes focus on desktop.** When the email step opens on a device with a mouse or trackpad (`(hover: hover) and (pointer: fine)`), focus goes to the email field instead of the heading. Phones and tablets keep focus on the heading. On a phone the keyboard would cover "What's inside", and iOS does not raise it from code anyway. Screen-reader users on touch keep hearing the heading.
- **The flow-start event covers the camera.** The funnel's "Flow start" is still the `/analyze` pageview. Its "fires when" now reads "the flow opens, on the guide or on the camera".
- **Canvas first.** Board 03 Capture gets the notice and the new caption. The landing boards' "Take a selfie" links to board 03 instead of 02. The user approves them before any UI code (CLAUDE.md).
- **Not in scope:**
  - Quiz auto-advance. It stays as it is (reviewed 2026-10-17).
  - A file picker on the landing for "Upload a photo".
  - The other entry points listed above.
  - Pre-filling the quiz from the plugin (BL-32). It may later reuse the `start` parameter's mount-time handling, but stays its own item.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `capture-flow`: the flow can open on the capture step from `?start=camera`, and then strips the parameter. The capture step shows the upload notice and the new caption. Focus moves to the email field instead of the heading on fine-pointer devices.
- `site-content`: the landing hero's "Take a selfie" links to `/analyze?start=camera`.
- `analytics`: "Flow start" fires when the flow opens, on the guide or on the camera.

## Impact

- `apps/web/src/app/(flow)/analyze/`:
  - `flow-state.ts`: a `start-camera` event that replaces the guide with the capture step without a history entry.
  - `flow.tsx`: mount-time read of `start`, `replaceState` to `/analyze`, and the focus target.
  - `_capture/steps.tsx`: an `UploadNotice` shared by Guide and Capture, and the new caption.
  - `_email/step.tsx`: marks the field as the step's focus target.
- `apps/web/src/app/(site)/page.tsx`: the hero's "Take a selfie" href.
- Design: the MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3), boards 03 Capture and 01 Landing (375, 1280). No design-system change.
- Tests:
  - No existing test needs an edit. The E2E paths start from "Find my colors" or `/analyze`, which still open the guide. jsdom has no fine pointer, so the DOM focus tests keep the heading.
  - New tests cover the reducer event, the landing link, the camera start, Back to the landing, the capture notice and the desktop focus.
- No new dependency, no migration, no paid run. The analysis is untouched, so the eval cannot move.
- Plan: a new Tracker row, T20 "Camera straight from the landing".
