## MODIFIED Requirements

### Requirement: The draping preview shows the stored face

A photo report's draping section SHALL show the season's best and worst draping colors on the face from `/api/face/<id>`, with the season's draping line as its intro. When the face cannot be loaded for any reason, the section SHALL show the two colors without a face and say "We couldn't load your photo, so this shows the two colors only." The reason may be a deleted crop or a failed request. The line SHALL NOT claim the photo was deleted, because inside the 24-hour window a failed request does not mean it was.

#### Scenario: A stored crop

- **WHEN** a photo report is opened and its crop is stored
- **THEN** both frames show the image from `/api/face/<id>`, best first

#### Scenario: The crop is gone

- **WHEN** `/api/face/<id>` answers 404 for a photo report
- **THEN** both frames show the face slot without an image, and the section says "We couldn't load your photo, so this shows the two colors only."

#### Scenario: The face request fails

- **WHEN** `/api/face/<id>` answers 500 for a photo report
- **THEN** the section shows the same two colors and the same line, and does not say the photo was deleted
