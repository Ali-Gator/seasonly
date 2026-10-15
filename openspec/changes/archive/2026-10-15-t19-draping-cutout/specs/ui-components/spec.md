## ADDED Requirements

### Requirement: A draping pair can cut the face out with its outline

DrapingPair SHALL take an optional outline source next to its face source. With both, each frame's face image SHALL be masked by the outline, aligned with the image as it is cropped, positioned and zoomed in its oval. The oval SHALL have no fill of its own behind the image, so the frame's color shows wherever the outline is transparent. Without an outline source, the face SHALL fill its oval as it does today. An outline source without a face source SHALL be ignored.

#### Scenario: A pair with an outline

- **WHEN** DrapingPair renders with a face source and an outline source
- **THEN** both face images are masked by that outline, and the oval behind each image has no fill, so the frame's color shows through

#### Scenario: A pair without an outline

- **WHEN** DrapingPair renders with a face source and no outline source
- **THEN** both face images carry no mask, as before this change
