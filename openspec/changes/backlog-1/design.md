## Context

Triage ran on `origin/main` at `004210d`, the day `t15-eval-growth` merged: 34 people, 180 photos, 26 tuning and 8 holdout people. Every eval number below comes from read-only scripts over the git-ignored cache (`evals/photos/.cache/*.json.gz`, `report.json`) that reproduce the committed `results.json` exactly at the current settings. Nothing was written to tracked files and nothing paid ran.

Skin bands, as judged on the t15 review page and used for every per-band figure here: original set p01–p16, medium p17–p25, deep p26–p34.

## Lanes

| Id    | Lane | Why                                                                                                                                   |
| ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| BL-48 | B    | Replacing photos Oleg approved needs his call; answered: replace, agent picks.                                                        |
| BL-45 | A    | An offline sweep found a measure that passes every criterion with no existing test edit.                                              |
| BL-29 | B    | Re-weight the quiz or spec the gap; answered: spec + test.                                                                            |
| BL-15 | B    | Scheduled Commons load and what the CI run may decide; answered: weekly report-only.                                                  |
| BL-39 | D    | Every cue the eval can test today moves exact metrics a photo or less; needs more labeled people or quiz answers for the eval people. |
| BL-13 | D    | Gated on BL-45, unmet until it ships.                                                                                                 |

## Goals / Non-Goals

**Goals:** fix the `dark` check's bias against deep skin without losing its catch rate; clean the eval set before BL-45 is judged on it; write the quiz's reach into the spec; start building evidence that the eval runs in CI.

**Non-Goals:** a warm/cool cue (BL-39), a white balance (BL-13), gating CI on a fresh eval run, a skin-band field in the manifest (the band ids above are enough to tally once).

## Members

### BL-48 — replace the same-shoot photos (first, before any eval run)

p22/4 and p22/5 are one Beyoncé concert (Tottenham, 2023-06-01); p26/1 and p26/2 are one Stacey Abrams event (Mesa Arts Center, 2021-10-12, confirmed from both Commons files' metadata in triage). Replace the higher-numbered photo of each pair, p22/5 and p26/2, by the rules in Decision 2, then run the eval on the old code and reset the baseline to that run (Decision 3). Today p22/5 fails `tint` and p26/2 fails `dark`, so the pairs move no metric yet; BL-45 would let p26/2 pass and flatter its own result. Files: `evals/manifest.json`, `evals/results.json`, `evals/baseline.json`, the "Measured on" paragraph in `openspec/specs/analysis-eval/spec.md` Behavior.

### BL-45 — an eye white that does not follow skin depth

The item names the wrong mechanism: the check already reads the eye white, not overall brightness (`photo-check/index.ts`, spec requirement "Darkness is judged from the eye whites, not the skin"). The real cause: `eyeWhiteOf` (`sampling/index.ts`) takes the brightest 40% of the whole eye opening, and that slice is mostly lids, lashes and iris. On passing photos the measured eye white is darker than the skin in 100% of original photos and 82% of deep ones, so the reading follows skin depth and the fixed L* 22 cut-off falls hardest on deep skin. A cut-off move alone cannot fix it: at L* 18 the tuning `dark` false rejects fall 14 → 9 but the catch rate falls 75/87 → 66/87.

The fix, with 478 landmarks: drop the pixels inside each iris circle (center landmark 468 / 473, radius the mean distance to its four ring landmarks 469–472 / 474–477), sort the rest by L*, keep the brightest 30% (`SCLERA_SHARE` 0.4 → 0.3), then `robustCenter` as now. With 468 landmarks there is no iris to drop. The null rule (fewer than `MIN_REGION_PIXELS` pixels) is counted after the irises are left out, with no fallback to the whole opening (changed in the phase review: a squint on a small face could otherwise leave a few pixels or none). `MIN_EYE_WHITE_L` 22 → 24; the tint limit stays C*ab 22. Files: `packages/analysis/src/sampling/index.ts`, `packages/analysis/src/photo-check/index.ts` (constant and its tuning comment), new tests in `sampling.test.ts` and `photo-check.test.ts`, `evals/results.json`, `evals/baseline.json` (raised), Behavior text in `openspec/specs/photo-check/spec.md` (item 4 and the tuning paragraph) and `openspec/specs/color-sampling/spec.md` (the eye-white paragraph, "brightest 40%"), the `Sample.eyeWhite` comment.

Sweep on triage's reduced set (p22/5 and p26/2 left out), tuning set selection only:

| Variant                     | Cut-off | Tuning catch | Tuning dark FR | Tuning FR  | Dark rejects orig / med / deep | Deep tuning dark | Holdout catch | Tuning agreement | Tuning accuracy |
| --------------------------- | ------- | ------------ | -------------- | ---------- | ------------------------------ | ---------------- | ------------- | ---------------- | --------------- |
| today, share 0.4            | 22      | 0.8812       | 13             | 0.2627     | 6/72, 4/41, 8/38               | 5/23             | 0.8841        | 0.5687           | 0.1356          |
| share 0.25                  | 21.5    | 0.8854       | 4              | 0.1864     | 4, 2, 2                        | 0                | 0.8333        | 0.5693           | 0.1780          |
| **iris dropped, share 0.3** | **24**  | **0.9167**   | **4**          | **0.2203** | **4, 2, 1**                    | **0**            | **0.8696**    | **0.5733**       | **0.1780**      |
| iris dropped, share 0.3     | 23.5    | 0.8961       | 3              | 0.2119     | 3, 2, 1                        | 0                | 0.8551        | 0.5733           | 0.1780          |

The share-0.25 variant has the lowest tuning FR, but its usable cut-off window is 21–21.5, its catch margin is one darkened copy and its agreement margin is 0.0006. The chosen variant keeps about ten copies of catch margin, passes at both 23.5 and 24, and loses less catch on the holdout. It costs four more `tint` rejects (12 vs 8). The eye white feeds no trait, so agreement and accuracy move only because a different set of photos passes. All existing fixtures behave the same under it (checked in memory with `synthetic-face.ts`): the L* 19.5 and 18.6 `dark` cases, the order test, the L* 33 pass, the deepest Monk tone and the one-colour eye-opening sampling cases.

Landmarks: the live check (`apps/web/src/lib/capture/mediapipe.ts`) and the eval extraction (`evals/extract.ts`) both use MediaPipe's `FaceLandmarker`, which returns 478 landmarks with irises, so the swept iris-dropped measure is what production runs. The 468 path exists only for synthetic inputs.

Holdout caveat: deep holdout people's total rejects stay 6/15 for every variant (their `dark` rejects become `filter` or `tint`). The gain is shown on the tuning set only.

### BL-29 — the quiz's reach goes into the spec

Only `hair: dark` touches clarity (+0.3, `classifier/reference.ts`), so quiz-only clarity is 0 or 0.3 and never reaches the Soft points (clarity −0.8) or Bright Spring (warm, light, clarity 0.9). Over all 750 answer sets the quiz gives 9 seasons, not the 10 the item and `t12-mcp-teaser` claim: 12 minus Soft Autumn, Soft Summer and Bright Spring. No copy claims otherwise: the web quiz-only note says a selfie is "more precise", and the plugin shows only the family. A new test in `classifier.test.ts` enumerates the 750 sets (the generator pattern of `apps/web/src/lib/mcp/result.test.ts`) and asserts none of the three appears; pinning "never these three" is less brittle than "exactly these nine". Doc edits: an Edge Cases line in `openspec/specs/season-classifier/spec.md`, and `openspec/specs/chat-plugin/spec.md` Edge Cases "Unreachable subtypes" repointed from "(BL-29)" to the season-classifier requirement.

### BL-15 — a weekly eval run in CI that reports

New `.github/workflows/eval-weekly.yml`, on `schedule` (weekly) and `workflow_dispatch`, never on push: checkout, pnpm install, `pnpm exec playwright install --with-deps chromium` (the extraction drives Chromium; `ci.yml` has none), `actions/cache` on `evals/photos` on its `pNN` folders keyed by `hashFiles('evals/manifest.json')`, and a second cache on `evals/photos/.cache` (the MediaPipe output) keyed by the manifest and the extractor's inputs, neither with `restore-keys` (split in the phase review so a web dependency bump never re-downloads the photos), `pnpm eval:fetch`, then `EVAL_RESULTS=$RUNNER_TEMP/results.json pnpm eval:run`, then a step that prints the tuning and holdout metrics beside the committed `evals/results.json` in the job summary. A failed fetch or extraction fails the job, which is the stability evidence; metric drift only shows in the summary. Timeout 30 minutes (a cold extraction of 180 photos is unmeasured). The compare is a few lines of inline `node`, or `scripts/eval-compare.ts` if it outgrows a step. YAML and `scripts/**` are exempt from the spec hook, and a workflow has no test to cite a scenario, so this member has no delta. The workflow does not do what BL-15 asks in full (gate on a CI run), so `/backlog-fix` deletes BL-15 and adds one narrower item at the `_Next id:_` number: gate the eval on the CI run, deferred until four consecutive weekly runs fetch cleanly and match the committed metrics within the drift the spec allows another machine.

## Decisions

### 1. BL-29 — re-weight the quiz, or spec the gap

- **(a) Re-weight:** give `hair: medium` and `hair: red` clarity weights so all 12 seasons are reachable. Breaks the rule that neutral answers add nothing, edits two existing tests ("returns nothing when every answer is neutral", "count as nothing when unsure or neutral"), moves many photo+quiz results, and the eval cannot see it (its photos carry no quiz answers).
- **(b) Spec + test:** state in season-classifier that the quiz alone never gives the three; a new test pins it. No existing test edit, no result moves.
- **Trade-off:** (a) reaches more seasons on unmeasured weights; (b) documents the limit the copy already works around.
- **Recommendation:** (b).

**Answer:** (b) spec + test (Oleg, 2026-10-13).

### 2. BL-48 — drop, replace, or leave the same-shoot photos

- **(a) Leave them** and retrigger the item to "before BL-45's run".
- **(b) Drop** p22/5 and p26/2 now, by the rule "the higher-numbered photo of each pair".
- **(c) Replace** them with new Commons photos.
- **Recommendation:** (b), replacements at the next growth.

**Answer:** (c) replace, and the agent picks without per-photo approval: "don't wait my approval, just pick and do the best you can" (Oleg, 2026-10-13).

Replacement rules, fixed now so the pick is not steered by results:

- Same person (p22 Beyoncé, holdout, `true-spring`; p26 Stacey Abrams, tuning, `soft-autumn`); `season` and `holdout` copy from the person's other entries.
- A different shoot and date from every other photo of that person (check each candidate's Commons metadata), and a light condition that person does not already have; prefer it not be another stage photo. p22 already has indoor-flash, indoor-warm, daylight and stage-blue; p26 has stage-dark, daylight and indoor. Acceptable new lights: red carpet, outdoor shade, overcast, mixed outdoor at night, flash (p26), or a second daylight or indoor photo in clearly different light from a different shoot when nothing else qualifies. Candid or event photos over studio portraits.
- A free licence (CC0, PD, CC BY, CC BY-SA), face roughly a tenth of the long side or more, eyes open, no heavy filter (t15 Decision 1).
- Pick from the Commons file page and the photo alone. Never run `checkPhoto` or the eval on a candidate before it is in the manifest.
- Keep the file numbers: `p22/5-<light>.jpg`, `p26/2-<light>.jpg`, with `source`, `sha256`, `license`, `author` filled as for the other entries; `pnpm eval:fetch` verifies the hash.
- If no candidate meets the rules for a person after a reasonable search, drop that photo instead (option b) and say so in the PR.

### 3. Baseline after the photo swap

- **(a) Reset:** the untuned run on the swapped set (old code) becomes `baseline.json`, as when the set grew in `t15-eval-growth`; BL-45 is judged against it.
- **(b) Never lower:** the swap ships only with BL-45 and only if the pair beats today's baseline; otherwise both photos are dropped.
- **Recommendation:** (a), keeps the two effects apart.

**Answer:** (a) reset after the swap (Oleg, 2026-10-13).

### 4. BL-45 — which measure, and what if the swapped set disagrees (technical, decided in triage)

Iris dropped, share 0.3, cut-off 24, for its margins (table above). BL-45 is judged on the swapped set against the Decision 3 baseline, on the tuning set only. It ships when all hold: catch rate ≥ baseline; strictly fewer tuning `dark` false rejects; a lower deep-band (p26–p34) `dark`-reject share than the baseline run; agreement, label accuracy and false-reject rate at baseline or better. If the chosen variant fails any of them on the swapped set, re-run the triage grid (share 0.15–0.4, iris kept or dropped, cut-off 5–45 in steps of 0.5) on the tuning set and take the passing variant with the lowest tuning false-reject rate, ties to the higher catch rate. If none passes, BL-45 does not ship: revert its code, rewrite its bullet with the real mechanism and the sweep table, and gate it on more deep-skin photos; BL-13 then stays gated.

### 5. BL-15 — how far the CI run goes

- **(a) Keep deferred**, rewriting the stale trigger (180 photos, not about 100).
- **(b) Weekly and manual report-only workflow**, cached fetch, never failing a push on drift.
- **(c) Gate every push** on a CI eval run now.
- **Recommendation:** (b). The repo is public, so Actions minutes cost nothing; Commons is hit only on a manifest change or cache eviction, one photo at a time with the compliant User-Agent `evals/fetch.ts` already sends.

**Answer:** (b) weekly report-only run (Oleg, 2026-10-13).

## Corrections to the bullets

- **BL-45** says the check "reads overall brightness" and proposes measuring the eye white. It already measures the eye white; the measure itself is what reads skin (see BL-45 above).
- **BL-29** says the quiz reaches 10 seasons. It reaches 9.
- **BL-48** says the pairs push agreement up now. They do not yet: p22/5 fails `tint`, p26/2 fails `dark`, and p22 is in the holdout. The harm starts when BL-45 lets p26/2 pass.
- **BL-39** figures are from the 16-person set. On today's 26 tuning people: per-person skin hue warm 49.2°, cool 46.9° (person SD 9.2°); label accuracy 0.1345, not 0.18; the photo classifier gets warm vs cool right on 0.425 of passing tuning photos. Iris hue was tried (warm/cool right 0.425 → about 0.5, exact metrics flat or worse); lips separate nothing (gap/SD 0.10). Its status now says what it waits for.
- **BL-15**'s trigger counts "about 100" photos; there are 180, and no workflow could ever produce the evidence it waits for.

## Risks / Trade-offs

- BL-45 is chosen on 119 tuning photos; the deep-skin gain does not show on the 8-person holdout. Accepted: the holdout is too small to select on, and it is reported.
- The new measure moves the live retake decision and the `eye_white_lab` analytics values; old and new events are not comparable after the deploy.
- The replacement photos are picked without Oleg's review, by his choice; the rules above keep the pick independent of results.
- A Linux run may differ slightly from the Mac run; the weekly workflow only reports it.
