## ADDED Requirements

### Requirement: The photo report email says what is kept

The footer of a photo report's email SHALL carry one line about the photo, in the words of canvas artboard 12. The line SHALL say the face crop is deleted within 24 hours of the analysis, and that the report is kept until the person asks for deletion. It SHALL NOT say that only the result is kept: the report also holds the measured traits, the quiz answers and the personal text (`legal-pages`).

#### Scenario: The photo footer

- **WHEN** the report email is rendered for a photo report
- **THEN** its HTML and plain-text parts say the photo is deleted within 24 hours and the report is kept until the person asks for deletion, and neither holds "We keep only your result"
