## Why

Four `## Analysis` backlog items can ship now. The `dark` check rejects deep skin about three times as often as light skin, because its "eye white" (the brightest 40% of the eye opening) is mostly lid, lash and iris pixels that follow skin depth (BL-45). Two eval people have same-shoot photo pairs that would flatter BL-45's own re-run (BL-48). The season-classifier spec does not say the quiz alone cannot reach three seasons (BL-29). And the eval runs only on one Mac, so nobody knows whether a Commons fetch and extraction from CI is stable (BL-15).

## What Changes

- **BL-48:** replace p22/5 and p26/2 with Commons photos of the same people from another shoot and another light, then reset the eval baseline to the untuned run on the swapped set (Oleg's approval, 2026-10-13).
- **BL-45:** the eye white leaves out the irises (with 478 landmarks) and keeps the brightest 30% of what remains; the `dark` cut-off moves from L* 22 to 24. Measured offline on the cached eval set: tuning `dark` false rejects 13 → 4, catch rate 0.8812 → 0.9167, deep-skin tuning `dark` rejects 5/23 → 0/23.
- **BL-29:** the season-classifier spec states that the quiz alone never gives Soft Autumn, Soft Summer or Bright Spring; a new test pins it over all 750 answer sets.
- **BL-15:** a weekly and manual GitHub workflow fetches the photos (cached), runs the eval and reports its metrics against the committed `results.json`, never failing a push on drift. BL-15 is replaced by a narrower item: gate on that run once it has proved stable.

## Members

| Id    | Title                                             | Lane                                          |
| ----- | ------------------------------------------------- | --------------------------------------------- |
| BL-48 | A few eval people have two photos from one shoot  | B — replace, agent picks (Oleg, 2026-10-13)   |
| BL-45 | The dark check rejects deep skin more often       | A                                             |
| BL-29 | The quiz alone never gives three seasons          | B — spec + test (Oleg, 2026-10-13)            |
| BL-15 | CI checks a committed eval result, not the photos | B — weekly report-only run (Oleg, 2026-10-13) |

## Parked

- **BL-39** Skin hue barely separates warm and cool labels — gated on more labeled people or quiz answers for the eval people; every local cue tried moves exact metrics a photo or less on 119 tuning photos. Status corrected.
- **BL-13** Temperature reads cool and moves with the light — gated on BL-45; this batch flips it to `open` when BL-45 ships.

## Base branch

`origin/main` at `004210d` (t15-eval-growth merged). It carries every member id.

## Approved test edits

None. Every member needs only new tests. The baseline reset after the photo swap is approved in `design.md` Decision 3.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `photo-check`: darkness is judged from an eye white that leaves out lids, lashes and irises, so deep skin in good light is not read as dark.
- `color-sampling`: the eye white is the brightest 30% of the eye openings with the irises left out.
- `season-classifier`: the quiz alone never gives Soft Autumn, Soft Summer or Bright Spring.

## Impact

- `packages/analysis/src/sampling/index.ts`, `packages/analysis/src/photo-check/index.ts` and their tests; the live retake decision (`apps/web/src/lib/capture/photo.ts`) and the `eye_white_lab` analytics values move with the measure.
- `packages/analysis/src/classifier/classifier.test.ts` (new test only).
- `evals/manifest.json`, `evals/results.json`, `evals/baseline.json`; two new photos under the git-ignored `evals/photos/`.
- New `.github/workflows/eval-weekly.yml`.
- Behavior text in `openspec/specs/photo-check`, `color-sampling`, `season-classifier`, `chat-plugin` and `analysis-eval`.
- `docs/backlog.md`: BL-48, BL-45, BL-29, BL-15 deleted; one new item replaces BL-15; BL-13 flips to `open`.
