## MODIFIED Requirements

### Requirement: The landing shows a sample result and how the photo is handled

The landing SHALL show:

- the hero with a "Take a selfie" action to `/analyze?start=camera`, which opens the flow on the camera, an "Upload a photo" action to `/analyze`, and the line "Free while we are in early access. No account needed." The header's "Find my colors" stays the page's only link of that name. Below 1024 px wide, the hero SHALL show, between the headline and the lead, a swatch strip of the 12 sample Soft Autumn colors with the caption "A Soft Autumn result: 12 of 30 colors." and a link to `/sample-report`, so color is in the first phone screen. Below 1024 px, "Take a selfie" SHALL be the primary action; from 1024 px, "Upload a photo" SHALL be the primary action and "Take a selfie" the secondary;
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

#### Scenario: The hero's actions

- **WHEN** the landing is rendered
- **THEN** the hero's "Take a selfie" links to `/analyze?start=camera` and its "Upload a photo" links to `/analyze`

#### Scenario: The closing action

- **WHEN** the landing is rendered
- **THEN** its last action before the footer is "Start with a selfie", styled as the primary action
