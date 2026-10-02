## Context

`packages/analysis` already samples a photo (`samplePhoto`: pixels, landmarks and an optional hair mask go in; region colors and traits come out) and classifies it. It accepts any photo. `architecture-boundaries` still applies: no DOM, Node or framework imports, explicit `.ts` imports, and `zod` as the only runtime dependency.

Inside `sampling/`, three internals are reusable:

- `regionPixels(rings, landmarks, w, h)` lists the pixels inside landmark rings.
- `srgbToLab` converts colors.
- `robustCenter` sorts by L*, trims each end by 10% and takes the median.

The sampling test asserts that no two `REGIONS` overlap.

The approved canvas fixes the four problems and their copy. `BadNoFace`, `BadDark`, `BadTint` and `BadFilter` each show a danger note (a title and a message) and a retake-tip note with an icon (`info`, `sun`, `sun`, `camera`). All four share the heading "Let's retake this one" and the Retake and Upload buttons, which belong to the screen, not to the problem.

Motivation: proposal.md, under Why. Requirements: `specs/photo-check/spec.md`.

## Goals / Non-Goals

**Goals:**

- One pure function that every surface calls before sampling, with every tunable number in one block for `t6-eval-set`.
- No rejection that depends on skin lightness.

**Non-Goals:**

- Face detection. The adapter runs MediaPipe, and "no landmarks" means no face.
- Beauty-mode smoothing detection. Phone processing and JPEG compression also smooth skin, so a texture threshold would reject unfiltered photos. A false reject loses a user. Revisit if `t6-eval-set` shows smoothed photos slipping through.
- Overexposure, blur, makeup, glasses and multiple faces. None has an approved screen.
- White-balance correction. A tinted photo is retaken, not corrected.

## Decisions

### 1. Files

```
packages/analysis/src/photo-check/
  index.ts             checkPhoto, types, eye-opening rings, the provisional constants
  tips.ts              RETAKE_TIPS: the canvas copy
  photo-check.test.ts
```

`src/index.ts` adds `export * from "./photo-check/index.ts"`. At archive, the README gets one row: `packages/analysis/src/photo-check/**`.

- Alternative: a separate `limits.ts` like `sampling/traits.ts`. Rejected: there are six constants, and one block at the top of `index.ts` is the single place to tune.

### 2. Interface

```ts
type PhotoProblem = "no-face" | "dark" | "tint" | "filter";
interface PhotoMeasures {
  faceWidth: number | null; // pixels, landmark bounding box
  eyeWhite: Lab | null; // null when unmeasurable
  skin: Lab | null; // from samplePhoto's regions
}
interface PhotoCheck {
  problem: PhotoProblem | null;
  measures: PhotoMeasures;
}
function checkPhoto(
  input: Omit<PhotoInput, "landmarks"> & { landmarks: PhotoInput["landmarks"] | null },
): PhotoCheck;

interface RetakeTip {
  title: string;
  message: string;
  tip: string;
  icon: "info" | "sun" | "camera";
}
const RETAKE_TIPS: Record<PhotoProblem, RetakeTip>;
```

The input is `PhotoInput` with nullable landmarks, so the flow passes the same object to `checkPhoto` and then to `samplePhoto`. A hair mask, when given, keeps a fringe out of the skin measurement, as it does in sampling.

### 3. Order of the steps

1. **No landmarks:** check width, height, buffer length and hair-mask length with the same messages as sampling (the refusals that do not need landmarks), then return `no-face` with every measurement null.
2. **Sample:** call `samplePhoto(input)`. It validates the input, so malformed input is refused with sampling's own errors, and it gives the skin color.
3. **Face:** compute the bounding box of all landmarks in pixels. If any landmark is outside the image or not a number, or the box is narrower than `MIN_FACE_WIDTH`, return `no-face`. Also return `no-face` if `sample.traits` is null. With the minimum width this should never trigger, but it guarantees the requirement "A photo that passes can be sampled" by construction.
4. **Eye whites:** see decision 4. If measured, check `dark` and then `tint`.
5. **Filter:** check the skin color (decision 5).

The first problem found is returned with all measurements gathered so far.

- Alternative: return every problem found. Rejected: the canvas shows one problem per screen, and darkness distorts the tint and filter readings, so a later problem is often a symptom of an earlier one.

### 4. Eye whites as the reference

The rings come from MediaPipe's `FACEMESH_RIGHT_EYE` and `FACEMESH_LEFT_EYE`, chained into closed loops from the edge sets in `face_mesh_connections.py` at the commit `regions.ts` cites (b453bf8). They are copied from the source, not typed from memory. They stay in `photo-check/`, not in `REGIONS`: an eye contour contains the iris, so adding it would break the sampling test that no regions overlap.

The eye white is measured like this:

1. Take every pixel inside either eye opening.
2. If there are fewer than `MIN_REGION_PIXELS` (50, from sampling), the eye white is unmeasurable.
3. Otherwise sort the pixels by L* and keep the brightest 40%: the sclera is the brightest thing in the opening, brighter than the iris, pupil and lashes.
4. Apply `robustCenter` to that share. Its top trim drops the corneal catchlight.

This works with 468 or 478 landmarks, so the iris points are not needed.

- **Why the sclera:** it is near-neutral and much the same across skin tones, so it measures exposure and white balance without reading skin lightness. An image-wide brightness or gray-world average was rejected: the background dominates both, and a white wall behind deep skin would read as fine exposure while the face is underexposed.

### 5. Thresholds (provisional, tuned by `t6-eval-set`)

| Constant               | Value     | Problem                                              |
| ---------------------- | --------- | ---------------------------------------------------- |
| `MIN_FACE_WIDTH`       | 120 px    | `no-face` below it                                   |
| `MIN_EYE_WHITE_L`      | 50        | `dark` when eye-white L* is below it                 |
| `MAX_EYE_WHITE_CHROMA` | 15        | `tint` when eye-white C\*ab is above it              |
| `MIN_SKIN_CHROMA`      | 2         | `filter` below it: grayscale                         |
| `MAX_SKIN_CHROMA`      | 45        | `filter` above it: oversaturated                     |
| `SKIN_HUE` (degrees)   | 25 to 100 | `filter` outside it, judged only when skin C\*ab ≥ 6 |

The thresholds are set against the Monk Skin Tone scale (skintone.google, CC BY 4.0). Run through this core's `srgbToLab`, its 10 tones span:

- **Chroma** 3.8 to 27.9: MST 10 (`#292420`) is the least colorful at 3.8, and MST 6 (`#a07e56`) the most at 27.9.
- **Hue** 49° to 89°.

So the grayscale floor sits well below 3.8, the hue band has margin on both sides, and the hue gate at chroma 6 keeps the unstable hue of near-gray deep skin from counting. The test copies the 10 hex values from the MST source with a citation.

On the canonical fixture face at 120 px wide, both eye openings together hold about 128 pixels, so the eye whites stay measurable at the minimum width; a test pins this, and `MIN_FACE_WIDTH` rises if a corrected ring list says otherwise. The skin region is far above sampling's 50.

### 6. Retake copy in the core

`tips.ts` holds the four canvas notes verbatim. The canvas source lists them per screen:

| Problem   | Title           | Icon     |
| --------- | --------------- | -------- |
| `no-face` | No face found   | `info`   |
| `dark`    | Too dark        | `sun`    |
| `tint`    | Tinted light    | `sun`    |
| `filter`  | Filter detected | `camera` |

Each entry also has the message and tip text exactly as the canvas files have them. The test compares against strings copied from `project/Bad*.dc.html`, the way the palettes test checks Soft Autumn against `Report.dc.html`. The shared heading and buttons stay in the web flow.

- Alternative: copy in `apps/web`. Rejected: the exit check ("each gets its own retake tip") would then be unprovable until `t5`. The palettes, with their color names, already set the precedent for user-facing data in the core, and a later iOS surface reuses it.

### 7. Synthetic photos for tests

The tests reuse the `__tests__/` fixture (`face478`, `paint`). Its canonical landmarks span x 0.008–0.992 and y 0.107–0.954, so the face is inside the frame. Each test paints skin (cheeks and forehead), eye openings in a near-white sclera (`#F0EDE8`: L* 93.8, C\*ab 2.8) and irises in a dark brown. Each problem then comes from one edit that trips only its own signal, well past its limit (chroma edits about twice it), so tuning the constants in `t6-eval-set` does not turn a test edit into a borderline case (values from this core's `srgbToLab`):

| Problem      | Edit                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| `dark`       | every channel × 0.33 (eye white L* 33)                                     |
| `tint`, warm | blue × 0.7, green × 0.9 (eye white C\*ab 29)                               |
| `tint`, cool | red × 0.6 (eye white C\*ab 30)                                             |
| `filter`     | Rec. 709 luma to gray; the sclera stays neutral, so `tint` is not reported |
| magenta skin | skin repainted `#C890B8` (C\*ab 30, hue 336°), sclera untouched            |
| closed eyes  | upper-lid landmarks moved onto the lower lid                               |
| small face   | landmarks scaled about the face center                                     |
| cut-off face | landmarks shifted past the edge                                            |

## Risks / Trade-offs

- **[Sclera differs by person: pigmented, yellowish or bloodshot]** → The chroma limit is loose (15). `t6-eval-set` must include photos across MST 1–10, and the measurements in every result let it tune from real data.
- **[A squint leaves skin inside the eye opening, which reads as a colored "eye white" and gives a false `tint`]** → The brightest-40% selection favors the sclera. Tuning `MIN_REGION_PIXELS` for eyes, or a ratio of eye-opening area to face width, is the upgrade if the eval set shows it.
- **[Closed eyes skip `dark` and `tint`]** → This is accepted: a misleading tip is worse than a pass. The skin-based filter check still runs, and the vision call in `t4-report-text` double-checks the photo.
- **[A warm color filter also yellows the sclera, so it is reported as `tint`, with the lamp tip]** → The retake still fixes it. The two cannot be told apart from color alone.
- **[Thresholds tuned on painted faces]** → All six are provisional and sit in one block. The tests check direction and fairness (MST sweep), not tuned values.

## Migration Plan

New exports only. No deployed caller, no data. Rollback is a revert.
