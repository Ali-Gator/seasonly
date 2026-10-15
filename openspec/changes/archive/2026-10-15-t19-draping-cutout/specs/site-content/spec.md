## ADDED Requirements

### Requirement: The sample face is cut out like a real report's

Every draping pair on the sample face, on `/sample-report` and on `/color-analysis-gpt-alternative`, SHALL mask the sample face with its outline, so the sample looks like a real report's draping preview. The outline SHALL be a static PNG beside the sample face, made with the same person segmenter the phone uses. It SHALL NOT be fetched from `/api/`.

#### Scenario: The sample draping pair

- **WHEN** `/sample-report` or `/color-analysis-gpt-alternative` is rendered
- **THEN** its draping pair shows the sample face masked by the sample face's static outline, and no request goes to `/api/`
