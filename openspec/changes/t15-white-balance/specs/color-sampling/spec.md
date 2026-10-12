## ADDED Requirements

### Requirement: Sampling reports the eye white

Sampling SHALL measure the eye white from the brightest part of both eye openings, the same measure the photo check uses, with 468 or 478 landmarks. It SHALL report the eye white beside the region colors, or report it as absent when the eye openings hold fewer than 50 usable pixels. The eye white SHALL NOT change the region colors or the traits.

#### Scenario: The eye white is reported

- **WHEN** a synthetic face paints its eye openings a known light color and is sampled with 468 landmarks
- **THEN** the reported eye white is within ΔE 2 of the color painted there

#### Scenario: No usable eye white

- **WHEN** the eye openings hold fewer than 50 pixels inside the image
- **THEN** the eye white is reported as absent and the traits are those of the region colors
