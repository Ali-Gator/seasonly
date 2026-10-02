# color-sampling Specification

## Purpose

Measures a person's coloring from one photo, inside the analysis core. It turns raw pixels, face landmarks and an optional hair mask into skin, eye, lip and hair colors, and reduces those to the three traits the season classifier reads: temperature, value and clarity.

## Public Interface

```typescript
// packages/analysis/src/sampling/index.ts, re-exported from @seasonly/analysis
export interface PhotoInput {
  pixels: Uint8ClampedArray; // RGBA, row-major, width × height × 4
  width: number;
  height: number;
  landmarks: readonly { x: number; y: number }[]; // normalized; 468, or 478 with irises
  hairMask?: Uint8Array; // width × height; non-zero = hair
}
export interface Lab {
  L: number;
  a: number;
  b: number;
}
export interface RegionColors {
  skin: Lab | null;
  eyes: Lab | null;
  lips: Lab | null;
  hair: Lab | null;
}
export interface Traits {
  temperature: number;
  value: number;
  clarity: number;
} // each −1..1, 3 decimals
export interface Sample {
  regions: RegionColors;
  traits: Traits | null;
}
export const MIN_REGION_PIXELS = 50;
export const REGIONS: { forehead; rightCheek; leftCheek; lips; rightIris; leftIris }; // landmark index rings
export function samplePhoto(input: PhotoInput): Sample;
export function traitsOf(regions: RegionColors): Traits | null;
export function srgbToLab(r: number, g: number, b: number): Lab; // D65
export function deltaE(p: Lab, q: Lab): number; // CIE76
```

## Behavior

Each region is a set of landmark index rings. Lips and irises come from MediaPipe's `FACEMESH_LIPS` and `FACEMESH_*_IRIS`; the cheeks and forehead were chosen on the canonical face model, since MediaPipe defines none (`sampling/regions.ts` cites both). A pixel belongs to a region when its center lies inside an odd number of its rings. Skin is both cheeks and the forehead; skin and lips skip pixels the hair mask marks. Hair is every masked pixel in the image.

A region's color is its pixels sorted by L* (ties by position), the top and bottom tenth dropped, then the per-channel median. Regions over 20,000 pixels are sampled at an even stride first.

Traits are weighted means of normalized terms (`sampling/traits.ts`, every constant provisional until `t6-eval-set` tunes them): temperature from skin and hair hue, each hue's weight scaled down below chroma 10; value from skin, hair and eye lightness; clarity from skin and eye chroma and how much darker the hair or eyes are than the skin. Absent regions drop out of each mean.

## Edge Cases

- No skin region (face too small or outside the frame): `traits` is null; the caller falls back to the quiz.
- Black, grey or white hair: its hue barely counts toward temperature.
- Hair lighter than the skin: adds no contrast, so clarity reads soft.
- Landmarks outside the image: clipped; only in-frame pixels count.
- Wrong buffer, landmark or mask length: `RangeError` naming the number.

## Requirements

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

Sampling SHALL reduce the region colors to three traits, each a number from −1 to 1 rounded to three decimals: temperature (cool −1 to warm 1, from skin and hair hue), value (deep −1 to light 1, from skin, hair and eye lightness) and clarity (soft −1 to bright 1, from skin and eye chroma and how much darker the hair or eyes are than the skin). Absent regions SHALL be left out of each trait rather than counted as zero. A hue with almost no chroma (black, grey or white hair) SHALL count for less, so rounding noise in its angle cannot swing temperature. A skin or hair hue turned toward yellow at the same chroma, a lighter skin, hair or eye color, or a more vivid skin or eye color SHALL never produce a cooler, deeper or softer trait.

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
