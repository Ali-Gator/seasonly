## MODIFIED Requirements

### Requirement: The footer says where the report lives

The footer SHALL say "This report stays at seasonly.me/r/<id>." and "Seasons describe colors, not people. If a color you love isn't here, wear it away from your face." A photo report's footer SHALL also say, in the words of canvas v55 boards "10 Full report" (375 and 1280), "We delete our copy of your face crop within 24 hours of your analysis. Google may keep one up to 90 days for abuse checks." It SHALL NOT say the photo is deleted without naming Google's copy: `/privacy` says Google may keep the crop up to 90 days for abuse checks.

#### Scenario: A quiz-only report's footer

- **WHEN** a quiz-only report is opened
- **THEN** the footer has no line about a photo

#### Scenario: A photo report's footer

- **WHEN** a photo report is opened
- **THEN** the footer says "We delete our copy of your face crop within 24 hours of your analysis. Google may keep one up to 90 days for abuse checks." and does not hold "Your photo is deleted within 24 hours"

### Requirement: The report has a wide layout

From 1024 px wide, the report SHALL follow canvas artboard "10 Full report · 1280": the season, the agreement note, the actions and the Premium card in a left column, and the sections in a right column. The left column SHALL run on without a gap: the actions SHALL start right under the season block, not level with a later section on the right.

#### Scenario: A desktop window

- **WHEN** the report is opened 1280 px wide
- **THEN** the season name and "Share my season" sit to the left of "Section 1 of 6"

#### Scenario: The actions follow the agreement note

- **WHEN** the report is opened 1280 px wide and its palette is taller than its season block
- **THEN** "Share my season" starts right under the agreement note, above the top of "Colors to avoid", because the block that holds it clears only the left column
