# ui-components Specification

## Purpose

Gives the web app the Seasonly design system's shared components (Button, Icon, Swatch, SwatchGrid, Note and ReportSection) with the props, markup and accessibility the design system defines. Pages built from the approved MVP canvas then show colors, verdicts and actions the same way everywhere.

## Public Interface

```typescript
// apps/web/src/components/ds/, imported as "@/components/ds"
import type { Swatch as Color } from "@seasonly/analysis"; // { name, hex }

export type IconName =
  | "check"
  | "cross"
  | "lock"
  | "camera"
  | "upload"
  | "sun"
  | "clock"
  | "trash"
  | "mail"
  | "info"
  | "arrow-right";
export interface IconProps {
  name: IconName;
  size?: number;
  label?: string;
  className?: string;
}
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost"; // default "primary"
  block?: boolean; // full column width
  href?: string; // renders next/link
}
export interface SwatchProps extends Color {
  size?: "md" | "lg";
  className?: string;
}
export interface SwatchGridProps {
  colors: readonly Color[];
  columns?: number;
  label?: string;
  className?: string;
}
export interface NoteProps {
  tone?: "neutral" | "danger" | "success";
  title?: string;
  icon?: IconName;
  children?: ReactNode;
  className?: string;
}
export interface ReportSectionProps {
  title: string;
  overline?: string;
  intro?: string;
  id?: string;
  children?: ReactNode;
  className?: string;
}

export type DrapingPairProps = {
  best: Color;
  worst: Color;
  className?: string;
} & ({ faceSrc: string; faceAlt: string } | { faceSrc?: undefined; faceAlt?: undefined });

export function Button(props: ButtonProps): JSX.Element;
export function Icon(props: IconProps): JSX.Element;
export function Swatch(props: SwatchProps): JSX.Element;
export function SwatchGrid(props: SwatchGridProps): JSX.Element;
export function Note(props: NoteProps): JSX.Element;
export function ReportSection(props: ReportSectionProps): JSX.Element;
export function DrapingPair(props: DrapingPairProps): JSX.Element; // the face is /api/face/<report id> (draping-preview)
```

Styles: `apps/web/src/components/ds/ds.css`, imported once from `globals.css` right after Tailwind.

## Behavior

Each component is a JSX port of its function in the design system's `bundle.js` (https://claude.ai/artifact/E11hciU9VsyCxTFnJJNbHD, `project/components/`), typed from its `index.d.ts`. Element types, class names, ARIA attributes, defaults and icon path data match the bundle. Two things differ:

- A Button with `href` renders `next/link`, so navigation stays client-side. Every other prop passes through, `aria-disabled` included.
- Swatches take the analysis core's `Swatch` type, so a `PALETTES` entry renders without mapping.

They are server components: no state, no effects, no `"use client"`. ReportSection uses `useId()` for its heading id when no `id` is given.

`ds.css` holds the `bundle.css` rules for these components and the layout classes `.sn-card`, `.sn-stack` and `.sn-slot`, all inside `@layer components`. The `.sn-btn` base, primary, secondary, block and focus rules stay in `globals.css` with the site chrome. `globals.css` comes later in the same layer, so some `ds.css` selectors carry extra specificity to win as they do in `bundle.css`:

- `.sn-btn.sn-btn--ghost` beats the base `text-decoration: none`.
- The `:hover` forms of the disabled rules beat the variant hovers.

## Edge Cases

- Lowercase hex: shown uppercase; the chip's background uses the hex as given.
- No grid label: the list renders without `aria-label`.
- Empty `id` on ReportSection: falls back to `useId()`, so the region is never labeled by `""`.
- A Note with no title and no body: shows only its icon. Callers always pass words; the tone needs them.
- `disabled` with `href`: passed to the `<a>`, where it has no effect, as in the bundle. Use no `href` for a disabled action.
- Classes rendered only as hooks, with no rule: `sn-note--neutral` (neutral is the base `.sn-note`) and `sn-report__overline` (styled by `.overline`).

## Requirements

### Requirement: A swatch always shows its color's name and hex code

A swatch SHALL render one palette color as a color chip, the color's name and its hex code. The name and hex SHALL be real text. The hex SHALL be shown in uppercase, whatever case it was given in. The chip SHALL be hidden from assistive technology, so a screen reader reads the name and hex and never an unlabeled shape. A swatch SHALL accept the analysis core's palette color (`{ name, hex }`) as it is. A large size SHALL exist for a single hero color.

#### Scenario: A swatch renders

- **WHEN** a swatch is rendered for `{ name: "Terracotta", hex: "#b4694f" }`
- **THEN** its text contains "Terracotta" and "#B4694F", and its chip is hidden from assistive technology and filled with that color

#### Scenario: A large swatch renders

- **WHEN** a swatch is rendered at the large size
- **THEN** it still shows the name and the uppercase hex, and is marked as the large variant

### Requirement: A swatch grid shows every color of a list in order

A swatch grid SHALL render one swatch per color, in the order given, as a list that carries the grid's accessible label. It SHALL lay the swatches out in the number of columns asked for, and in 4 columns when none is given.

#### Scenario: A season's palette renders as a grid

- **WHEN** a swatch grid is rendered with the 24 best colors of a season in `PALETTES`, the label "Your Soft Autumn palette" and 4 columns
- **THEN** it is one list labeled "Your Soft Autumn palette" with 24 items, the nth showing the nth color's name and uppercase hex

#### Scenario: No column count is given

- **WHEN** a swatch grid is rendered without a column count
- **THEN** it lays out in 4 columns

### Requirement: A button is a link when it navigates and a button when it acts

A button SHALL come in the design system's three variants (primary, secondary and ghost), with primary as the default. It SHALL take the full column width when asked. With a destination, it SHALL render a link to that destination. Without one, it SHALL render a native button that does not submit a form unless a submit type is given. A disabled or `aria-disabled` button SHALL keep its label and that attribute, and show the disabled style.

#### Scenario: A button without a destination

- **WHEN** a button is rendered without a destination
- **THEN** it is a native button with type `button`, in the primary variant

#### Scenario: A button with a destination

- **WHEN** a ghost button is rendered with destination `/analyze` at full width
- **THEN** it is a link to `/analyze` in the ghost variant at full width

#### Scenario: A disabled button

- **WHEN** a button labeled "Analyzing your photo" is rendered with `aria-disabled="true"`
- **THEN** it keeps `aria-disabled="true"` and its label text

### Requirement: An icon is decorative unless it is labeled

An icon SHALL draw one of the design system's named glyphs (`check`, `cross`, `lock`, `camera`, `upload`, `sun`, `clock`, `trash`, `mail`, `info`, `arrow-right`) in the current text color, at a given pixel size (16 by default). Without a label it SHALL be hidden from assistive technology. With a label it SHALL be an image with that label as its accessible name.

#### Scenario: A decorative icon

- **WHEN** an icon is rendered without a label
- **THEN** it is hidden from assistive technology

#### Scenario: A labeled icon

- **WHEN** an icon is rendered with the label "Locked"
- **THEN** it is an image whose accessible name is "Locked"

### Requirement: A note never conveys its tone by color alone

A note SHALL show an optional title and a body, in a neutral, danger or success tone (neutral by default). Every note SHALL show an icon: the one asked for, or by default `cross` for danger, `check` for success and `info` for neutral. The title and body SHALL be real text, so a danger or success note always carries words as well as color.

#### Scenario: A danger note

- **WHEN** a danger note is rendered with the title "Too dark" and the body "This photo is too dark to read your skin tone."
- **THEN** it shows the `cross` icon, the title and the body as text, and is marked with the danger tone

#### Scenario: A note with a chosen icon

- **WHEN** a neutral note is rendered with the icon `sun` and the title "Retake tip"
- **THEN** it shows the `sun` icon, not the default `info`

### Requirement: A report section is labeled by its title

A report section SHALL render its title as a second-level heading and SHALL be a region labeled by that heading. Its optional overline SHALL come before the heading, and its optional intro and content after it. Two sections on one page SHALL each be labeled by their own heading.

#### Scenario: Two report sections on one page

- **WHEN** two report sections titled "Your best neutrals" and "Colors to avoid" are rendered on one page
- **THEN** each is a region whose accessible name is its own title

### Requirement: Every class a component renders has a design-system style

Every class name these components render SHALL have a rule in the web app's stylesheets, copied from the design system's `bundle.css`. The exception is a class the design system renders only as a hook, with no rule of its own (`sn-note--neutral`, `sn-report__overline`). Such a class SHALL be listed by name as a hook. The component stylesheet SHALL take every color from the design-token variables. It SHALL NOT request any external resource. The layout classes artboards use directly (`.sn-card`, `.sn-stack`, `.sn-slot`) SHALL be defined too.

#### Scenario: A component class has no rule

- **WHEN** a component renders a class name that no rule in the web app's stylesheets defines and that is not listed as a hook, or `.sn-card`, `.sn-stack` or `.sn-slot` is not defined
- **THEN** the unit suite fails, naming the class

#### Scenario: A color is hard-coded

- **WHEN** the component stylesheet contains a hex, `rgb()` or `rgba()` color literal
- **THEN** the unit suite fails, naming it

#### Scenario: A stylesheet loads an external resource

- **WHEN** the component stylesheet contains an `@import` or `url()` that points to another origin
- **THEN** the unit suite fails, naming it

### Requirement: Step progress names the current step in text

The step progress SHALL show "Step n of 3" and the steps Photo, Quiz and Result as an ordered list in a navigation region labeled "Progress". The current step SHALL be marked as the current step for assistive technology. Each finished step SHALL show a check icon and say "(done)" to assistive technology, so progress is never told by color alone.

#### Scenario: On the quiz

- **WHEN** the step progress renders with the second step current
- **THEN** it reads "Step 2 of 3", Quiz is marked as the current step, and Photo carries a check and a hidden "(done)"

### Requirement: A quiz option is a native radio inside its label

A quiz option SHALL render a native radio input inside a label that holds the option's label and, when given, its description. Every other prop, such as `name`, `value`, `checked` and `onChange`, SHALL pass through to the input.

#### Scenario: An option with a description

- **WHEN** a quiz option renders with name `veins`, value `green`, label "Green or olive" and description "Often a warm undertone"
- **THEN** it is a label holding a radio input named `veins` with value `green`, and the texts "Green or olive" and "Often a warm undertone"

### Requirement: A camera frame shows its view, a hidden guide and its caption

A camera frame SHALL render a figure holding its view, the face guide oval and the caption. The view is a live video or an image passed in by the caller, or a labeled placeholder when nothing is passed. The oval SHALL be hidden from assistive technology. The caption SHALL be the figure's caption. The guide SHALL be left out when it is turned off.

#### Scenario: A frame with a caption

- **WHEN** a camera frame renders with the caption "Fit your face in the oval, at eye level. Hold still."
- **THEN** it is a figure whose caption is that text, with a guide oval hidden from assistive technology

#### Scenario: No guide

- **WHEN** a camera frame renders with the guide turned off
- **THEN** it has no guide oval

### Requirement: A photo tip card tells good from bad in words

A photo tip card SHALL show its title as a heading, its body, and two examples, a good one and a bad one. Each example SHALL be a figure with its image, or a labeled placeholder, and a caption that holds a verdict word and the example's caption. The verdict words SHALL be "Good" for the good example and "Avoid" for the bad one, each with an icon, so the verdict is never told by color alone.

#### Scenario: The light tip

- **WHEN** a tip card renders with the title "Face a window", the good caption "Facing a window" and the bad caption "Under a ceiling lamp"
- **THEN** it shows the heading "Face a window", "Good" with "Facing a window", and "Avoid" with "Under a ceiling lamp"

### Requirement: A draping pair tells best from worst in words

DrapingPair SHALL render two frames side by side, the best color first. Each frame SHALL be filled with its color and hold the same face image, with the same source and alt text on both sides. Under each frame SHALL be:

- a verdict in words with an icon: "Best" with the check icon in the success color, or "Worst" with the cross icon in the danger color;
- the color's name;
- its uppercase hex code.

Without a face source, each frame SHALL show a slot labeled "Face" in place of the image.

#### Scenario: A pair with a face

- **WHEN** DrapingPair renders Terracotta `#b4694f` as best, Fuchsia `#CC2A7E` as worst, and a face source with alt text
- **THEN** the first frame is filled with `#b4694f` and reads "Best", "Terracotta" and "#B4694F"; the second is filled with `#CC2A7E` and reads "Worst", "Fuchsia" and "#CC2A7E"; and both hold an image with that source and alt text

#### Scenario: A pair without a face

- **WHEN** DrapingPair renders with no face source
- **THEN** each frame shows a slot labeled "Face" and no image
