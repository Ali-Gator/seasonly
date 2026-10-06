# photo-check Specification

## Purpose

Decides, inside the analysis core, whether a selfie is usable for color analysis before it is sampled. It names the one problem to fix (no face, too dark, tinted light, or a filter) and gives the retake tip for it, so a bad photo gets a retake instead of a wrong season.

## Public Interface

```typescript
// packages/analysis/src/photo-check/, re-exported from @seasonly/analysis
export type PhotoProblem = "no-face" | "dark" | "tint" | "filter";
export interface PhotoMeasures {
  faceWidth: number | null; // pixels, landmark bounding box
  eyeWhite: Lab | null; // null when unmeasurable
  skin: Lab | null; // as color sampling measures it
}
export interface PhotoCheck {
  problem: PhotoProblem | null;
  measures: PhotoMeasures;
}
export type PhotoCheckInput = Omit<PhotoInput, "landmarks"> & {
  landmarks: PhotoInput["landmarks"] | null; // null = no face detected
};
export function checkPhoto(input: PhotoCheckInput): PhotoCheck;
export const MIN_FACE_WIDTH = 120;
export const EYE_OPENINGS: { right; left }; // landmark index rings
export interface RetakeTip {
  title: string;
  message: string; // what is wrong
  tip: string; // how to retake
  icon: "info" | "sun" | "camera";
}
export const RETAKE_TIPS: Record<PhotoProblem, RetakeTip>;
```

## Behavior

The check runs before sampling, on the same input. In order:

1. No landmarks: the refusals that need none (width, height, buffer and hair-mask length, with sampling's messages), then `no-face` with every measurement null.
2. `samplePhoto` validates the input and gives the skin color.
3. `no-face` when a landmark is outside the image or not a number, the landmark bounding box is narrower than `MIN_FACE_WIDTH`, or sampling gives no traits.
4. The eye white: the pixels inside both eye openings (MediaPipe's `FACEMESH_RIGHT_EYE` and `FACEMESH_LEFT_EYE`, cited in `photo-check/index.ts`), the brightest 40% by L*, then sampling's robust center. Fewer than `MIN_REGION_PIXELS` pixels leaves it null and skips the next two checks. `dark` when its L* is below 25, then `tint` when its C*ab is above 25.
5. `filter` when skin C*ab is below 2 or above 45, or, from C*ab 6 up, its hue is outside 15° to 100°.

The first problem found is returned with the measurements gathered so far. Every limit is provisional until `t6-eval-set` tunes it; the skin limits are set against the Monk Skin Tone scale (C*ab 3.8 to 27.9, hue 49° to 89°). `RETAKE_TIPS` holds the copy of the approved canvas screens `BadNoFace`, `BadDark`, `BadTint` and `BadFilter`; the shared heading and buttons belong to the web flow.

## Edge Cases

- Eyes closed or squinting: no eye white, so no `dark` or `tint`; the filter check still runs.
- Deep skin in good light: passes, since darkness is read from the eye whites, never from skin lightness.
- Near-gray deep skin (C*ab below 6): its unstable hue is ignored.
- A warm color filter that also yellows the sclera: reported as `tint`, with the lamp tip.
- 468 landmarks, no irises: checked the same way.
- Wrong buffer, landmark or mask length: `RangeError` naming the number, as in sampling.

## Requirements

### Requirement: The check reports at most one of four problems

The photo check SHALL take the same RGBA pixel buffer, width and height as color sampling, plus the landmarks of one face, or none when no face was detected. It SHALL return either no problem or exactly one of `no-face`, `dark`, `tint` and `filter`. The four SHALL be checked in that order, and the first that applies SHALL be the one reported. Every result SHALL also carry the measurements it was judged by: the face width in pixels, the eye-white color and the skin color, each absent when it could not be measured.

#### Scenario: A good photo

- **WHEN** a synthetic face with natural skin, neutral eye whites and no color cast is checked
- **THEN** no problem is reported, and the face width, eye-white color and skin color are all present

#### Scenario: A photo with two problems

- **WHEN** a photo is both too dark and tinted
- **THEN** only `dark` is reported

### Requirement: A missing, small or cut-off face is reported as no face

The check SHALL report `no-face` when no landmarks are given, when the face is narrower than the minimum face width, or when any landmark falls outside the image.

#### Scenario: No face detected

- **WHEN** the check runs with no landmarks
- **THEN** `no-face` is reported and the face width is absent

#### Scenario: A face too small

- **WHEN** the face is narrower than the minimum face width
- **THEN** `no-face` is reported

#### Scenario: A face partly out of frame

- **WHEN** some landmarks fall outside the image
- **THEN** `no-face` is reported

### Requirement: A photo that passes can be sampled

When the check reports no problem, color sampling of the same pixels and landmarks SHALL return traits.

#### Scenario: Sampling a passed photo

- **WHEN** a photo passes the check
- **THEN** color sampling of the same input returns traits, not none

### Requirement: Darkness is judged from the eye whites, not the skin

The check SHALL report `dark` when the eye whites are darker than the minimum lightness. It SHALL NOT judge darkness from skin lightness, so deep skin in good light passes.

#### Scenario: A light-skinned face, underexposed

- **WHEN** a photo of a light-skinned face that passes is darkened to a third of its brightness
- **THEN** `dark` is reported

#### Scenario: A deep-skinned face in good light

- **WHEN** a face with the deepest Monk Skin Tone and bright neutral eye whites is checked
- **THEN** no problem is reported

### Requirement: A color cast is judged from the eye whites

The check SHALL report `tint` when the eye whites are more colorful than the maximum eye-white chroma, in any direction.

#### Scenario: Warm lamp light

- **WHEN** a photo that passes has its blue channel scaled down so the eye whites turn yellow
- **THEN** `tint` is reported

#### Scenario: Cool light

- **WHEN** a photo that passes has its red channel scaled down so the eye whites turn blue-green
- **THEN** `tint` is reported

### Requirement: Eye whites that cannot be measured do not reject a photo

When the eye openings hold too few pixels to measure the eye whites (eyes closed, or a squint), the check SHALL NOT report `dark` or `tint`. The eye-white measurement SHALL be absent, and the other checks SHALL still run.

#### Scenario: Eyes closed

- **WHEN** a photo that passes is checked with its eye openings collapsed to a line
- **THEN** no problem is reported and the eye-white color is absent

#### Scenario: Eyes closed in a grayscale photo

- **WHEN** a grayscale photo is checked with its eye openings collapsed to a line
- **THEN** `filter` is reported

### Requirement: A filter is judged from skin color no natural skin has

The check SHALL report `filter` when the skin color is near-gray, more saturated than the maximum skin chroma, or of a hue outside the natural skin range. Every tone of the Monk Skin Tone scale, under neutral light, SHALL pass.

#### Scenario: A black-and-white photo

- **WHEN** a photo that passes is converted to grayscale
- **THEN** `filter` is reported

#### Scenario: A pink filter on the skin

- **WHEN** a photo's skin is turned magenta while its eye whites stay neutral
- **THEN** `filter` is reported

#### Scenario: Every skin tone passes

- **WHEN** a face is painted in each of the 10 Monk Skin Tone colors, with neutral eye whites
- **THEN** no problem is reported for any of them

### Requirement: Each problem has its own retake tip

Each of the four problems SHALL have its own retake tip. A tip has a title, a message saying what is wrong, a tip saying how to retake, and an icon name. All four SHALL be distinct. Each SHALL equal the copy of its screen on the approved MVP canvas (`BadNoFace`, `BadDark`, `BadTint`, `BadFilter`).

#### Scenario: Four bad photos, four tips

- **WHEN** a no-face, a dark, a tinted and a filtered photo are each checked
- **THEN** each reports its own problem, and the four retake tips are distinct

#### Scenario: Tips match the canvas

- **WHEN** the retake tips are read
- **THEN** each title, message, tip and icon equals the copy on its canvas screen

### Requirement: Malformed input is refused

The check SHALL refuse a pixel buffer, width, height or landmark list exactly as color sampling does ({@link openspec/specs/color-sampling/spec.md#requirement-malformed-input-is-refused}), with an error naming the problem. It SHALL refuse a malformed buffer even when no landmarks are given.

#### Scenario: A short buffer with no face

- **WHEN** the pixel buffer is one byte shorter than width × height × 4 and no landmarks are given
- **THEN** the check throws an error that names the buffer length

#### Scenario: Too few landmarks

- **WHEN** 100 landmarks are given
- **THEN** the check throws an error that names the landmark count

### Requirement: The check is deterministic and leaves its input untouched

The same input SHALL give the same result on every run. The check SHALL NOT modify the pixel buffer or the landmarks it is given.

#### Scenario: One photo checked twice

- **WHEN** one photo is checked twice
- **THEN** both results are equal, measurements included

#### Scenario: The buffer after the check

- **WHEN** a photo is checked
- **THEN** its pixel buffer and landmarks are byte-for-byte what they were before
