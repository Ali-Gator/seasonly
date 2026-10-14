## MODIFIED Requirements

### Requirement: The photo report email says what is kept

The footer of a photo report's email SHALL carry one line about the photo, in the words of canvas v55 artboard 12: "We delete our copy of your face crop within 24 hours of your analysis. Google may keep one up to 90 days for abuse checks. We keep your report until you ask us to delete it." It SHALL NOT say the photo is deleted without naming Google's copy, and it SHALL NOT say that only the result is kept: the report also holds the measured traits, the quiz answers and the personal text (`legal-pages`). A quiz-only report's email sends Google nothing and carries no line about a photo.

#### Scenario: The photo footer

- **WHEN** the report email is rendered for a photo report
- **THEN** its HTML and plain-text parts say "We delete our copy of your face crop within 24 hours of your analysis. Google may keep one up to 90 days for abuse checks. We keep your report until you ask us to delete it.", and neither holds "We keep only your result"
