## ADDED Requirements

### Requirement: The draping preview cuts the stored face out of its background

A photo report's draping section SHALL request the face's outline from `/api/face/<id>/mask`. When the outline loads, both frames SHALL show the face masked by it, so the season's colors show where the photo's background was. When the outline cannot be loaded for any reason, the face SHALL show unmasked, as before this change. A missing outline SHALL NOT be reported as a missing face. Until the outline has loaded or failed, the face SHALL NOT be shown, so the background never flashes before the cut-out.

#### Scenario: A stored outline

- **WHEN** a photo report is opened and its crop and outline are stored
- **THEN** both frames show the image from `/api/face/<id>`, masked by `/api/face/<id>/mask`

#### Scenario: No outline

- **WHEN** `/api/face/<id>/mask` answers 404 for a photo report whose crop is stored
- **THEN** both frames show the face unmasked, and the section does not say the photo could not be loaded

#### Scenario: Neither is stored

- **WHEN** both `/api/face/<id>` and `/api/face/<id>/mask` answer 404
- **THEN** the section shows the two colors without a face and says "We couldn't load your photo, so this shows the two colors only."
