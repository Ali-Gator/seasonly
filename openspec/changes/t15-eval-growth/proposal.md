## Why

`t15-white-balance` could not be judged: on 16 people, the white balance steadied temperature (within-person spread 0.338 to 0.283) but moved exact-season agreement by 0.03, which is about two photos. The set also leans light-skinned (10 of 16 people light, 3 medium, 3 deep), and the same photos tuned the limits they now score (BL-14). T15 is blocked until the set can see the effect, and paid promotion waits on T15.

How big the set must be. Each measured person has 3.7 passing photos on average, so one photo that changes season moves that person's agreement by about 0.29, and the set's agreement by 0.29 / N:

| People measured | One photo moves agreement by |
| --------------- | ---------------------------- |
| 16 (today)      | 0.018                        |
| 25 (tuning set) | 0.012                        |
| 34 (whole set)  | 0.009                        |

The balance's effect on agreement (−0.03 to +0.03 across its sweep) is then two to three photos on the tuning set instead of one or two. That is still coarse, so this change also reports trait spread, a continuous measure that moved 14–18% under the balance, and judges the re-run on both.

## What Changes

- **18 new people, medium and deep skin first.** Public figures on Wikimedia Commons, about six photos each in clearly different light, as in `t6-eval-set`. Seasons spread across all four families, not only deep autumn and deep winter. The user approves every person, photo, label and expected outcome before any download. The set grows to 34 people, with 10 light, 11 medium and 13 deep (8 medium and 10 deep added).
- **A holdout.** Every other new person in each skin band, in the approved list's order, gets `holdout: true` (9 people). The rule is fixed before the first run. The 16 original people never join the holdout: they tuned today's limits. `metrics`, which CI holds to `baseline.json`, covers the other 25 people. The holdout's metrics are reported and never ratcheted.
- **Trait spread.** `results.json` reports the mean within-person standard deviation of temperature, value and clarity, for the tuning set and the holdout. It is reported, not ratcheted. No single photo's trait is written.
- **A new baseline.** The grown set's first untuned run becomes `baseline.json`. It will almost certainly score below today's 0.6021: harder photos and more varied skin. Lowering the baseline needs the user's approval, asked with the photo list.
- **The white balance re-run.** The Lab-offset sweep from `t15-white-balance` (commit `1d28b3d`, tasks 4.2–4.5) is re-run on the tuning set and checked on the holdout. Whether it ships is decided by the rule in the design. Shipping it changes `color-sampling` and is a follow-up change. This change only measures it.
- **Folded in:** BL-14 (fixed here and deleted from `docs/backlog.md`). BL-13's re-run happens here; BL-13 stays gated on this change's result.
- **Not in scope:**
  - BL-39 (skin hue barely separates warm and cool). The bigger set will measure it again, but finding another cue is its own change.
  - BL-15 (fetching photos in CI).
  - Retuning the photo check. If `dark` rejects cluster on deep skin, that is recorded as a finding and goes to the backlog. Tuning it here would tune on the photos meant to judge it.
  - The user's own selfies. They need no `source` and can join later.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `analysis-eval`: adds a holdout and trait spread; `results.json` records both.

## Impact

- `evals/manifest.ts` (`holdout`), `evals/metrics.ts` (trait spread; `PhotoOutcome` carries traits), `evals/pipeline.ts` (passes traits through), `evals/results.ts` (tuning and holdout metrics; traits never serialized).
- `evals/manifest.json` (18 people, about 108 photos), `evals/results.json`, `evals/baseline.json`.
- `evals/README.md`: holdout and trait spread under "Reading the results".
- Tests: new cases in `manifest.test.ts`, `metrics.test.ts` and `results.test.ts`. Existing tests should not change. Any that must is listed for the user's approval.
- No app code, no new dependencies, no paid run. `pnpm eval:run` is local and free.
