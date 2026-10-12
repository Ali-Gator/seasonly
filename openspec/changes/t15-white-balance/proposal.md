> **Rescoped on 2026-10-12 after measurement (tasks 4.2–4.5).** Neither balance beat agreement 0.6021 under the design's rules, so the user chose to park it until the eval set is bigger (BL-14). This change now ships only the eye-white move: sampling reports the eye white and photo-check reads it there. Traits, results and every baseline are unchanged. The balance code is in commit `1d28b3d` for the re-run. The rest of this proposal is the original plan.

## Why

One person's photos in different light still give different seasons: eval agreement is 0.6021 and exact-season accuracy 0.1806 (`t6-eval-set`, 2026-10-09). BL-13 traced most of it to temperature. Skin hue moves with the color of the light, so one person's temperature spreads 0.3–0.6 across photos. Constants cannot fix it: `t6-eval-set` tried retuning them. The plan puts `t15-white-balance` (T15) first in Phase 3, and no paid promotion starts before it (decided 2026-10-09).

A read-only probe of the cached eval measures (2026-10-12, the 59 usable photos that pass the check, 16 people) shows both what correction can do and what it cannot:

- Shifting skin a\*b\* by how far each photo's eye white sits from the set's mean eye white cuts the mean within-person skin-hue spread from 10.9° to 8.1° at half strength and 7.0° at full. That is the stability BL-13 asks for.
- Measured against a neutral grey instead, the same shift makes the spread worse (12.6°). The eye opening's brightest pixels are a shadowed, slightly warm sclera, not a white card.
- Skin hue barely separates the labels: warm-labeled people average 47.1°, cool-labeled 44.0°, a 3° gap inside an 11° spread. Correction narrows that gap or reverses it. So white balance can raise agreement. It is not expected to raise label accuracy, and this change does not promise it.

## What Changes

- **Sampling measures the eye white.** The eye-white measure moves from photo-check into color sampling: the brightest share of both eye openings, as photo-check measures it today. `samplePhoto` reports it beside the region colors, and photo-check reads it from there. Photo-check's limits and outcomes do not change.
- **Traits are computed from white-balanced colors.** Before computing traits, `traitsOf` shifts the skin, hair and eye colors by the eye white's offset from a measured reference eye white. A strength factor scales the shift. Region colors stay raw, as measured. With no usable eye white, traits are computed exactly as today.
- **The reference and the strength are measured on the eval set.** The design names the candidates and the decision rule. The trait midpoints that the shift moves (skin hue, skin chroma, hair hue) are re-checked on the corrected colors. Any constant that changes is recorded in the spec with its measured value.
- **The eval gate holds the change.** Agreement must rise above 0.6021. The false-reject rate and catch rate may not fall below `evals/baseline.json`. Accuracy may fall: the user approved trading it for agreement on 2026-10-12, and its baseline is lowered to the new result. `results.json` and `baseline.json` are refreshed in the same commit.
- **Folded in:** BL-13 (this change fixes it and deletes it from `docs/backlog.md`). The plan's "Carried in" item for `t6-eval-set` on result stability across one person's photos is stale (`t6-eval-set` built the agreement metric) and is removed at archive.
- **Not in scope:**
  - Label accuracy beyond holding its baseline. The probe shows skin hue cannot carry it.
  - BL-14 (more medium and deep people, and a holdout set). The strength and midpoints are instead checked leave-one-person-out (design).
  - BL-18 and BL-19 (privacy items deferred to "before paid promotion"). They gate paid promotion too, but no white-balance code touches them, and the user chose on 2026-10-12 to leave them out.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `color-sampling`: adds a requirement. Sampling measures the eye white and reports it beside the region colors; it changes neither the region colors nor the traits. (The balance requirement first planned here is parked; see the note at the top.)

## Impact

As first planned. After the rescope only the `sampling/` and `photo-check/` moves and the `results.json` hash ship; `traits.ts`, `baseline.json` and BL-13 stay as they are.

- `packages/analysis/src/sampling/`: `index.ts` (`Sample` gains `eyeWhite`), `traits.ts` (`traitsOf` takes an optional eye white; reference, strength and retuned midpoints), and a new home for the eye-opening rings and the eye-white measure.
- `packages/analysis/src/photo-check/index.ts`: reads the eye white from sampling. Its behavior and its `PhotoMeasures` shape are unchanged.
- `evals/results.json`, `evals/baseline.json`: refreshed by `pnpm eval:run`. No eval code changes are planned.
- `apps/web`: no code change. `checkImage` already takes `samplePhoto(...).traits`, so the browser gets balanced traits automatically, and stored reports keep the same `Traits` shape.
- Specs: the `color-sampling` delta. After archive, `openspec/specs/color-sampling/spec.md` Public Interface, Behavior and Edge Cases, and the `analysis-eval` Behavior's "Measured on" line, are updated with the new numbers.
- Plan: the Tracker's T15 row and the Phase 3 list are marked done at archive. `docs/backlog.md` loses BL-13.
- No new dependencies. `pnpm eval:run` is local and free, and `pnpm eval:vision` is not needed. The only spend is the manual check in the user's Chrome, approved on 2026-10-12 with a budget of at most $1.
