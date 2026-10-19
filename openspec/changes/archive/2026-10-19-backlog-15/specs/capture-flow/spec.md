## MODIFIED Requirements

### Requirement: Each photo check is reported without photo data

Each check that completes and whose outcome is shown SHALL send one `photo_checked` event. A check overtaken by a newer photo, or by a second tap while checking, is not shown and SHALL NOT be reported; a check that crashes is reported to Sentry instead. The event SHALL carry:

- the problem, or none;
- the number of faces found;
- the face width;
- the eye-white and skin colors in Lab;
- the attempt number;
- whether the photo came from the camera or an upload;
- for a photo that passes, how cutting out the face's outline ended — `made`, `late` (no answer within the wait), `failed` (the person segmenter did not load or threw), `mismatch` (no mask, or a mask of another size) or `missed` (too little of the middle read as a person) — and, when made, how long it took in whole milliseconds.

A rejected photo SHALL carry neither outline property.

It SHALL NOT carry pixels, the image, the landmarks or the crop. With PostHog off, no event SHALL be sent and the flow SHALL work the same.

#### Scenario: A dark photo

- **WHEN** a dark photo is checked on the first attempt
- **THEN** one `photo_checked` event is sent with problem `dark`, the face width and the eye-white color, and no image data

#### Scenario: A passing photo whose outline is late

- **WHEN** a photo passes the check and the person segmenter gives no mask within the wait
- **THEN** its `photo_checked` event carries the outline outcome `late` and no outline time

#### Scenario: A passing photo whose outline is made

- **WHEN** a photo passes the check and its outline is cut out
- **THEN** its `photo_checked` event carries the outline outcome `made` and the time it took in whole milliseconds
