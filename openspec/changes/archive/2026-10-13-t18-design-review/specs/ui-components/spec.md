## MODIFIED Requirements

### Requirement: A swatch always shows its color's name and hex code

A swatch SHALL render one palette color as a color chip, the color's name and its hex code. The name and hex SHALL be real text. The hex SHALL be shown in uppercase, whatever case it was given in. The chip SHALL be hidden from assistive technology, so a screen reader reads the name and hex and never an unlabeled shape. A swatch SHALL accept the analysis core's palette color (`{ name, hex }`) as it is. A large size SHALL exist for a single hero color.

The name SHALL always take the height of two lines and SHALL break only between words, never inside one. So in a row of swatches every hex code sits on the same line, whether a name takes one line or two.

#### Scenario: A swatch renders

- **WHEN** a swatch is rendered for `{ name: "Terracotta", hex: "#b4694f" }`
- **THEN** its text contains "Terracotta" and "#B4694F", and its chip is hidden from assistive technology and filled with that color

#### Scenario: A large swatch renders

- **WHEN** a swatch is rendered at the large size
- **THEN** it still shows the name and the uppercase hex, and is marked as the large variant

#### Scenario: Hex codes line up

- **WHEN** a 4-column grid at 375 px shows "Plum Brown" beside "Copper"
- **THEN** both hex codes start at the same height

#### Scenario: A name never splits inside a word

- **WHEN** a 6-column grid about 800 px wide shows "Mushroom"
- **THEN** "Mushroom" is on one line

### Requirement: Step progress names the current step in text

The step progress SHALL show "Step n of 3" and the steps Photo, Quiz and Result as an ordered list in a navigation region labeled "Progress". The current step SHALL be marked as the current step for assistive technology. Each finished step SHALL show a check icon and say "(done)" to assistive technology, so progress is never told by color alone.

The step progress SHALL take an optional sub-step, such as question 2 of 4. With one, its count line SHALL read "Step n of 3 · Question m of k", and the current step's bar SHALL be filled by m out of k. Without one, the current step's bar is filled whole, as before.

#### Scenario: On the quiz

- **WHEN** the step progress renders with the second step current
- **THEN** it reads "Step 2 of 3", Quiz is marked as the current step, and Photo carries a check and a hidden "(done)"

#### Scenario: With a sub-step

- **WHEN** the step progress renders with the second step current and the sub-step question 1 of 4
- **THEN** it reads "Step 2 of 3 · Question 1 of 4", and the Quiz bar is filled a quarter

### Requirement: A quiz option is a native radio inside its label

A quiz option SHALL render a native radio input inside a label that holds the option's label and, when given, its description. Every other prop, such as `name`, `value`, `checked` and `onChange`, SHALL pass through to the input. When given an image source and alt text, the option SHALL show that image in its image slot, as the design system's QuizOption does. Without one, it SHALL show no slot.

#### Scenario: An option with a description

- **WHEN** a quiz option renders with name `veins`, value `green`, label "Green or olive" and description "Often a warm undertone"
- **THEN** it is a label holding a radio input named `veins` with value `green`, and the texts "Green or olive" and "Often a warm undertone"

#### Scenario: An option with an image

- **WHEN** a quiz option renders with an image source and the alt text "A wrist with green veins"
- **THEN** the label holds an image with that source and alt text

### Requirement: A photo tip card tells good from bad in words

A photo tip card SHALL show its title as a heading, its body, and examples: either one good and one bad example, or one good reference and several bad examples, each bad one with its own short caption. Each example SHALL be a figure with its image, or a labeled placeholder, and a caption that holds a verdict word and the example's caption. The verdict words SHALL be "Good" for a good example and "Avoid" for a bad one, each with an icon, so the verdict is never told by color alone.

#### Scenario: The light tip

- **WHEN** a tip card renders with the title "Face a window", the good caption "Facing a window" and the bad caption "Under a ceiling lamp"
- **THEN** it shows the heading "Face a window", "Good" with "Facing a window", and "Avoid" with "Under a ceiling lamp"

#### Scenario: One reference and three to avoid

- **WHEN** a tip card renders with one good example and three bad examples captioned "Ceiling lamp", "Foundation" and "Beauty filter"
- **THEN** it shows "Good" once and "Avoid" three times, each with its caption

### Requirement: A draping pair tells best from worst in words

DrapingPair SHALL render two frames side by side, the best color first. Each frame SHALL be filled with its color and hold the same face image, with the same source and alt text on both sides. The face SHALL sit in an oval with no ring or border between it and the color, zoomed so the face fills the oval. The frame's color SHALL rise in a curve over the bottom of the oval, the way a draped cloth meets the chin. Under each frame SHALL be:

- a verdict in words with an icon: "Best" with the check icon in the success color, or "Worst" with the cross icon in the danger color;
- the color's name;
- its uppercase hex code.

Without a face source, each frame SHALL show a slot labeled "Face" in place of the image.

#### Scenario: A pair with a face

- **WHEN** DrapingPair renders Terracotta `#b4694f` as best, Fuchsia `#CC2A7E` as worst, and a face source with alt text
- **THEN** the first frame is filled with `#b4694f` and reads "Best", "Terracotta" and "#B4694F"; the second is filled with `#CC2A7E` and reads "Worst", "Fuchsia" and "#CC2A7E"; and both hold an image with that source and alt text

#### Scenario: No ring around the face

- **WHEN** DrapingPair renders with a face source
- **THEN** the face oval has no border or shadow ring, and each frame holds a shape in its own color over the bottom of the oval

#### Scenario: A pair without a face

- **WHEN** DrapingPair renders with no face source
- **THEN** each frame shows a slot labeled "Face" and no image

## ADDED Requirements

### Requirement: A swatch strip shows chips and names them to screen readers

A swatch strip SHALL render a row of color chips with no visible names or hex codes, for a preview of colors whose names are one tap away. It SHALL be a list with an accessible label. Each chip SHALL carry its color's name as text that is visually hidden, so a screen reader reads every name. Chips SHALL be square and keep the 1px swatch edge.

#### Scenario: A season preview

- **WHEN** a swatch strip renders Pumpkin `#D2691E`, Peacock Teal `#1F6E6E`, Mustard `#CC9B2B` and Salmon `#E07B5A` with the label "True Autumn colors"
- **THEN** it is a list labeled "True Autumn colors" with four items, each filled with its color, whose accessible text is that color's name, and no hex code is visible
