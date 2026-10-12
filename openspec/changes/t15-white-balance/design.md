## Context

- `samplePhoto` (sampling) returns raw region colors and `traitsOf(regions)`. `checkPhoto` (photo-check) calls `samplePhoto`, then measures the eye white itself with a private `eyeWhiteOf`: the brightest 40% of both eye openings, through `robustCenter`. Photo-check imports from sampling; sampling imports nothing from photo-check.
- The eye openings (`EYE_OPENINGS`) deliberately stay out of `REGIONS`, because an opening contains the iris and sampling regions never overlap.
- In the eval set the measured "eye white" is always darker than the skin (L\* 3–52 below it) and warm on average (a\* 7.6, b\* 6.2 over the 59 usable photos that pass). It is a shadowed sclera, not a neutral reference. Photo-check already rejects photos whose eye-white C\*ab is over 22 (`tint`), so a passing photo's offset from the reference is bounded.
- The 2026-10-12 probe is summarized in proposal.md (Why). The eval runs locally in about a minute on cached MediaPipe output (`pnpm eval:run`; `EVAL_MANIFEST` + `EVAL_RESULTS` write a one-off run elsewhere).
- Synthetic test faces paint no eye white: their eye openings show the background (and the iris). Every image in a trait test therefore has the same eye white, so the balance shifts all of them by one constant offset.

## Goals / Non-Goals

**Goals:**

- One person's temperature, value and clarity move less between lights, so agreement rises above 0.6021.
- Photo-check outcomes, its `PhotoMeasures` shape and the reported region colors stay exactly as they are.
- No existing test changes. If one has to, the user approves it first.

**Non-Goals:**

- A full color-constancy pipeline (gray-world, learned illuminant estimation, per-pixel correction).
- Balancing L\*. Eye-white lightness tracks eyelid shadow and exposure, not the color of the light, and the photo check already rejects dark photos.
- Raising label accuracy (proposal, Why).

## Decisions

### D1. The eye-white measure moves into sampling

`EYE_OPENINGS` moves to `sampling/regions.ts`, outside `REGIONS`, and keeps its comment on why. `eyeWhiteOf` moves to `sampling/index.ts`, and `samplePhoto` returns it as `Sample.eyeWhite: Lab | null`. Photo-check imports `EYE_OPENINGS` from sampling, re-exports it so its public surface is unchanged, and reads `sample.eyeWhite`. It still records `measures.eyeWhite` only after the no-face checks, so its output is unchanged byte for byte.

_Alternative:_ have sampling import from photo-check. That creates an import cycle (photo-check → sampling → photo-check). Rejected.

### D2. `traitsOf(regions, eyeWhite?)`: an optional second argument, not a field of `RegionColors`

Region colors stay "what was measured in each region". This keeps the painted-face ΔE 2 scenario, keeps photo-check's `skin` measure raw, and leaves every existing `traitsOf({skin, eyes, lips, hair})` call valid. An absent or null `eyeWhite` means no balance (the spec's fallback).

_Alternative:_ add `eyeWhite` to `RegionColors`. That edits the object literals in existing tests and blurs "region" with "reference". Rejected.

### D3. The balance is a Lab a\*b\* offset against a measured reference, scaled by a strength `k`

For each of skin, hair and eyes: `a' = a − k·(eye.a − REF.a)`, `b' = b − k·(eye.b − REF.b)`, with L\* unchanged. `REF` is the mean eye white of the eval set's usable passing photos. `k` is a single constant in [0, 1]. When `eye` equals `REF`, the offset is zero, so traits equal the unbalanced ones (spec).

- **Why a reference and not neutral grey:** the probe found grey makes the spread worse (10.9° to 12.6°), because the measured sclera is warm and shadowed in every light. The reference cancels that constant.
- **Why `k` and not full correction:** at `k = 1` the first probe pushed single photos to implausible skin hues (above 100°). Skin reflects differently from sclera, so an exact cancel overshoots. `k` trades stability against those outliers. Low-chroma results are already damped by `HUE_FULL_CHROMA`.
- **Why the eyes too:** the iris sits in the same light. Balancing skin and hair alone would let a cast move clarity through iris chroma.
- **Alternative: von Kries diagonal scaling in linear RGB.** It is more principled for a multiplicative light cast, but it needs the region colors back in linear RGB (an inverse Lab conversion or per-pixel balancing) and adds code. Tried only if the Lab offset cannot beat the 0.6021 baseline with every other ratchet held. If it is adopted, this design is updated before the code lands.
- **No clamp on the offset:** a passing photo's eye-white chroma is at most 22, and `n()` already clamps each trait term to ±1. Add a clamp only if the sweep shows an outlier the chroma weighting does not damp.

### D4. How `REF`, `k` and the midpoints are chosen

1. Measure `REF` (a\*, b\*) from the usable photos that pass, to one decimal.
2. Sweep `k ∈ {0, 0.25, 0.5, 0.75, 1}` with one-off eval runs written to the scratchpad. Pick the `k` with the highest agreement whose false-reject rate and catch rate are at least the baseline. Accuracy may fall: the user approved trading accuracy for agreement on 2026-10-12, so the accuracy baseline is lowered to the new result with that note. On a tie, take the smaller `k`. The false-reject rate and catch rate cannot move, because photo-check is unchanged. The sweep confirms it.
3. With that `k`, re-check `SKIN_HUE`, `HAIR_HUE` and `SKIN_C` midpoints at the corrected set's measured centers. Keep a moved midpoint only if it raises agreement without lowering another ratchet. This is the rule `t6-eval-set` used.
4. **Overfit check** (16 people, BL-14): only 3–6 scalars are fitted. For the chosen setting, record (a) the per-person agreement change from `results.json`, and reject the setting if its gain comes from two or fewer people, and (b) the largest shift in `REF` when each person is left out in turn. If that shift moves any person's season, take the next smaller `k`. Both numbers go into the tasks' notes and into the `traits.ts` comment beside the constants.

_Alternative:_ fold in BL-14 (more people plus a holdout). That doubles the scope with photo sourcing and label approval. Kept as a separate item.

## Risks / Trade-offs

- [Agreement does not beat 0.6021 at any `k`] → Try D3's von Kries alternative. If that also fails, stop and report to the user with the sweep table, rather than lowering the baseline or shipping a no-op.
- [Accuracy drops below 0.1806 because the warm-cool skin-hue gap shrinks (probe)] → Approved by the user on 2026-10-12: agreement wins, and `baseline.json` accuracy is lowered to the fresh result in the same commit, with the approval cited in tasks 4.6. The drop is still reported in the PR.
- [An existing test relies on the unbalanced traits of a synthetic face (its eye openings show the background, so a constant offset applies)] → Run the suite first. If an existing test fails, stop and ask the user before editing it (CLAUDE.md). Most trait tests compare images that share one eye white, so they should hold.
- [Glasses or a tinted contact lens color the eye openings] → Photo-check already rejects a strong cast as `tint`. Below that limit, the balance takes part of the tint as light. This is accepted and listed as a known edge case in the main spec's Edge Cases after archive.
- [Stored reports mix traits from before and after the change] → Accepted. Reports store the traits and season of their own day, and nothing recomputes old reports.

## Migration Plan

Pure core change: it ships with the next deploy. Rollback is a revert of the change's commits plus the `results.json`/`baseline.json` they carry. No data migration.
