# site-content Specification

## Purpose

Fixes what each core public page of seasonly.me shows and where its words, colors and images come from, so the pages that carry search traffic hold real, sourced content before they are indexed.

## Public Interface

| Route                             | File                                                              | Rendering         | Indexed |
| --------------------------------- | ----------------------------------------------------------------- | ----------------- | ------- |
| `/`                               | `apps/web/src/app/(site)/page.tsx`                                | static            | yes     |
| `/seasons`                        | `apps/web/src/app/(site)/seasons/page.tsx`                        | static            | yes     |
| `/seasons/<slug>`                 | `apps/web/src/app/(site)/seasons/[season]/page.tsx`               | SSG, the 12 slugs | yes     |
| `/how-it-works`                   | `apps/web/src/app/(site)/how-it-works/page.tsx`                   | static            | yes     |
| `/sample-report`                  | `apps/web/src/app/(site)/sample-report/page.tsx`                  | static            | yes     |
| `/color-analysis-gpt-alternative` | `apps/web/src/app/(site)/color-analysis-gpt-alternative/page.tsx` | static            | yes     |

`apps/web/src/lib/site-content/` holds the site's own content:

- `seasons.ts`: `SEASON_CONTENT: Record<SeasonSlug, SeasonContent>`, with `about` (paragraphs), three `neighbours` (`{ slug, why }`) and three `famous` (`{ name, image, credit: { author, license, licenseUrl, commonsUrl }, source: { title, url } }`); `famousIntro(plural)` and `FAMOUS_NOTE`.
- `images.ts`: `TIP_PHOTOS` (light, makeup and filter, each a good and a bad `{ src, alt }`), `SAMPLE_FACE`, `SAMPLE_FACE_MASK` (its outline, `/images/examples/face-mask.png`) and `QUIZ_PHOTOS` (quiz).
- `sample.ts`: `softAutumnColors(names)`, the sample palettes picked by name from `PALETTES["soft-autumn"]`.
- `season-link.tsx`: `SeasonLink({ slug, line?, wide?, compact? })`, a season's name as an `h3` holding its link, an optional line and its first highlight colors (four, or six from 1024 px with `wide`). `compact`, the landing's, shows the four as a chip-only `SwatchStrip` whose names are visually hidden.

Images are WebP under `apps/web/public/images/examples/` (the generated model) and `apps/web/public/images/famous/<slug>/` (Commons photos cropped to 3:4), each at most about 80 KB. The sample report renders `ReportSections` from `lib/report/sections.tsx` (report-page) with a static `DrapingPair` on `SAMPLE_FACE`, cut out with `SAMPLE_FACE_MASK`, as the GPT-alternative page does. The outline is a 384 × 512 PNG made once by `scripts/sample-face-mask.ts` with the phone's person segmenter (t19-draping-cutout).

## Behavior

Every color and every shared season word comes from the analysis core: `PALETTES` (best, avoid, neutrals, metals, highlights, draping), `SEASON_COPY` (tagline, summary, undertone, chroma, contrast and section intros), `AGREEMENT_COPY` and `RETAKE_TIPS`. Only the page-level copy of the approved boards lives in each `page.tsx`, and only the per-season description, neighbours and famous people live in `lib/site-content`. The copy, the 36 famous people and the eight example images were approved by the user on 2026-10-10 (MVP canvas version 34, design system version 25).

Each page is one DOM in phone reading order, rearranged from 1024 px with `lg:` classes, as the report is. A season page puts its palette straight after the head on a phone; from 1024 px the head and the copy float left and the sections right (`LEFT`, `RIGHT` from `lib/report/sections.tsx`), in a flow root. The landing hero adds a 12-chip `SwatchStrip` below 1024 px and swaps its action fills from 1024 px; its closing "Start with a selfie" is primary. The sample report's banner action is secondary, the season has no overline, and the banner sits 16 px above it on a phone. The famous people come from Four Seasons Studio's "<Season> Celebrities" posts, one source per season, linked once under the three photos; each photo carries "Photo: <author>, <license>, cropped", linking to its Commons page and its license. The GPT page's facts are OpenAI's retirement FAQ, checked 2026-10-10.

## Edge Cases

- A season's three famous people share one source URL; the page links it once. A figure with another source needs its own link (the unit test fails first).
- The landing's sample palette and the GPT page's are picked from the Soft Autumn palette by name: a renamed color throws at build time.
- `/sample-report` shares its colors with `/seasons/soft-autumn`. Its h1 names it a sample report and it links to the season page, so the two do not compete for the season's name.
- The GPT page states a future date; it goes stale on December 11, 2026 (BL-27).
- Vercel previews send `X-Robots-Tag: noindex` at the platform level; only production is indexed.

## Requirements

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

### Requirement: Famous people on a season page are sourced and credited

Each season page SHALL show three public figures typed as that season. Each figure SHALL have:

- a name;
- a photo from Wikimedia Commons under a license that allows reuse;
- a visible credit with the photo's author and license, linking to the photo's Commons page;
- a source for the season assignment: a published color analysis, linked.

The section SHALL say that these are readings of public photos and that no figure endorses Seasonly. A figure without a reusable photo and a source SHALL NOT be shown.

The name SHALL be the photo's caption: the photo and its name sit in one `figure`, the name in its `figcaption`, and the photo's `alt` is empty, so a screen reader reads the name once.

#### Scenario: A credited photo

- **WHEN** any season page is rendered
- **THEN** it shows three figures, each with a name, a photo, a credit naming the author and license and linking to Commons, and a linked source for the season

#### Scenario: No endorsement implied

- **WHEN** the famous-people section is rendered
- **THEN** it says these are readings of public photos and that no one shown endorses Seasonly

#### Scenario: The name is read once

- **WHEN** any season page is rendered
- **THEN** each famous photo has `alt=""` and sits in a `figure` whose `figcaption` holds that person's name

### Requirement: How it works describes the real checks

`/how-it-works` SHALL list every reason a photo is turned back, each under the title of its retake tip: "Too dark", "Tinted light", "Filter detected", "No face found" and "More than one face". The page SHALL say what happens when the photo and the quiz disagree, using the shared agreement copy: the photo counts for more. It SHALL NOT promise a correct result. The page SHALL link to `/sample-report`, `/privacy` and `/color-analysis-gpt-alternative`.

Where the page says when the face crop is uploaded, it SHALL say: after the photo passes the check and the quiz is finished. It SHALL NOT mention an agreement step, since the flow has none.

The FAQ answer to "What happens to my photo?" SHALL be, in the words of canvas v55 board HowItWorks: "Only a crop of your face is uploaded, after the photo passes the check and you finish the quiz. We delete our copy within 24 hours. Google may keep one up to 90 days for abuse checks. We keep your report, not your photo."

#### Scenario: All five rejections

- **WHEN** `/how-it-works` is rendered
- **THEN** it names "Too dark", "Tinted light", "Filter detected", "No face found" and "More than one face"

#### Scenario: Photo and quiz disagree

- **WHEN** `/how-it-works` is rendered
- **THEN** it says that when photo and quiz point different ways, the photo counts for more

#### Scenario: When the crop is uploaded

- **WHEN** `/how-it-works` is rendered
- **THEN** it says only a face crop is uploaded, after the photo passes the check and the quiz is finished, and it holds no "you agree"

#### Scenario: The FAQ names Google's copy

- **WHEN** `/how-it-works` is rendered
- **THEN** the answer to "What happens to my photo?" says "We delete our copy within 24 hours. Google may keep one up to 90 days for abuse checks." and holds no "It is deleted within 24 hours"

### Requirement: The sample report is static and sends nothing

`/sample-report` SHALL show the full Soft Autumn report: the season, the agreement note, the six report sections and the draping preview on the sample face. It SHALL be marked as a sample above the season, and SHALL end with an action to `/analyze`. Its main heading SHALL name it a sample report, and it SHALL link to `/seasons/soft-autumn`, so it does not compete with the season page for the season's name.

The page SHALL have no share, save or Premium action. It SHALL make no request to `/api/`. It SHALL send none of the funnel's custom events: `quiz_completed`, `analysis_failed`, `report_requested`, `email_submitted`, `share_tapped`, `share_card_downloaded`, `palette_saved` and `premium_tapped`. PostHog's automatic events, such as `$pageview`, are sent as on every page.

#### Scenario: A sample, not a report

- **WHEN** `/sample-report` is rendered
- **THEN** it says it is a sample Soft Autumn report, its main heading names it a sample report, it links to `/seasons/soft-autumn`, it shows the six sections and a draping pair on the sample face, and it offers no share, save or Premium action

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

### Requirement: The GPT-alternative page documents the chat plugin

`/color-analysis-gpt-alternative` SHALL have a section "Use Seasonly in ChatGPT and Claude" with the copy of the approved "Color analysis GPT alternative" board. Both plugin directories link to this section as the plugin's public documentation. The section SHALL say:

- what the plugin does: it asks the four quiz questions and gives the season family and 6 of its colors, with a link to the photo analysis for the exact subtype;
- that it takes no photo;
- how to add it: the server address `https://seasonly.me/api/mcp` for a custom connector, and, once listed, a link to each directory listing;
- where its data handling is described, with a link to the plugin section of `/privacy`.

The section SHALL have an anchor that the listings can link to. It SHALL state only what the plugin does at the time it ships: it SHALL NOT link to a directory listing that is not yet published.

#### Scenario: Reading the plugin section

- **WHEN** `/color-analysis-gpt-alternative` is rendered
- **THEN** it has a section with an anchor, titled "Use Seasonly in ChatGPT and Claude", that names the server address `https://seasonly.me/api/mcp`, says no photo is taken and links to `/privacy`

### Requirement: The sample report puts the palette first on a phone

Below 1024 px wide, `/sample-report` SHALL show its palette straight after the season name and tagline, as a report does. The sample banner SHALL stay above the season, and its own "Find my colors" action SHALL be secondary, so the page's first screen has no primary action beside the palette.

#### Scenario: The sample on a phone

- **WHEN** `/sample-report` opens in a 375 × 812 window
- **THEN** the first palette swatch is inside the window without scrolling, below "Soft Autumn"

### Requirement: A core page that says what Seasonly keeps names the report

Where `/`, `/how-it-works` or `/color-analysis-gpt-alternative` says what Seasonly keeps after the photo is deleted, it SHALL say the report is kept, in the approved words "We keep your report, not your photo." It SHALL NOT say that only the result, or the season and colors, are kept: the report also holds the measured traits, the quiz answers and the personal text.

#### Scenario: The 24-hour notes

- **WHEN** `/`, `/how-it-works` and `/color-analysis-gpt-alternative` are rendered
- **THEN** each page's 24-hour note says "We keep your report, not your photo.", and none of the three says "We keep your result"

### Requirement: The sample face is cut out like a real report's

Every draping pair on the sample face, on `/sample-report` and on `/color-analysis-gpt-alternative`, SHALL mask the sample face with its outline, so the sample looks like a real report's draping preview. The outline SHALL be a static PNG beside the sample face, made with the same person segmenter the phone uses. It SHALL NOT be fetched from `/api/`.

#### Scenario: The sample draping pair

- **WHEN** `/sample-report` or `/color-analysis-gpt-alternative` is rendered
- **THEN** its draping pair shows the sample face masked by the sample face's static outline, and no request goes to `/api/`

### Requirement: The sample face is labeled an example

Every draping pair on the sample face, on `/sample-report` and on `/color-analysis-gpt-alternative`, SHALL be followed by the caption of the approved canvas boards (v62): "An AI-made example face, to show how draping looks. These colors are not her analyzed result." The sample shows Soft Autumn's draping colors, while the analysis core reads the sample face as another season, so the page SHALL NOT present those colors as her result.

#### Scenario: The sample draping pair is captioned

- **WHEN** `/sample-report` or `/color-analysis-gpt-alternative` is rendered
- **THEN** its draping pair on the sample face is followed by "An AI-made example face, to show how draping looks. These colors are not her analyzed result."

### Requirement: The GPT-alternative page names only the filters the photo check catches

The photo check turns back a filter only from skin color no natural skin has, so it does not catch a soft beauty filter. Where `/color-analysis-gpt-alternative` lists what the photo check looks for, it SHALL say "strong color filters", in the words of the approved canvas boards (v62), and SHALL NOT claim that it checks for filters in general.

#### Scenario: The photo check's filter claim

- **WHEN** `/color-analysis-gpt-alternative` is rendered
- **THEN** its photo check section says the phone checks for "low light, tinted light, strong color filters, a missing face and more than one face", and holds no "tinted light, filters,"
