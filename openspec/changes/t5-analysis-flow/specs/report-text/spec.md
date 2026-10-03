## MODIFIED Requirements

### Requirement: Every season has its report copy

The analysis core SHALL hold, for each of the 12 seasons, the season-level report copy:

- a tagline
- a summary paragraph
- an undertone, a chroma and a contrast line
- an intro for the neutrals, the metals and the makeup sections
- a hair tip
- a draping line
- a reveal line: what suits the family's colors, without naming the season

Every string SHALL be non-empty. Each string SHALL be no longer than the limit for its field, so the report layout holds. No reveal line SHALL contain its season's name.

#### Scenario: All 12 seasons

- **WHEN** the report copy of each season is read
- **THEN** every field is present, non-empty and within its length limit, and no reveal line names its season

#### Scenario: Soft Autumn against the canvas

- **WHEN** the Soft Autumn copy is read
- **THEN** its tagline is "Warm, soft and earthy.", its undertone is "Warm, leaning neutral", its hair tip is "Go one or two shades warmer than your natural color. Skip ash blonde and blue-black." and its draping line is "Terracotta warms your skin; fuchsia competes with it.", as on the approved MVP canvas's full report (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3), and its reveal line is "Colors with a golden base and a little dust in them work with you. Bright, icy and very dark colors compete.", as on the canvas's season reveal
