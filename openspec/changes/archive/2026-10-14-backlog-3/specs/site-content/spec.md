## ADDED Requirements

### Requirement: A core page that says what Seasonly keeps names the report

Where `/`, `/how-it-works` or `/color-analysis-gpt-alternative` says what Seasonly keeps after the photo is deleted, it SHALL say the report is kept, in the approved words "We keep your report, not your photo." It SHALL NOT say that only the result, or the season and colors, are kept: the report also holds the measured traits, the quiz answers and the personal text.

#### Scenario: The 24-hour notes

- **WHEN** `/`, `/how-it-works` and `/color-analysis-gpt-alternative` are rendered
- **THEN** each page's 24-hour note says "We keep your report, not your photo.", and none of the three says "We keep your result"
