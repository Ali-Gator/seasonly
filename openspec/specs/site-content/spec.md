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

- `seasons.ts`: `SEASON_CONTENT: Record<SeasonSlug, SeasonContent>`, with `yellows` (`{ wear: string[]; avoid?: string }`, names from the season's best colors and colors to avoid), `outfits` (Everyday, Work and Evening, each `[best, neutral, metal]` palette names), `alsoTyped` (three to six more names from the famous people's source), `about` (paragraphs), three `neighbours` (`{ slug, why }`) and three `famous` (`{ name, image, credit: { author, license, licenseUrl, commonsUrl }, source: { title, url } }`); `famousIntro(plural)`, `FAMOUS_NOTE`, `seasonOutfits(slug)` (each outfit's `title`, resolved `colors` and `line`; throws on a name its palette list lacks), `seasonYellows(slug)` (the resolved `wear` swatches and `avoid` swatch; throws the same way) and `alsoTypedLine(slug, plural)`.
- `images.ts`: `TIP_PHOTOS` (light, makeup and filter, each a good and a bad `{ src, alt }`), `SAMPLE_FACE`, `SAMPLE_FACE_MASK` (its outline, `/images/examples/face-mask.png`) and `QUIZ_PHOTOS` (quiz).
- `sample.ts`: `softAutumnColors(names)`, the sample palettes picked by name from `PALETTES["soft-autumn"]`.
- `faq.tsx`: `Faq({ id, title, items })`, the expandable question list How it works and every season page share (a section, its h2, one `<details>` per `FaqItem` `[question, answer]`, the first open); `MoreLink({ href, children })`, a text link with an arrow; and `seasonFaq(slug)`, a season page's seven or eight questions built from `SEASON_COPY`, `PALETTES` and `seasonYellows`.
- `season-link.tsx`: `SeasonLink({ slug, line?, wide?, compact? })`, a season's name as an `h3` holding its link, an optional line and its first highlight colors (four, or six from 1024 px with `wide`). `compact`, the landing's, shows the four as a chip-only `SwatchStrip` whose names are visually hidden.

Images are WebP under `apps/web/public/images/examples/` (the generated model) and `apps/web/public/images/famous/<slug>/` (Commons photos cropped to 3:4), each at most about 80 KB. The sample report renders `ReportSections` from `lib/report/sections.tsx` (report-page) with a static `DrapingPair` on `SAMPLE_FACE`, cut out with `SAMPLE_FACE_MASK`, as the GPT-alternative page does. The outline is a 384 × 512 PNG made once by `scripts/sample-face-mask.ts` with the phone's person segmenter (t19-draping-cutout).

## Behavior

Every color and every shared season word comes from the analysis core: `PALETTES` (best, avoid, neutrals, metals, highlights, draping), `SEASON_COPY` (tagline, summary, undertone, chroma, contrast and section intros), `AGREEMENT_COPY` and `RETAKE_TIPS`. Only the page-level copy of the approved boards lives in each `page.tsx`, and only the per-season description, neighbours and famous people live in `lib/site-content`. The copy, the 36 famous people and the eight example images were approved by the user on 2026-10-10 (MVP canvas version 34, design system version 25).

Each page is one DOM in phone reading order, rearranged from 1024 px with `lg:` classes, as the report is. A season page puts its palette straight after the head on a phone; from 1024 px the head and the copy float left and the sections right (`LEFT`, `RIGHT` from `lib/report/sections.tsx`), in a flow root. The landing hero adds a 12-chip `SwatchStrip` below 1024 px and swaps its action fills from 1024 px; its closing "Start with a selfie" is primary. The sample report's banner action is secondary, the season has no overline, and the banner sits 16 px above it on a phone. The famous people come from Four Seasons Studio's "<Season> Celebrities" posts, one source per season, linked once under the three photos; each photo carries "Photo: <author>, <license>, cropped", linking to its Commons page and its license. The GPT page's facts are OpenAI's retirement FAQ, checked 2026-10-10.

A season page's h1 is `searchName` ("Deep (Dark) Autumn") and its summary paragraph opens "Also called Dark Autumn." for the eight seasons with a second name (site-structure). Its "Questions about <Season>" section sits between the neighbours and "Is this you?". Its right column runs Avoid, Neutrals, Metals, Makeup and hair, Outfit ideas, then the famous people. Makeup and hair is the report's own block (`MakeupAndHair` in `lib/report/sections.tsx`, overline "Makeup and hair" here, "Section 5 of N" on a report). The outfits and the extra names were approved on 2026-11-04 (MVP canvas version 76, board 16c); the names were read that day from each season's Four Seasons Studio page, spelled as the person is usually named. The answers name no new color or claim: the first three avoid colors, the hair tip, the makeup line and the metals line with the metal names, lowercased in prose. Since `t24-search-appearance` two questions follow the avoid question. The black answer says yes when the neutrals hold a color named Black (the three Winters) and otherwise names the darkest neutral by Rec. 709 luma. The yellow answer names the hand-picked `yellows`, because a hue window that catches Mustard also catches Avocado. After Outfit ideas, a "Palette image" section ("Keep the palette on your phone") shows `/images/palette/<slug>` as a plain lazy `<img>`, 96 px wide, beside one line and a plain download link named `seasonly-<slug>-palette.png`. `paletteUrl`, `paletteFile` and `SIZE` in `lib/palette-image/file.ts` are shared with the report's "Save my palette". The link sends no event (BL-118). The block, the two templates and the 12 yellow lists were approved on 2026-11-13 (MVP canvas version 81, boards 16 and 16d). No `FAQPage` structured data: Google shows FAQ rich results only for government and health sites since August 2023.

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
- **THEN** the six core routes are marked ready, and the sitemap lists `/`, `/seasons`, the 12 season pages, `/how-it-works`, `/sample-report` and `/color-analysis-gpt-alternative`, besides `/color-analysis-quiz` (quiz-page), `/privacy` and `/terms`: 20 URLs

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

`/color-analysis-gpt-alternative` SHALL have a section "Use Seasonly in ChatGPT and Claude" with the copy of the approved "Color analysis GPT alternative" board, plus the publisher line approved by the user on 2026-10-30. Both plugin directories link to this section as the plugin's public documentation. The section SHALL say:

- what the plugin does: it asks the four quiz questions and gives the season family and 6 of its colors, with a link to the photo analysis for the exact subtype;
- who publishes it: Oleg Gordienov, an individual in Bulgaria;
- that it takes no photo;
- how to add it: a link to each published directory listing, and the server address `https://seasonly.me/api/mcp` for a custom connector;
- where its data handling is described, with a link to the plugin section of `/privacy`.

The section SHALL have an anchor that the listings can link to. It SHALL state only what the plugin does at the time it ships: it SHALL NOT link to a directory listing that is not yet published.

#### Scenario: Reading the plugin section

- **WHEN** `/color-analysis-gpt-alternative` is rendered
- **THEN** it has a section with an anchor, titled "Use Seasonly in ChatGPT and Claude", that names the server address `https://seasonly.me/api/mcp`, says no photo is taken and links to `/privacy`

#### Scenario: The plugin section names the publisher

- **WHEN** `/color-analysis-gpt-alternative` is rendered
- **THEN** the plugin section says the plugin is published by Oleg Gordienov, an individual in Bulgaria

#### Scenario: The plugin section links its ChatGPT listing

- **WHEN** `/color-analysis-gpt-alternative` is rendered
- **THEN** the plugin section links `https://chatgpt.com/plugins/plugin_asdk_app_6acbdb86f03c81919029b7db183ef3dc`, and still names the server address `https://seasonly.me/api/mcp`

### Requirement: The sample report puts the palette first on a phone

Below 1024 px wide, `/sample-report` SHALL show its palette straight after the season name and tagline, as a report does. The sample banner SHALL stay above the season, and its own "Find my colors" action SHALL be secondary, so the page's first screen has no primary action beside the palette. On a 375 × 812 phone the palette SHALL start in the first screen: at least half of its first swatch SHALL show without scrolling, since the banner above it pushes a 3-column swatch past the fold.

#### Scenario: The sample on a phone

- **WHEN** `/sample-report` opens in a 375 × 812 window
- **THEN** at least half of the first palette swatch is inside the window without scrolling, below "Soft Autumn"

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

### Requirement: A season page shows the season's makeup and hair colors

Each season page SHALL show a "Makeup and hair" section after the metals and before the outfit ideas. It SHALL hold four groups, in this order: Lips, Blush, Eyes and Hair. Each group SHALL show that season's colors for it from the shared season palettes, with their names and hex codes, in the shared order. The section intro SHALL be the season's shared makeup line, and the Hair group SHALL open with the season's shared hair tip. A season page and a report for the same season therefore show the same makeup and hair colors and the same words for them.

#### Scenario: Makeup and hair match the report

- **WHEN** `/seasons/soft-autumn` is rendered
- **THEN** its "Makeup and hair" section lists exactly the lip, blush, eye and hair colors a Soft Autumn report lists, in the same order, with the same names and hex codes, under the Soft Autumn makeup line and with the Soft Autumn hair tip

#### Scenario: Every season shows its makeup and hair

- **WHEN** any of the 12 season pages is rendered
- **THEN** it shows the Lips, Blush, Eyes and Hair groups with that season's shared colors

### Requirement: A season page suggests three outfits from its own palette

Each season page SHALL show an "Outfit ideas" section after "Makeup and hair" and before the famous people. It SHALL hold three outfits, in this order: Everyday, Work and Evening. Each outfit SHALL be three colors, each with its name and hex code:

1. one of the season's 24 best colors, worn near the face;
2. one of the season's 6 best neutrals;
3. one of the season's metals to wear.

Every color SHALL be taken by name from that season's shared palette, so the page makes up no color and no hex code. No outfit color SHALL be one of the season's colors to avoid. The three outfits SHALL each use a different best color.

Under its colors, each outfit SHALL read as one sentence naming its three colors in lower case:

- Everyday: "A <best> top with <neutral> trousers and <metal> jewelry."
- Work: "A <best> blouse under a <neutral> jacket, with <metal> jewelry."
- Evening: "A <best> dress with <neutral> shoes and bag, and <metal> jewelry."

"A" becomes "An" before a color whose name starts with a vowel.

#### Scenario: Outfits use only the season's own colors

- **WHEN** any of the 12 season pages is rendered
- **THEN** it shows the Everyday, Work and Evening outfits, each with one of that season's best colors, one of its neutrals and one of its metals, with the palette's names and hex codes, none of them a color to avoid, and three different best colors

#### Scenario: An outfit reads as a sentence

- **WHEN** `/seasons/soft-autumn` is rendered
- **THEN** its Everyday outfit shows Sage, Oatmeal and Brushed Gold and reads "A sage top with oatmeal trousers and brushed gold jewelry."

#### Scenario: The new sections sit before the famous people

- **WHEN** any season page is rendered
- **THEN** "Makeup and hair" comes after "Best metals", "Outfit ideas" comes after "Makeup and hair", and the famous people come after "Outfit ideas"

### Requirement: A season page names more people from the same source

Under its three credited photos, each season page SHALL name three to six more public figures in one line: "The same studio also types <names> as <Season>s." Every name SHALL appear as that season in the same published color analysis the section already links as its source. These names SHALL have no photo. No name SHALL repeat one of the three figures with a photo, and no name SHALL appear twice. The note that these are readings of public photos and that no one shown endorses Seasonly SHALL come after this line, so it covers every name.

#### Scenario: The extra names

- **WHEN** any of the 12 season pages is rendered
- **THEN** after the three photos it names three to six more people, none of them one of the three with a photo and none twice, and the endorsement note comes after that line

#### Scenario: The extra names on Soft Autumn

- **WHEN** `/seasons/soft-autumn` is rendered
- **THEN** it reads "The same studio also types Angelina Jolie, Gigi Hadid, Hailey Bieber, Kate Moss, Gisele Bündchen and Jessica Biel as Soft Autumns."

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
