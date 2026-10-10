# report-page Specification

## Purpose

Shows a person's full report at its unguessable link, `/r/<id>`, from the record the analysis stored: the 12-season subtype, the 30 colors, what to avoid, neutrals, metals, makeup and hair, and the draping preview. It is also where the share card and the palette image leave the site.

## Public Interface

```typescript
// apps/web/src/lib/report/read.ts (server only; imports sentry.server.config)
export interface StoredReport {
  season: SeasonSlug;
  agreement: Agreement;
  textSource: TextSource;
  summary: string | null;
  agreementNote: string | null; // personal only
  email: string | null; // the latest address
  interested: boolean;
}
export function readReport(
  id: string,
  opts?: { select?: ReportSelect },
): Promise<StoredReport | null>; // throws "report read failed"

// apps/web/src/lib/report/view.tsx (server component)
export function ReportView(props: { id: string; report: StoredReport }): JSX.Element;

// apps/web/src/lib/report/draping.tsx, actions.tsx (client islands)
export function ReportDraping(props: { id: string; best: Swatch; worst: Swatch }): JSX.Element;
export function DrapingView(props: {
  id: string;
  best: Swatch;
  worst: Swatch;
  deleted: boolean;
}): JSX.Element;
export function ShareButton(props: {
  slug;
  season;
  alts: { story; post };
  label?;
  variant?;
  block?;
  className?;
}): JSX.Element;
export function SaveButton(props: { slug: SeasonSlug }): JSX.Element;

// apps/web/src/lib/report/share.ts
export function fileFor(url: string, name: string): Promise<File | null>; // fetched once per page; a failure is retried
export function shareSeason(input: { nav; file; season }): Promise<"shared" | "panel" | "idle">;
export function savePalette(input: { nav; file; slug; download }): Promise<"saved" | "idle">;

// apps/web/src/app/(report)/r/[id]/page.tsx
export const dynamic = "force-dynamic";
export function generateMetadata(props): Promise<Metadata>; // noindex
export default function ReportPage(props: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element>;
// error.tsx: board 10c, "Reload"; not-found.tsx: the 404 under the wordmark header
```

## Behavior

- `/r/[id]` lives in its own `(report)` route group with no layout chrome: the view draws its own header (the wordmark with a ghost "Share" on a phone, the wordmark with the report's address from 1024 px).
- The page refuses an id that fails `REPORT_ID` with `notFound()` before any read. `readReport` makes one PostgREST select that embeds the latest `report_emails` row (ordered and limited on the embed) and `interest_clicks`, through `withTimeout` (3 s). A failure is captured and flushed, then thrown, so `error.tsx` answers 500.
- One DOM in phone reading order: the season block, the sections, the Premium card, the actions and the footer. From `lg` a 12-column grid with rows `auto auto auto auto 1fr` puts the season block, actions, Premium card and footer in columns 1–4, and the sections in columns 6–12 across every row. Swatch grids go to 6 columns there.
- Personal text replaces the summary and the note body only when `textSource` is `personal`. The note's icon is a check for `agree`, info otherwise.
- `ReportDraping` reads the rendered images in an effect: an image already failed before hydration (`complete && naturalWidth === 0`), or a later `error` event, switches to `DrapingView` with `deleted`.
- The share and save buttons prefetch the story card and the palette PNG as Files on mount, so the tap calls `navigator.share` with its activation intact. Where `canShare({ files })` is false, Share opens the `<dialog>` panel of board 10e (both PNGs with `shareCardAlt` as alt text and download links), and Save clicks a hidden download link. An `AbortError` changes nothing.
- The Premium card gets the stored address only once interest exists, so a report nobody has tapped holds no address in its HTML.
- `shareCardAlt` lives in `lib/share-card/alt.ts`, so the page does not load the card fonts.
- Checked on a preview deployment 2026-10-09: 200 with `private, no-cache, no-store, max-age=0, must-revalidate` and `X-Robots-Tag: noindex`. A forced read failure answered 500 with board 10c and reached Sentry from `withTimeout`; `onRequestError` did not fire on Vercel.

## Edge Cases

- Any failure to load the face, a 404 or a 500, shows the same line, which does not claim a deletion.
- The footer says the photo is deleted within 24 hours. The daily retention job (`data-retention`) deletes it, up to about 49 h in the worst case (backlog).
- In CI there is no database, so a well-formed id answers 500 (the E2E asserts this) and only a malformed id reaches the 404.

## Requirements

### Requirement: A stored report renders the canvas report

`/r/<id>` for a stored report SHALL render canvas artboard "10 Full report · 375" for the record's season: the season block (name, tagline, summary, undertone, chroma, contrast and the agreement note), then six numbered sections (palette, colors to avoid, best neutrals, metals, makeup and hair, draping preview), then the Premium card, "Share my season", "Save my palette" and the footer. Every color SHALL show its name and hex code.

#### Scenario: A Soft Autumn report

- **WHEN** `/r/<id>` is opened for a stored Soft Autumn photo report
- **THEN** it shows the overline "Your season", "Soft Autumn" and "Warm, soft and earthy."
- **AND** the sections read "Section 1 of 6 · Your palette" (24 colors, Soft Coral `#D88E77` first), "Section 2 of 6 · Colors to avoid", "Section 3 of 6 · Your best neutrals" (6 colors, Espresso `#4A3A33` last), "Section 4 of 6 · Your metals" ("Wear" and "Go easy on"), "Section 5 of 6 · Makeup and hair" (lips, blush, eyes, the hair tip and hair) and "Section 6 of 6 · Draping preview", in that order

### Requirement: The report gives exactly the 30 promised colors

The palette and neutrals sections together SHALL show 30 distinct colors for every season, as the reveal and the email step promise.

#### Scenario: Every season

- **WHEN** the report is rendered for each of the 12 seasons
- **THEN** the palette shows 24 colors and the neutrals 6, with no color in both

### Requirement: Personal text replaces the static copy

When the record's text source is `personal`, the report SHALL show the stored summary in place of the season's static summary, and the stored agreement note in place of the static note body. The note's title SHALL always be the agreement case's static title. With any other text source, the report SHALL show the static copy.

#### Scenario: A personal report

- **WHEN** a record with source `personal` and summary "Your warm hazel eyes…" is opened
- **THEN** the summary paragraph reads "Your warm hazel eyes…" and the note's title is its agreement case's title

#### Scenario: A fallback report

- **WHEN** a record with source `capped` is opened
- **THEN** the summary is the season's static summary

### Requirement: The draping preview shows the stored face

A photo report's draping section SHALL show the season's best and worst draping colors on the face from `/api/face/<id>`, with the season's draping line as its intro. When the face cannot be loaded for any reason, the section SHALL show the two colors without a face and say "We couldn't load your photo, so this shows the two colors only." The reason may be a deleted crop or a failed request. The line SHALL NOT claim the photo was deleted, because inside the 24-hour window a failed request does not mean it was.

#### Scenario: A stored crop

- **WHEN** a photo report is opened and its crop is stored
- **THEN** both frames show the image from `/api/face/<id>`, best first

#### Scenario: The crop is gone

- **WHEN** `/api/face/<id>` answers 404 for a photo report
- **THEN** both frames show the face slot without an image, and the section says "We couldn't load your photo, so this shows the two colors only."

#### Scenario: The face request fails

- **WHEN** `/api/face/<id>` answers 500 for a photo report
- **THEN** the section shows the same two colors and the same line, and does not say the photo was deleted

### Requirement: A quiz-only report has no draping section

A report with no photo SHALL leave out the draping section and number the others "of 5". It SHALL say in the agreement note that it comes from the quiz alone.

#### Scenario: A quiz-only report

- **WHEN** a quiz-only report is opened
- **THEN** it shows five sections, the last "Section 5 of 5 · Makeup and hair", and no request is made to `/api/face/`

### Requirement: Share my season hands over the share cards

"Share my season" SHALL hand the season's 9:16 card (`/images/share/<slug>/story`) to the phone's share sheet, with the text "My color season: <Season>. Find yours at seasonly.me", where the browser can share files. Elsewhere it SHALL open a closable panel titled "Share my season", saying "Download a card, then post it from your photos.", that shows both cards (story and post) with their alt text, each with a "Download" button. Cancelling the share sheet SHALL change nothing.

#### Scenario: A phone that shares files

- **WHEN** a person on a browser that can share PNG files chooses "Share my season" on a Soft Autumn report
- **THEN** the share sheet opens with the Soft Autumn story card

#### Scenario: A desktop browser

- **WHEN** the browser cannot share files
- **THEN** both cards are shown with their alt text and a download each

### Requirement: Save my palette saves the palette image

"Save my palette" SHALL hand the season's palette image (`/images/palette/<slug>`) to the share sheet where the browser can share files, and otherwise download it as `seasonly-<slug>-palette.png`. Once handed over, the button SHALL read "Saved" with a check icon and be disabled. A cancelled share sheet or a failed download SHALL leave the button as it was.

#### Scenario: Saved

- **WHEN** the download of the Soft Autumn palette image starts
- **THEN** the file is `seasonly-soft-autumn-palette.png` and the button reads "Saved", disabled

#### Scenario: Cancelled

- **WHEN** the person closes the share sheet without choosing
- **THEN** the button still reads "Save my palette"

### Requirement: The footer says where the report lives

The footer SHALL say "This report stays at seasonly.me/r/<id>." and "Seasons describe colors, not people. If a color you love isn't here, wear it away from your face." A photo report's footer SHALL also say "Your photo is deleted within 24 hours of your analysis."

#### Scenario: A quiz-only report's footer

- **WHEN** a quiz-only report is opened
- **THEN** the footer has no line about a photo

### Requirement: The report has a wide layout

From 1024 px wide, the report SHALL follow canvas artboard "10 Full report · 1280": the season, the agreement note, the actions and the Premium card in a left column, and the sections in a right column.

#### Scenario: A desktop window

- **WHEN** the report is opened 1280 px wide
- **THEN** the season name and "Share my season" sit to the left of "Section 1 of 6"

### Requirement: An unknown report answers 404

A malformed id SHALL answer 404 without a database request. A well-formed id with no report SHALL answer 404. Both SHALL carry `noindex`.

#### Scenario: A malformed id

- **WHEN** `/r/short` is requested
- **THEN** it answers 404 and the reports are not read

### Requirement: A failed read is an error, reported to Sentry

When the report cannot be read (a database error, or no answer within 3 s), the page SHALL answer 500 with an error page that offers to reload, and the failure SHALL reach Sentry before the response ends. This SHALL NOT rely on the framework's request-error hook.

#### Scenario: The database is down

- **WHEN** reading the report fails
- **THEN** the page answers 500, the error page offers to reload, and Sentry receives the error

### Requirement: A report is never kept by a shared cache

Each request SHALL render the report from the stored record, and the response SHALL tell shared caches not to store it.

#### Scenario: The response headers

- **WHEN** a stored report is requested
- **THEN** its `Cache-Control` includes `private` and `no-store`
