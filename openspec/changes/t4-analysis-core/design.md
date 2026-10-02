## Context

`packages/analysis` holds one placeholder constant. `architecture-boundaries` fixes its shape. It has no DOM, Node or framework imports, only erasable TypeScript run by plain Node with explicit `.ts` imports, and `zod` is its only allowed runtime dependency. Its input is pixels (`Uint8ClampedArray`, width, height) plus face landmarks. Landmark detection is the per-platform adapter: MediaPipe Face Landmarker and the multiclass selfie segmenter in the browser, Vision on iOS later.

The 12 slugs live in `apps/web/src/lib/site/routes.ts`, together with page copy (`summary`). `evals/manifest.ts` keeps its own list, which still uses the retired `warm-*` / `clear-*` / `cool-*` names. No test asserts those names.

The approved canvas fixes three inputs to this change:

- The quiz: four questions with these values. Veins: `green`, `blue`, `mix`, `unsure`. Jewelry: `gold`, `silver`, `both`, `unsure`. Sun: `burn`, `burn-tan`, `tan`, `unsure`. Hair: `dark`, `medium`, `blonde`, `red`, `unsure`.
- The report's palette sections. Soft Autumn has 24 best, 6 avoid and 6 neutrals (the "30 colors" the Reveal screen and the landing description promise), 4 metals to wear and 2 to go easy on, 3 swatches each for lips, blush, eyes and hair, and a draping pair (Terracotta, Fuchsia).
- The report's "Photo and quiz agree" note.

Motivation: see proposal.md, under Why. Requirements: the three spec deltas.

## Goals / Non-Goals

**Goals:**

- One pure pipeline that every surface calls: sample the photo, then classify. The web flow, a server route and the plugin all get the same season for the same input.
- Every tunable number sits in one place per capability, so `t6-eval-set` can tune thresholds without touching logic.
- One season list for the whole workspace.

**Non-Goals:**

- Accuracy. With no labeled photos yet, this change proves the rules on synthetic inputs. `t6-eval-set` records the real baseline and tunes the constants.
- White-balance or lighting correction. `t4-photo-check` rejects tinted and dark photos before sampling. A correction step, for example using the sclera as a white reference, is added only if the eval set shows it is needed.
- Running MediaPipe. The adapter in `t5-analysis-flow` produces landmarks and the hair mask.
- Words. Trait labels and report prose belong to `t4-report-text`. The report card's Undertone, Chroma and Contrast lines are worded there, from the combined traits the classifier returns with its result.

## Decisions

### 1. One folder per capability

```
packages/analysis/src/
  index.ts                 re-exports only; unowned by any README row
  palettes/seasons.ts      season ids, families
  palettes/data.ts         the 12 palettes
  palettes/index.ts
  sampling/color.ts        sRGB -> CIELAB, robust central value
  sampling/regions.ts      landmark polygons, point-in-polygon scan
  sampling/traits.ts       region colors -> temperature, value, clarity (+ tunable constants)
  sampling/index.ts
  classifier/reference.ts  the 12 reference points, quiz weights (tunable constants)
  classifier/quiz.ts       zod schema for answers
  classifier/index.ts
  __tests__/               synthetic-face fixture: canonical landmarks as a .ts literal, a polygon painter
```

At archive, the README gets three non-overlapping rows: `packages/analysis/src/sampling/**`, `.../classifier/**` and `.../palettes/**`. Tests sit beside the code as `*.test.ts`.

- Alternative: one flat `src/`. Rejected: the rows would need file lists and would drift as files are added.

### 2. The season list moves into the core

`palettes/seasons.ts` exports `SEASON_SLUGS` (family order, as in `routes.ts` today), `type SeasonSlug`, `type Family` and `seasonFamily(slug)`. `routes.ts` imports the slugs and the type from `@seasonly/analysis`, which `apps/web/package.json` already declares. It keeps its summaries as `Record<SeasonSlug, string>`, so the compiler refuses a missing or extra season. Its public names (`SEASONS`, `SEASON_SLUGS`, `SeasonSlug`) stay, so pages and existing tests do not change. `evals/manifest.ts` imports the slugs by relative path (`../packages/analysis/src/index.ts`). `evals/` is not a workspace package, and a relative import needs no manifest.

- `site-structure` is not modified. Its requirement still holds, and its Public Interface section is updated after archive to say where the slugs come from.

### 3. Input contract

```ts
interface PhotoInput {
  pixels: Uint8ClampedArray; // RGBA, row-major, length = width * height * 4
  width: number;
  height: number;
  landmarks: readonly { x: number; y: number }[]; // normalized 0..1; 468 or 478 points
  hairMask?: Uint8Array; // width * height; non-zero = hair (segmenter category 1)
}
```

The core uses landmarks' `x` and `y` only. `z` and the 52 blendshapes are ignored. The adapter turns the segmenter's confidence or category mask into the 0/1 `hairMask`.

### 4. Regions from the canonical face-mesh map

Each region is a polygon of landmark indices, taken from MediaPipe's canonical face mesh. The lips polygon is the outer `FACEMESH_LIPS` contour minus the inner one. The irises are `FACEMESH_LEFT_IRIS` and `FACEMESH_RIGHT_IRIS` (indices 468–477, present only with 478 points). The cheeks are a patch below each eye, clear of the nostrils and the lip line. The forehead is a band above the brows, kept below the hairline. The index lists are copied from the MediaPipe source at implementation time and cite it in a comment ([face mesh connections](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py), [canonical index map](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png)). They are never typed from memory.

Pixels are found by an even-odd point-in-polygon test over each polygon's clipped bounding box. Hair is every pixel where `hairMask` is non-zero, over the whole image. Lips and skin are never sampled where the mask says hair, which covers a fringe over the forehead.

### 5. Color math

Conversion is sRGB → linear → XYZ (D65) → CIELAB, with the standard formulas. The robust central value works as follows:

1. Sort a region's pixels by L*, breaking ties by pixel index so the order is total.
2. Drop the top and bottom 10%.
3. Take the per-channel median of L*, a* and b* over what is left.

ΔE in tests is CIE76, which is enough for flat synthetic colors.

### 6. Traits

All constants below are provisional and live in `sampling/traits.ts`. `t6-eval-set` tunes them. `n(v, mid, half)` = `clamp((v − mid) / half, −1, 1)`; `h` = hue angle in degrees, `C` = chroma, `L` = lightness.

| Trait       | Inputs, each normalized, then averaged with weights                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| temperature | skin `n(h, 55, 15)` ×2; hair `n(h, 60, 20)` ×1 when present                                                                                         |
| value       | skin `n(L, 62, 15)` ×2; hair `n(L, 40, 25)` ×1 when present; eyes `n(L, 40, 20)` ×0.5 when present                                                  |
| clarity     | skin `n(C, 20, 8)` ×1; eyes `n(C, 20, 15)` ×1 when present; contrast `n(max ΔL from skin to hair or eyes, 30, 20)` ×1 when hair or eyes are present |

Absent regions drop out of the weighted mean. Each trait is rounded to three decimals.

- Rounding is also the cross-engine guard. `Math.cbrt` and `Math.pow` may differ in the last bit between JavaScript engines, and rounding absorbs that except exactly at a rounding edge.
- Alternative: a trained model over the region colors. Rejected: no labeled data yet, and the concept asks for a rule-based classifier that can be explained.

### 7. Classifier: nearest reference point

Each season has a reference point (temperature, value, clarity). The points are symmetric across warm and cool, and live in `classifier/reference.ts`:

| Season        | T   | V    | C    |     | Season        | T    | V    | C    |
| ------------- | --- | ---- | ---- | --- | ------------- | ---- | ---- | ---- |
| light-spring  | 0.4 | 0.8  | 0.2  |     | light-summer  | −0.4 | 0.8  | −0.2 |
| true-spring   | 0.9 | 0.3  | 0.4  |     | true-summer   | −0.9 | 0.2  | −0.3 |
| bright-spring | 0.4 | 0.2  | 0.9  |     | soft-summer   | −0.4 | 0    | −0.8 |
| soft-autumn   | 0.4 | 0    | −0.8 |     | deep-winter   | −0.4 | −0.8 | 0.2  |
| true-autumn   | 0.9 | −0.2 | −0.2 |     | true-winter   | −0.9 | −0.3 | 0.5  |
| deep-autumn   | 0.4 | −0.8 | 0    |     | bright-winter | −0.4 | −0.1 | 0.9  |

The result is the nearest point by Euclidean distance, with the second nearest as runner-up. A tie goes to the earlier season in `SEASON_SLUGS`. Confidence is `round2(s × (1 − d1 / d2))`, with `s` = 0.6 when there is no photo and 1 otherwise. It is scaled before rounding, so it always has two decimals. That gives 1 on a point, 0 at an equidistant midpoint, and a smooth rise in between.

- Alternative: a decision tree (temperature first, then the dominant trait). Rejected: hard thresholds give a confidence that jumps, and adding a season means rewriting branches. Nearest-point classification is still a rule a person can read off the table.

### 8. Quiz answers

Each answer adds to a partial trait vector, and `unsure` adds nothing. The weights are provisional and live in `classifier/reference.ts`:

| Answer         | T    | V    | C   |
| -------------- | ---- | ---- | --- |
| veins green    | 0.5  |      |     |
| veins blue     | −0.5 |      |     |
| jewelry gold   | 0.5  |      |     |
| jewelry silver | −0.5 |      |     |
| sun burn       | −0.2 | 0.4  |     |
| sun tan        | 0.2  | −0.3 |     |
| hair dark      |      | −0.6 | 0.3 |
| hair blonde    |      | 0.6  |     |
| hair red       | 0.5  | 0.1  |     |

The neutral answers `mix`, `both`, `burn-tan` and `medium` add 0 to every axis. They are treated exactly like `unsure`, so they neither pull a photo toward neutral nor count as something to classify on. Each axis is clamped to [−1, 1].

- **With a photo:** on each axis that at least one non-neutral answer touched, combined = 0.8 × photo + 0.2 × quiz. Untouched axes keep the photo value. At 0.7 / 0.3, a photo on Soft Summer's point with green veins and gold jewelry crossed to Soft Autumn (temperature +0.02); at 0.8 it stays cool (−0.12).
- **Without a photo:** the quiz vector is used as is, and an untouched axis stays at 0. If no answer moves any axis (every answer `unsure` or neutral), the result is `null`: a quiz of neutral answers alone would land equidistant from Soft Summer, Soft Autumn and Deep Autumn, which is a guess.
- **Agreement:** `photo-only` when no answer moves any axis, `quiz-only` without a photo; otherwise `differ` when the photo's and the quiz's temperatures have opposite signs and both are at least 0.15 from zero; otherwise `agree`.

### 9. zod only at the trust boundary

`QuizAnswersSchema` is a `z.strictObject` of four optional enums, and a missing question counts as `unsure`. A server route or the plugin's tool parses client JSON with it. Pixel input is checked by hand: length checks that throw `RangeError` with the numbers. A typed array is not JSON, and zod would only add a copy.

### 10. Palettes as typed data, approved as swatches first

`palettes/data.ts` is a `Record<SeasonSlug, Palette>` literal, so the compiler refuses a missing season. Soft Autumn is copied from the canvas report (`project/Report.dc.html`). The other 11 are drafted by Claude from standard 12-season color theory, keeping Soft Autumn's structure and section sizes. They are published first as one private swatch page (Artifact), with names, hex and each season's draping pair, for the user to approve. Only the approved data is committed.

- Alternative: `data.json`. Rejected: plain Node needs import attributes for JSON, and a `.ts` literal gets type-checked against `SeasonSlug` for free.

## Risks / Trade-offs

- [Provisional constants misclassify real faces] → `t6-eval-set` tunes them against labeled photos before launch. The constants sit in two files, and the tests check structure (monotonic traits, reference points, confidence shape), not tuned values.
- [Cross-engine float drift flips a season] → Traits are rounded to 3 decimals and confidence to 2, so a flip needs a value exactly on a rounding edge. The same-process and separate-process tests guard determinism on one engine.
- [No hair mask (segmenter fails or is skipped)] → Value and contrast lean on skin and eyes, and the quiz's hair answer fills the gap.
- [Indoor light shifts skin hue warm] → `t4-photo-check` rejects tinted photos, and quiz answers decide borderline cases. The eval set's indoor photos will show how large the effect is.
- [Drafted palettes look off] → Your approval gate comes before commit. A palette can be swapped later with no code change.

## Migration Plan

No data and no deployed caller. `ANALYSIS_CORE_VERSION` is removed. The architecture-boundaries runtime test only checks that the module has exports, which still holds. `routes.ts` keeps its exported names, so pages compile unchanged. Rollback is a revert.
