## MODIFIED Requirements

### Requirement: The sample report puts the palette first on a phone

Below 1024 px wide, `/sample-report` SHALL show its palette straight after the season name and tagline, as a report does. The sample banner SHALL stay above the season, and its own "Find my colors" action SHALL be secondary, so the page's first screen has no primary action beside the palette. On a 375 × 812 phone the palette SHALL start in the first screen: at least half of its first swatch SHALL show without scrolling, since the banner above it pushes a 3-column swatch past the fold.

#### Scenario: The sample on a phone

- **WHEN** `/sample-report` opens in a 375 × 812 window
- **THEN** at least half of the first palette swatch is inside the window without scrolling, below "Soft Autumn"
