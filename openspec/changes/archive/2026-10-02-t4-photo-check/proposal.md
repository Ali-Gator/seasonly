## Why

The analysis core samples any photo it is given. A dark, tinted or filtered selfie gives a confident wrong season, and the concept names this as the biggest driver of wrong results and refunds. The concept's positioning depends on an honest photo check with a free retake. The four bad-photo screens on the approved MVP canvas (`BadDark`, `BadTint`, `BadFilter`, `BadNoFace`) need a check that decides which one to show. `t5-analysis-flow` cannot start without it.

## What Changes

- A photo check in the analysis core. It runs on the same pixels and face landmarks as color sampling and returns either no problem or exactly one of four: `no-face`, `dark`, `tint`, `filter`. The four are checked in that order, so the first that applies is the one reported.
- **No face:** no face found, a face too small to measure, or a face partly out of the frame. A photo that passes can always be sampled into traits.
- **Dark and tint:** judged from the eye whites, a near-neutral reference that is roughly the same for every skin tone. Skin lightness is never used, so deep skin in good light is not called "too dark". Eye whites that cannot be measured (eyes closed, too few pixels) do not reject the photo.
- **Filter:** skin color that no natural skin has: grayscale, oversaturated, or a hue outside the natural range. Every tone on the Monk Skin Tone scale passes.
- Each problem comes with its own retake tip: a title, what is wrong and how to retake. The copy is verbatim from the approved canvas and lives in the core, next to the palettes, so every surface shows the same words.
- Every result carries the measurements it was judged by (face width, eye-white color, skin color), so `t5-analysis-flow` can report them and `t6-eval-set` can tune the thresholds.
- Out of scope, because no screen for them is approved: overexposure, blur, beauty-mode skin smoothing, makeup and more than one face.

## Capabilities

### New Capabilities

- `photo-check`: deciding whether a selfie is usable for color analysis, which of four problems it has if not, and the retake tip for each

### Modified Capabilities

None. The check calls color sampling and reuses its internals, and no sampling requirement changes.

## Impact

- New code under `packages/analysis/src/photo-check/`, re-exported from `src/index.ts`. It gets a README row `packages/analysis/src/photo-check/**` at archive. No new dependency.
- `packages/analysis/src/sampling/` is unchanged. The eye-opening rings live in `photo-check/`, not in `REGIONS`, so the sampling tests stay as they are.
- Downstream:
  - **`t5-analysis-flow`**
    - Runs MediaPipe and this check in the browser before upload, so a rejected photo never leaves the phone.
    - Shows the reported problem's canvas screen.
    - Sends a PostHog event with the problem and measurements.
    - Decides what happens after repeated failures. The concept offers the quiz as the fallback when there is no usable photo.
    - Sets MediaPipe's face count, and decides whether a second face means `no-face`.
  - **`t4-report-text`:** its vision call still double-checks the photo.
  - **`t6-eval-set`:** tunes the provisional thresholds on labeled photos that span the skin-tone range.
