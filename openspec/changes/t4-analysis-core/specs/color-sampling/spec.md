## Purpose

Measures a person's coloring from one photo, inside the analysis core. It turns raw pixels, face landmarks and an optional hair mask into skin, eye, lip and hair colors, and reduces those to the three traits the season classifier reads: temperature, value and clarity.

## ADDED Requirements

### Requirement: Regions are sampled from pixels and face landmarks

Sampling SHALL take an RGBA pixel buffer with its width and height, the face-mesh landmarks in normalized image coordinates (468 points, or 478 with irises), and optionally a per-pixel hair mask of the same size. It SHALL return the CIELAB (D65) color of the skin (both cheeks and the forehead together), the eyes (irises), the lips and the hair. Each region's color SHALL come only from pixels inside that region. A region with fewer than 50 usable pixels SHALL be reported as absent rather than estimated. Hair SHALL be absent when no hair mask is given, and eyes SHALL be absent when only 468 landmarks (no irises) are given.

#### Scenario: A painted synthetic face

- **WHEN** a synthetic image paints each region a known flat color and its landmarks outline those regions
- **THEN** each sampled region color is within ΔE 2 of the color painted there

#### Scenario: No hair mask

- **WHEN** sampling runs without a hair mask
- **THEN** skin, eyes and lips are returned and hair is absent

#### Scenario: Landmarks with irises

- **WHEN** 478 landmarks are given instead of 468
- **THEN** sampling returns the same skin, lip and hair colors as with the first 468 of them, and eyes only with 478

### Requirement: Highlights and shadows do not move a region's color

A region's color SHALL be a robust central value of its pixels that ignores specular highlights and deep shadows. The brightest and darkest tenths of a region's pixels by lightness SHALL NOT shift its color.

#### Scenario: A highlight on the cheek

- **WHEN** a tenth of the skin region is replaced by near-white pixels
- **THEN** the sampled skin color moves by less than ΔE 1

#### Scenario: A shadow on the cheek

- **WHEN** a tenth of the skin region is replaced by near-black pixels
- **THEN** the sampled skin color moves by less than ΔE 1

### Requirement: Colors reduce to temperature, value and clarity

Sampling SHALL reduce the region colors to three traits, each a number from −1 to 1 rounded to three decimals: temperature (cool −1 to warm 1, from skin hue, eye and hair color), value (deep −1 to light 1, from skin, hair and eye lightness) and clarity (soft −1 to bright 1, from skin and eye chroma and the lightness contrast between skin, hair and eyes). Absent regions SHALL be left out of each trait rather than counted as zero. A warmer, lighter or more vivid input SHALL never produce a cooler, deeper or softer trait.

#### Scenario: Warmer skin

- **WHEN** two otherwise identical images differ only in a skin hue that is more yellow in the second
- **THEN** the second has the higher temperature

#### Scenario: Deeper coloring

- **WHEN** two otherwise identical images differ only in darker skin and hair in the second
- **THEN** the second has the lower value

#### Scenario: Higher contrast

- **WHEN** two otherwise identical images differ only in darker hair against the same skin in the second
- **THEN** the second has the higher clarity

#### Scenario: Traits stay in range

- **WHEN** any image is sampled, including pure black, pure white and saturated primaries in every region
- **THEN** each trait is between −1 and 1 with at most three decimals

### Requirement: A face too small to sample gives no traits

When the skin region has fewer usable pixels than the minimum, sampling SHALL return no traits instead of an estimate, so the caller falls back to the quiz.

#### Scenario: A tiny face

- **WHEN** the landmarks outline a face whose skin region covers fewer than 50 pixels
- **THEN** sampling returns no traits

### Requirement: Malformed input is refused

Sampling SHALL refuse, with an error naming the problem, a pixel buffer whose length is not width × height × 4, a landmark list that is not 468 or 478 points long, and a hair mask whose length is not width × height. Landmarks outside the image SHALL be clipped to it, not refused.

#### Scenario: A buffer of the wrong size

- **WHEN** the pixel buffer is one byte shorter than width × height × 4
- **THEN** sampling throws an error that names the buffer length

#### Scenario: Too few landmarks

- **WHEN** 100 landmarks are given
- **THEN** sampling throws an error that names the landmark count

#### Scenario: A face partly outside the frame

- **WHEN** some landmarks fall outside the image
- **THEN** sampling uses only the pixels inside the image and does not throw

### Requirement: Sampling leaves its input untouched

Sampling SHALL NOT modify the pixel buffer, the landmarks or the hair mask it is given.

#### Scenario: The buffer after sampling

- **WHEN** an image is sampled
- **THEN** its pixel buffer, landmarks and hair mask are byte-for-byte what they were before
