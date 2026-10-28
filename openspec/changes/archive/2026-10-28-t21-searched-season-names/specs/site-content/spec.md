## ADDED Requirements

### Requirement: A season page names its second name

A season page whose season has a second name (site-structure) SHALL show "<first word> (<second name>) <family>" as its h1, for example "Deep (Dark) Autumn". The first paragraph after the palette SHALL open with "Also called <second name> <family>." before the shared summary. The rest of the page (the palette heading, the "Find out if you're a <Season>" actions, the neighbours) SHALL keep the one name. A season page without a second name SHALL show neither.

#### Scenario: A page with a second name

- **WHEN** `/seasons/deep-autumn` is rendered
- **THEN** its one h1 reads "Deep (Dark) Autumn", "Also called Dark Autumn." comes before the shared Deep Autumn summary, and its actions read "Find out if you're a Deep Autumn"

#### Scenario: A page without one

- **WHEN** `/seasons/soft-autumn` is rendered
- **THEN** its h1 reads "Soft Autumn" and no "Also called" line appears

### Requirement: A season page answers common questions from the shared copy

Each season page SHALL show a "Questions about <Season>" section after the neighbouring seasons and before "Is this you?". It SHALL list its questions as expandable items, the first one open, in the style of How it works' questions. In this order, the questions SHALL be:

1. Only for a season with a second name: "Is <Season> the same as <second name> <family>?", answered yes: two names for the same season and the same palette.
2. "What colors should a <Season> avoid?", naming the first three of the season's colors to avoid from the shared palettes, and saying to keep them away from the face.
3. "What hair color suits a <Season>?", answered with the season's shared hair tip.
4. "What makeup suits a <Season>?", answered with the season's shared makeup line.
5. "Which metals suit a <Season>?", answered with the season's shared metals line and the names of the metals to wear and to go easy on from the shared palettes.
6. "How do I find out if I'm a <Season>?", answered with one daylight selfie and four quick questions, linking to `/analyze`.

Every color, metal, hair and makeup word in an answer SHALL come from the shared season copy and palettes, so a season page and a report for that season never disagree.

#### Scenario: The questions on a page with a second name

- **WHEN** `/seasons/deep-autumn` is rendered
- **THEN** its "Questions about Deep Autumn" section lists the six questions in order, the first is "Is Deep Autumn the same as Dark Autumn?" and is open, and the section comes after "Neighbouring seasons" and before "Is this you?"

#### Scenario: The questions on a page without one

- **WHEN** `/seasons/soft-autumn` is rendered
- **THEN** its section lists five questions, the first is "What colors should a Soft Autumn avoid?" and is open

#### Scenario: Answers match the shared copy

- **WHEN** any season page is rendered
- **THEN** its avoid answer names the first three of that season's colors to avoid, its hair answer is that season's shared hair tip, its makeup answer is its shared makeup line, its metals answer names each of its metals, and its last answer links to `/analyze`
