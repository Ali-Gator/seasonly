## ADDED Requirements

### Requirement: A season page shows its palette image

Each season page SHALL show that season's palette image, `/images/palette/<slug>`, as an image in the page. Its alt text SHALL be "<Season> color palette: 24 colors and 6 neutrals, each with its name and hex code". The image SHALL state its width and height, 1080 and 1920, and SHALL load lazily. Its place and look SHALL follow the approved "Season" boards.

**Unenforced:** fidelity to the boards is judged by the user. The change's task list gates the code on the boards' approval.

#### Scenario: True Summer's palette image

- **WHEN** `/seasons/true-summer` is rendered
- **THEN** it holds one image whose source is `/images/palette/true-summer`, whose alt text is "True Summer color palette: 24 colors and 6 neutrals, each with its name and hex code", with width 1080, height 1920 and lazy loading

#### Scenario: Every season's palette image

- **WHEN** any of the 12 season pages is rendered
- **THEN** its palette image is that season's own

### Requirement: A season page offers its palette image to save

Beside the palette image, each season page SHALL show a link "Save the palette image" that downloads that season's palette image as `seasonly-<slug>-palette.png`, the file name a report's "Save my palette" uses.

#### Scenario: The save link

- **WHEN** `/seasons/true-summer` is rendered
- **THEN** it holds a link "Save the palette image" to `/images/palette/true-summer` that downloads as `seasonly-true-summer-palette.png`

#### Scenario: Every season's save link

- **WHEN** any of the 12 season pages is rendered
- **THEN** its save link points at that season's own palette image

## MODIFIED Requirements

### Requirement: A season page answers common questions from the shared copy

Each season page SHALL show a "Questions about <Season>" section after the neighbouring seasons and before "Is this you?". It SHALL list its questions as expandable items, the first one open, in the style of How it works' questions. In this order, the questions SHALL be:

1. Only for a season with a second name: "Is <Season> the same as <second name> <family>?", answered yes: two names for the same season and the same palette.
2. "What colors should a <Season> avoid?", naming the first three of the season's colors to avoid from the shared palettes, and saying to keep them away from the face.
3. "Can a <Season> wear black?". When the season's neutrals include Black: "Yes. Black is one of the <Season> neutrals, so it works near the face too." Otherwise: "Not near the face. Black is not in the <Season> palette. <Darkest neutral>, its darkest neutral, does the same job. Black trousers, shoes and bags are fine.", where the darkest neutral is the darkest of the season's 6 neutrals in the shared palettes.
4. "Which yellow suits a <Season>?", naming the season's yellows: the best colors listed for it as yellows, each one of that season's 24 best colors by name. With two or more: "<Yellows>. They are the yellows in the <Season> palette." With one: "<Yellow>. It is the only yellow in the <Season> palette." With none: "None near the face. The <Season> palette has no yellow." When one of the season's colors to avoid is listed as its yellow to avoid, the answer SHALL end "Skip <that color>, one of the <Season> colors to avoid."
5. "What hair color suits a <Season>?", answered with the season's shared hair tip.
6. "What makeup suits a <Season>?", answered with the season's shared makeup line.
7. "Which metals suit a <Season>?", answered with the season's shared metals line and the names of the metals to wear and to go easy on from the shared palettes.
8. "How do I find out if I'm a <Season>?", answered with one daylight selfie and four quick questions, linking to `/analyze`.

Every color, metal, hair and makeup word in an answer SHALL come from the shared season copy and palettes, so a season page and a report for that season never disagree.

#### Scenario: The questions on a page with a second name

- **WHEN** `/seasons/deep-autumn` is rendered
- **THEN** its "Questions about Deep Autumn" section lists the eight questions in order, the first is "Is Deep Autumn the same as Dark Autumn?" and is open, and the section comes after "Neighbouring seasons" and before "Is this you?"

#### Scenario: The questions on a page without one

- **WHEN** `/seasons/soft-autumn` is rendered
- **THEN** its section lists seven questions, the first is "What colors should a Soft Autumn avoid?" and is open

#### Scenario: Answers match the shared copy

- **WHEN** any season page is rendered
- **THEN** its avoid answer names the first three of that season's colors to avoid, its hair answer is that season's shared hair tip, its makeup answer is its shared makeup line, its metals answer names each of its metals, and its last answer links to `/analyze`

#### Scenario: Black for a Winter

- **WHEN** `/seasons/true-winter` is rendered
- **THEN** its black answer is "Yes. Black is one of the True Winter neutrals, so it works near the face too."

#### Scenario: Black for another season

- **WHEN** `/seasons/true-summer` is rendered
- **THEN** its black answer is "Not near the face. Black is not in the True Summer palette. Navy, its darkest neutral, does the same job. Black trousers, shoes and bags are fine."

#### Scenario: Black on every page

- **WHEN** any season page is rendered
- **THEN** its black answer says yes exactly when that season's neutrals include Black, and otherwise names the darkest of that season's 6 neutrals

#### Scenario: Yellows for Deep Autumn

- **WHEN** `/seasons/deep-autumn` is rendered
- **THEN** its yellow answer is "Saffron, mustard and antique gold. They are the yellows in the Deep Autumn palette. Skip baby yellow, one of the Deep Autumn colors to avoid."

#### Scenario: A season with one yellow

- **WHEN** `/seasons/true-summer` is rendered
- **THEN** its yellow answer is "Light lemon. It is the only yellow in the True Summer palette. Skip golden yellow, one of the True Summer colors to avoid."

#### Scenario: A season without a yellow

- **WHEN** `/seasons/soft-summer` is rendered
- **THEN** its yellow answer is "None near the face. The Soft Summer palette has no yellow. Skip bright yellow, one of the Soft Summer colors to avoid."

#### Scenario: Every yellow is the season's own

- **WHEN** the yellows of the 12 seasons are read
- **THEN** every yellow to wear is one of that season's 24 best colors, and every yellow to avoid is one of that season's colors to avoid
