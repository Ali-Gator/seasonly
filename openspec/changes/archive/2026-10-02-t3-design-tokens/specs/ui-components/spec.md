## Purpose

Gives the web app the Seasonly design system's shared components (Button, Icon, Swatch, SwatchGrid, Note and ReportSection) with the props, markup and accessibility the design system defines. Pages built from the approved MVP canvas then show colors, verdicts and actions the same way everywhere.

## ADDED Requirements

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
