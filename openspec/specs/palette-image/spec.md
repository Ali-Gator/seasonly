# palette-image Specification

## Purpose

Gives every season a palette image: a phone-sized PNG of the season's 30 colors, each with its name and hex code. People keep it on their phone for shopping.

## Public Interface

```typescript
// apps/web/src/lib/palette-image/index.tsx
export const SIZE: { width: 1080; height: 1920 };
export function paletteImage(slug: SeasonSlug): JSX.Element; // plain elements for next/og

// apps/web/src/app/images/palette/[season]/route.tsx
export const dynamicParams = false;
export function generateStaticParams(): { season: SeasonSlug }[]; // 12
export const GET: (
  request: Request,
  ctx: { params: Promise<{ season: string }> },
) => Promise<Response>; // withErrorCapture, image/png
```

Fonts, token colors and the kicker, title, footer and ground pieces come from `apps/web/src/lib/og/`, shared with `share-card`.

## Behavior

- The image is board "11b Palette image" (`project/PaletteImage.dc.html` on the MVP canvas, the design system's PaletteCard, `.sn-palette*`), approved 2026-10-07, at 1080 px wide: 1 em is 64 px.
- Two colors per row: 12 rows of best colors, then the "Neutrals" kicker and 3 rows of neutrals. The groups grow 12 : 3 and spread their rows over the height.
- Each cell is a 2 × 1.1 em chip and the name (0.5 em, one line) over the uppercase hex (0.45 em).
- The route renders at build time; GET also answers 404 for an unknown season, for `next dev` and draft mode.

## Edge Cases

- A palette name too wide for its cell (about 297 px) fails `palette-image.test.ts`, which draws all 30 names of every season in the renderer's own font. The widest today is under the limit.
- The report page's "Save my palette" button and its saved state ship with `t5-report-delivery`.

## Requirements

### Requirement: Each season has a palette image

For each of the 12 season slugs, `/images/palette/<slug>` SHALL answer a 1080 × 1920 PNG. It SHALL be generated at build time, so a request never renders. Any other slug SHALL answer 404.

#### Scenario: Soft Autumn's palette image

- **WHEN** `/images/palette/soft-autumn` is requested
- **THEN** it answers 200 with `image/png`, and the image is 1080 pixels wide and 1920 high

#### Scenario: Every season

- **WHEN** the palette image of each of the 12 slugs is rendered
- **THEN** each is a 1080 × 1920 PNG

#### Scenario: An unknown season

- **WHEN** `/images/palette/autumn` is requested
- **THEN** it answers 404

### Requirement: A palette image shows all 30 colors with names and hex codes

A palette image SHALL show:

- the kicker "My colors", then the season's name, as the season pages write it;
- its 24 best colors, then the heading "Neutrals" and its 6 neutrals, each in palette order;
- for each color, a chip of its exact color with its name and its uppercase hex code;
- the wordmark "Seasonly" and the address `seasonly.me`.

The ground SHALL be the `surface` token, and every text color SHALL come from the design tokens. The image SHALL show no face, no quiz answer, no confidence and no report id. Its layout SHALL follow the palette image artboard the user approved on the MVP canvas.

**Unenforced:** fidelity to the artboard is judged by the user. The change's task list gates the code on the artboard's approval, and the archive on the user's look at the rendered images.

#### Scenario: Soft Autumn's palette image content

- **WHEN** Soft Autumn's palette image is rendered
- **THEN** it holds "My colors", "Soft Autumn", then 24 colors from Soft Coral `#D88E77` to Spruce `#3E6366`, then "Neutrals" and 6 colors from Ivory Cream `#EDE3CF` to Espresso `#4A3A33`, all in palette order, each chip filled with its hex and labeled with its name and hex, then "Seasonly" and "seasonly.me"
