## ADDED Requirements

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
