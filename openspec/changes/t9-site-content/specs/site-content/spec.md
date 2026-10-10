## Purpose

Fixes what each core public page of seasonly.me shows and where its words, colors and images come from, so the pages that carry search traffic hold real, sourced content before they are indexed.

## ADDED Requirements

### Requirement: Every indexed core page carries real content

The core pages are `/`, `/seasons`, every `/seasons/<slug>`, `/how-it-works`, `/sample-report` and `/color-analysis-gpt-alternative`. Each SHALL show the content of its approved canvas board: "Landing" at 375 and 1280, "Seasons" at 375 and 1280, "Season" at 375 and 1280, "How it works", "Sample report" and "Color analysis GPT alternative". The board's placeholders are filled with the copy and images approved in this change.

No core page SHALL render placeholder copy, meaning bracketed upper-case text such as `[PHOTO]` or `[NAME 1]`. No core page SHALL render an empty photo slot that shows a label instead of an image.

The main content of each core page, counted without the site header and footer, SHALL hold at least 250 words.

#### Scenario: No placeholder on a core page

- **WHEN** any core page is rendered, for `/seasons/<slug>` every slug
- **THEN** it contains no bracketed upper-case placeholder text and no photo slot showing a label instead of an image

#### Scenario: A core page clears the word floor

- **WHEN** the main content of any core page is counted, header and footer excluded
- **THEN** it holds at least 250 words

### Requirement: The core pages are indexed

The six core routes (`/`, `/seasons`, `/seasons/<slug>`, `/how-it-works`, `/sample-report` and `/color-analysis-gpt-alternative`) SHALL be marked ready in the route map, so each carries no `noindex` and is listed in the sitemap ({@link openspec/specs/site-structure/spec.md#requirement-a-page-is-indexed-only-once-its-content-ships}).

#### Scenario: The core routes are ready

- **WHEN** the route map is read
- **THEN** the six core routes are marked ready, and the sitemap lists `/`, `/seasons`, the 12 season pages, `/how-it-works`, `/sample-report` and `/color-analysis-gpt-alternative`, besides `/privacy` and `/terms`: 19 URLs

### Requirement: The landing shows a sample result and how the photo is handled

The landing SHALL show:

- the hero with "Take a selfie" and "Upload a photo" actions to `/analyze` and the line "Free while we are in early access. No account needed." The header's "Find my colors" stays the page's only link of that name;
- a sample result: "This is a Soft Autumn" with the 12 Soft Autumn colors of the approved board, each with its name and hex code. Each is one of the 30 Soft Autumn colors (24 best colors and 6 neutrals) in the shared season palettes;
- the three how-it-works steps;
- the light photo tip, with its good and bad example photos;
- the note "Your photo is deleted within 24 hours";
- the 12 seasons in their four families, each linking to its season page and showing the first four of that season's highlight colors from the shared season palettes.

#### Scenario: The sample result

- **WHEN** the landing is rendered
- **THEN** it shows "This is a Soft Autumn" and 12 swatches, each with a name and hex code that match one of the 30 Soft Autumn colors

#### Scenario: Every season linked

- **WHEN** the landing is rendered
- **THEN** its 12-seasons block links to all 12 `/seasons/<slug>` pages, each with the first four highlight colors of that season

### Requirement: A season page shows that season's shared palette and copy

Each `/seasons/<slug>` page SHALL take that season's colors from the shared season palettes: its 24 best colors, its colors to avoid, its 6 neutrals, the metals to wear and the metals to go easy on. It SHALL take its tagline, summary, undertone, chroma and contrast from the shared season copy the report uses. A season page and a report for the same season therefore show the same colors and the same words for them.

Each season page SHALL add its own longer description. That description SHALL hold at least 120 words and SHALL differ from every other season's. Each season page SHALL also name three neighbouring seasons. Each neighbour gets a link, one line on how it differs, and the first four of its highlight colors from the shared palettes.

Each season page SHALL offer "Find out if you're a <Season>", linking to `/analyze`, both after the description and at the end of the page.

#### Scenario: The palette matches the report

- **WHEN** `/seasons/soft-autumn` is rendered
- **THEN** its palette, colors to avoid, neutrals and metals list exactly the Soft Autumn colors a Soft Autumn report lists, in the same order and with the same names and hex codes

#### Scenario: Each season has its own description

- **WHEN** the 12 season pages are rendered
- **THEN** each one's own description holds at least 120 words, and no two are the same

#### Scenario: Neighbouring seasons

- **WHEN** any season page is rendered
- **THEN** it links to three other season pages, each with a line on how it differs and the first four of that season's highlight colors

### Requirement: Famous people on a season page are sourced and credited

Each season page SHALL show three public figures typed as that season. Each figure SHALL have:

- a name;
- a photo from Wikimedia Commons under a license that allows reuse;
- a visible credit with the photo's author and license, linking to the photo's Commons page;
- a source for the season assignment: a published color analysis, linked.

The section SHALL say that these are readings of public photos and that no figure endorses Seasonly. A figure without a reusable photo and a source SHALL NOT be shown.

#### Scenario: A credited photo

- **WHEN** any season page is rendered
- **THEN** it shows three figures, each with a name, a photo, a credit naming the author and license and linking to Commons, and a linked source for the season

#### Scenario: No endorsement implied

- **WHEN** the famous-people section is rendered
- **THEN** it says these are readings of public photos and that no one shown endorses Seasonly

### Requirement: How it works describes the real checks

`/how-it-works` SHALL list every reason a photo is turned back, each under the title of its retake tip: "Too dark", "Tinted light", "Filter detected", "No face found" and "More than one face". The page SHALL say what happens when the photo and the quiz disagree, using the shared agreement copy: the photo counts for more. It SHALL NOT promise a correct result. The page SHALL link to `/sample-report`, `/privacy` and `/color-analysis-gpt-alternative`.

#### Scenario: All five rejections

- **WHEN** `/how-it-works` is rendered
- **THEN** it names "Too dark", "Tinted light", "Filter detected", "No face found" and "More than one face"

#### Scenario: Photo and quiz disagree

- **WHEN** `/how-it-works` is rendered
- **THEN** it says that when photo and quiz point different ways, the photo counts for more

### Requirement: The sample report is static and sends nothing

`/sample-report` SHALL show the full Soft Autumn report: the season, the agreement note, the six report sections and the draping preview on the sample face. It SHALL be marked as a sample above the season, and SHALL end with an action to `/analyze`.

The page SHALL have no share, save or Premium action. It SHALL make no request to `/api/`. It SHALL send none of the funnel's custom events: `consent_answered`, `quiz_completed`, `analysis_failed`, `report_requested`, `email_submitted`, `share_tapped`, `share_card_downloaded`, `palette_saved` and `premium_tapped`. PostHog's automatic events, such as `$pageview`, are sent as on every page.

#### Scenario: A sample, not a report

- **WHEN** `/sample-report` is rendered
- **THEN** it says it is a sample Soft Autumn report, shows the six sections and a draping pair on the sample face, and offers no share, save or Premium action

#### Scenario: Nothing is sent

- **WHEN** a person opens `/sample-report` and scrolls to the end
- **THEN** no request goes to `/api/`, and none of the funnel's custom events is sent

### Requirement: The GPT-alternative page states only sourced facts

`/color-analysis-gpt-alternative` SHALL give the date custom GPTs retire and say what does not carry over to a replacement. Each fact SHALL come from OpenAI's published retirement FAQ or announcement, checked when the page ships, and the page SHALL link to that source. It MAY say that color analysis GPTs retire with all custom GPTs. It SHALL NOT claim that a particular third-party GPT is gone for good, or that its creator will not move it to a replacement.

#### Scenario: The retirement facts

- **WHEN** `/color-analysis-gpt-alternative` is rendered
- **THEN** it states the retirement date and what does not carry over, and links to OpenAI's source

### Requirement: Example photos show a fictional person

Every photo that shows how a selfie should or should not look, and the sample face, SHALL show a generated, fictional person, never a real one. Each image SHALL have alt text that describes what it shows. The good and bad images of one tip SHALL show the same face.

**Unenforced:** that a person is fictional and that two images show one face are checked by the user's approval of the images on the canvas, recorded in the change's tasks.

#### Scenario: Alt text on every example

- **WHEN** any photo-tip example or the sample draping face is rendered
- **THEN** its image has non-empty alt text describing what it shows
