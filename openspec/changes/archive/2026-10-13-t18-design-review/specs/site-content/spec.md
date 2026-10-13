## MODIFIED Requirements

### Requirement: The landing shows a sample result and how the photo is handled

The landing SHALL show:

- the hero with "Take a selfie" and "Upload a photo" actions to `/analyze` and the line "Free while we are in early access. No account needed." The header's "Find my colors" stays the page's only link of that name. Below 1024 px wide, the hero SHALL show, between the headline and the lead, a swatch strip of the 12 sample Soft Autumn colors with the caption "A Soft Autumn result: 12 of 30 colors." and a link to `/sample-report`, so color is in the first phone screen. Below 1024 px, "Take a selfie" SHALL be the primary action; from 1024 px, "Upload a photo" SHALL be the primary action and "Take a selfie" the secondary;
- a sample result: "This is a Soft Autumn" with the 12 Soft Autumn colors of the approved board, each with its name and hex code. Each is one of the 30 Soft Autumn colors (24 best colors and 6 neutrals) in the shared season palettes, and a link to `/sample-report`;
- the three how-it-works steps;
- the light photo tip, with its good and bad example photos;
- the note "Your photo is deleted within 24 hours";
- the 12 seasons in their four families. Each season SHALL show its name as a heading linking to its season page, and the first four of that season's highlight colors from the shared season palettes as a swatch strip, with no visible names or hex codes;
- a closing "Start with a selfie" action to `/analyze`, as the primary action.

#### Scenario: The sample result

- **WHEN** the landing is rendered
- **THEN** it shows "This is a Soft Autumn" and 12 swatches, each with a name and hex code that match one of the 30 Soft Autumn colors, and links to `/sample-report`

#### Scenario: Color in the first phone screen

- **WHEN** the landing opens in a 375 × 812 window
- **THEN** the hero's 12-chip strip is inside the window without scrolling, above "Take a selfie"

#### Scenario: Every season linked

- **WHEN** the landing is rendered
- **THEN** its 12-seasons block has 12 season-name headings, each linking to its `/seasons/<slug>` page, each with a strip of that season's first four highlight colors whose names are readable by a screen reader and whose hex codes are not shown

#### Scenario: A desktop window

- **WHEN** the landing opens 1280 px wide
- **THEN** the hero's primary action is "Upload a photo", and the hero shows no chip strip beside the sample result

#### Scenario: The closing action

- **WHEN** the landing is rendered
- **THEN** its last action before the footer is "Start with a selfie", styled as the primary action

### Requirement: A season page shows that season's shared palette and copy

Each `/seasons/<slug>` page SHALL take that season's colors from the shared season palettes: its 24 best colors, its colors to avoid, its 6 neutrals, the metals to wear and the metals to go easy on. It SHALL take its tagline, summary, undertone, chroma and contrast from the shared season copy the report uses. A season page and a report for the same season therefore show the same colors and the same words for them.

Each season page SHALL add its own longer description. That description SHALL hold at least 120 words and SHALL differ from every other season's. Each season page SHALL also name three neighbouring seasons. Each neighbour gets a link, one line on how it differs, and the first four of its highlight colors from the shared palettes.

Below 1024 px wide, the palette SHALL come straight after the season name and tagline, before the summary, the longer description and the traits. From 1024 px, the copy SHALL sit in the left column and the palette in the right, as today.

Each season page SHALL offer "Find out if you're a <Season>", linking to `/analyze`, both after the description and at the end of the page.

#### Scenario: The palette matches the report

- **WHEN** `/seasons/soft-autumn` is rendered
- **THEN** its palette, colors to avoid, neutrals and metals list exactly the Soft Autumn colors a Soft Autumn report lists, in the same order and with the same names and hex codes

#### Scenario: The palette comes first on a phone

- **WHEN** `/seasons/soft-autumn` opens in a 375 × 812 window
- **THEN** the first palette swatch is inside the window without scrolling, and the longer description comes after the palette

#### Scenario: Each season has its own description

- **WHEN** the 12 season pages are rendered
- **THEN** each one's own description holds at least 120 words, and no two are the same

#### Scenario: Neighbouring seasons

- **WHEN** any season page is rendered
- **THEN** it links to three other season pages, each with a line on how it differs and the first four of that season's highlight colors

## ADDED Requirements

### Requirement: The sample report puts the palette first on a phone

Below 1024 px wide, `/sample-report` SHALL show its palette straight after the season name and tagline, as a report does. The sample banner SHALL stay above the season, and its own "Find my colors" action SHALL be secondary, so the page's first screen has no primary action beside the palette.

#### Scenario: The sample on a phone

- **WHEN** `/sample-report` opens in a 375 × 812 window
- **THEN** the first palette swatch is inside the window without scrolling, below "Soft Autumn"
