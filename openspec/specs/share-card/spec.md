# share-card Specification

## Purpose

Gives every season a share card: a PNG image of the season name, its highlight colors and the site address, sized for a 9:16 story and a 1:1 post. People post it, so it carries the address and nothing personal.

## Public Interface

```typescript
// apps/web/src/lib/share-card/index.tsx
export const RATIOS: readonly ["story", "post"];
export type Ratio = (typeof RATIOS)[number];
export const SIZES: Record<Ratio, { width: number; height: number }>; // 1080×1920, 1080×1080
export function shareCard(slug: SeasonSlug, ratio: Ratio): JSX.Element; // plain elements for next/og
export function shareCardAlt(slug: SeasonSlug, ratio: Ratio): string;

// apps/web/src/app/images/share/[season]/[ratio]/route.tsx
export const dynamicParams = false;
export function generateStaticParams(): { season: SeasonSlug; ratio: Ratio }[]; // 24
export const GET: (
  request: Request,
  ctx: { params: Promise<{ season: string; ratio: string }> },
) => Promise<Response>; // withErrorCapture, image/png
```

Shared with `palette-image`: `apps/web/src/lib/og/` (`OG_FONTS`, `OG_COLORS`, `EM` = 64 px, `kicker`, `seasonTitle`, `foot`, `ground`, `CHIP_EDGE`) and its committed static fonts (Bodoni Moda 500 at `opsz` 24, Instrument Sans 400 and 600, OFL). `lib/og/tree.ts` holds the test helpers `flatten`, `chipRows`, `findText`, `pngSize` and `inkRight`.

## Behavior

- The card is the design system's ShareCard (`.sn-share*` in `bundle.css`) at 1080 px wide, so 1 em is 64 px and a 1 px rule of the 270 px card is 4 px. It is full-bleed: no rounded corners or shadow.
- Every `display` is flex. The post card's 3 × 2 grid is two flex rows of three, each chip `flex: 1`.
- The story card's five rows share the list's height, at most 3 em each, so a season name on two lines ("Light Summer") never pushes the last color into the footer.
- The post card sets names at 0.55 em on one line and hex codes at 0.5 em (the design system has 0.75 em and 0.625 em), so the widest highlight name ("Bright Turquoise", about 278 px) fits its 285 px column. Redesigned 2026-10-07.
- Colors come from `tokens.json` through `OG_COLORS`; chips are filled with the palette hex.
- The routes render at build time (`generateStaticParams`, `dynamicParams = false`). GET also answers 404 for an unknown season or ratio, for `next dev` and draft mode.
- `next/og` serves the PNG with `Cache-Control: public, max-age=0, must-revalidate`, so a redeploy replaces a card at once.

## Edge Cases

- Fonts load by literal `new URL("./fonts/…", import.meta.url)`: with a template literal the bundler leaves a font out of the build and Satori silently falls back to the first font.
- A new or renamed highlight that is too wide for a post-card column fails `share-card.test.ts`, which draws every name in the renderer's own font.
- Thumbnail readability is checked by the user (approved 2026-10-07, https://claude.ai/artifact/TuXp87Dwy3C922KiUnkE9b).

## Requirements

### Requirement: Each season has a story card and a post card

For each of the 12 season slugs, `/images/share/<slug>/story` SHALL answer a 1080 × 1920 PNG and `/images/share/<slug>/post` a 1080 × 1080 PNG. Both SHALL be generated at build time, so a request never renders. Any other slug or ratio SHALL answer 404.

#### Scenario: Soft Autumn's story card

- **WHEN** `/images/share/soft-autumn/story` is requested
- **THEN** it answers 200 with `image/png`, and the image is 1080 pixels wide and 1920 high

#### Scenario: Every season and ratio

- **WHEN** the story and post card of each of the 12 slugs are rendered
- **THEN** each is a PNG, every story card is 1080 × 1920 and every post card 1080 × 1080

#### Scenario: An unknown season or ratio

- **WHEN** `/images/share/autumn/story` or `/images/share/soft-autumn/reel` is requested
- **THEN** it answers 404

### Requirement: A card shows the season, its highlights and the address, and nothing personal

A card SHALL show, from top to bottom:

- the kicker "My color season";
- the season's name, as the season pages write it ("Soft Autumn");
- its highlight colors: the first 5 on a story card as a list, all 6 on a post card in 3 columns and 2 rows, each as a chip of its exact color with its name and its uppercase hex code;
- the wordmark "Seasonly" and the address `seasonly.me`.

The ground SHALL be the `surface` token, and every text color SHALL come from the design tokens. The card SHALL show no face, no quiz answer, no confidence and no report id. Its layout SHALL follow the design system's ShareCard at 1080 pixels wide.

**Unenforced:** fidelity to the ShareCard layout is judged by the user, with the thumbnail check below.

#### Scenario: Soft Autumn's story card content

- **WHEN** Soft Autumn's story card is rendered
- **THEN** it holds "My color season", "Soft Autumn", Terracotta `#B4694F`, Deep Teal `#4C7774`, Camel `#C39D6F`, Dusty Rose `#C4918A` and Olive `#7B7848` in that order, each chip filled with its hex, then "Seasonly" and "seasonly.me"

#### Scenario: A post card shows six colors

- **WHEN** Soft Autumn's post card is rendered
- **THEN** it holds the same five colors followed by Mushroom `#A08F7E`, in two rows of three

### Requirement: A card's alt text names the season and its colors

Each card SHALL have an alt text: "My color season: <season name>. " followed by the names of the colors it shows, joined with ", " and ending with ".". A page that shows a card SHALL use it as the image's alt text.

#### Scenario: Soft Autumn's story card alt text

- **WHEN** the alt text of Soft Autumn's story card is read
- **THEN** it is "My color season: Soft Autumn. Terracotta, Deep Teal, Camel, Dusty Rose, Olive."

### Requirement: Cards stay readable as thumbnails

At about 120 pixels wide, the size of a feed or grid thumbnail, a card's season name, its colors and `seasonly.me` SHALL still read.

**Unenforced:** readability is a human judgment. The change's task list gates it on the user's approval of all 24 cards shown at 120 pixels wide.

#### Scenario: Cards at thumbnail size

- **WHEN** the 24 cards are shown to the user at 120 pixels wide
- **THEN** the user confirms that the season name, the colors and `seasonly.me` read on each
