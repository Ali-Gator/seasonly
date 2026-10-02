## Purpose

The single list of the 12 seasons and what each one wears. Every surface reads its season ids, families and palettes from here: best colors, colors to avoid, neutrals, metals, makeup and hair swatches, and a draping pair. A report, a season page and a share card then show the same colors.

## ADDED Requirements

### Requirement: The core owns the season list

The analysis core SHALL export the 12 season ids, which are the fixed slugs ({@link openspec/specs/site-structure/spec.md#requirement-the-12-season-slugs-are-fixed}), in family order, and each season's family (`spring`, `summer`, `autumn` or `winter`). Code elsewhere in the workspace that needs the season list SHALL import it from the core and SHALL NOT keep its own copy.

#### Scenario: A season's family

- **WHEN** the family of `soft-autumn` is asked for
- **THEN** it is `autumn`

#### Scenario: The web route map

- **WHEN** the web app's route map lists the season slugs
- **THEN** they are exactly the core's season ids in the same order

#### Scenario: The eval manifest

- **WHEN** an eval manifest entry is labeled `warm-autumn`
- **THEN** the manifest check rejects it as not one of the 12 seasons

### Requirement: Every season has a complete palette

Each of the 12 seasons SHALL have a palette of named colors, each with a `#RRGGBB` hex in uppercase: exactly 24 best colors and exactly 6 neutrals (the 30 colors the product promises), at least 6 colors to avoid, at least 2 metals to wear and at least 1 to go easy on, and 3 swatches each for lips, blush, eyes and hair. Each palette SHALL also name a draping pair: a best color taken from its best colors and a worst color taken from its colors to avoid. Names SHALL be unique within each section of a palette.

#### Scenario: All 12 palettes

- **WHEN** the palette of each season id is read
- **THEN** every section has its required count, every hex is `#RRGGBB` uppercase, and no name repeats within a section

#### Scenario: The draping pair

- **WHEN** any season's draping pair is read
- **THEN** its best color is one of that season's best colors and its worst color is one of its colors to avoid

### Requirement: No color is both best and to avoid

Within one season, no hex SHALL appear both among the best colors or neutrals and among the colors to avoid.

#### Scenario: A color listed twice

- **WHEN** any season's palette is read
- **THEN** no hex in its colors to avoid also appears in its best colors or neutrals

### Requirement: Soft Autumn is the approved canvas palette

The Soft Autumn palette SHALL equal, name for name and hex for hex in the same order, the palette on the approved MVP canvas's full report (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3).

#### Scenario: Soft Autumn against the canvas

- **WHEN** the Soft Autumn palette is read
- **THEN** its first best color is Soft Coral `#D88E77`, it has 24 best colors, and its draping pair is Terracotta `#B4694F` and Fuchsia `#CC2A7E`

### Requirement: Palettes are approved before they ship

The palettes of the 11 seasons other than Soft Autumn SHALL be reviewed and approved by the user, as rendered swatches, before they are committed as palette data.

**Unenforced:** whether colors suit a season is a human judgment; the change's task list gates it on the user's approval.

#### Scenario: A drafted palette

- **WHEN** a season's palette is drafted
- **THEN** it is shown to the user as swatches with names and hex, and is committed only after approval
