## 1. Tests first (spec: `color-sampling` delta)

- [x] 1.0 Tracker: set T15 to In progress and add a "T15 planned" Log line (the user's answers to this proposal's open questions included), as `t12-mcp-teaser` did at proposal. Verify: the row and Log line show.
- [x] 1.1 Add new cases to `packages/analysis/src/sampling/sampling.test.ts`, citing `{@link openspec/specs/color-sampling/spec.md#requirement-traits-are-white-balanced-against-the-eye-white}` and each scenario anchor. Add only new `describe`/`it` blocks and, if needed, a new paint helper that paints the eye openings. Existing cases stay untouched. The new cases are: a warm light cast; the eye white is reported (468 landmarks); no usable eye white; an eye white at the reference; region colors stay as measured; warmer skin under the same light. Verify they fail for the missing behavior (no `eyeWhite` on `Sample`, `traitsOf` ignores a second argument), not for a syntax or import error.

## 2. Eye white in sampling (design D1, D2)

- [x] 2.1 Move `EYE_OPENINGS` to `sampling/regions.ts`, outside `REGIONS`, with its comment. Move `eyeWhiteOf` and `SCLERA_SHARE` to `sampling/index.ts`. `samplePhoto` returns `eyeWhite: Lab | null` on `Sample`. Re-export from `sampling/index.ts` and `src/index.ts` as the other sampling exports are. Verify: `pnpm --filter @seasonly/analysis test` shows the "eye white is reported" and "no usable eye white" cases pass.
- [x] 2.2 `photo-check/index.ts` imports `EYE_OPENINGS` from sampling and re-exports it under the same name. It reads `sample.eyeWhite` in place of its own measure, still sets `measures.eyeWhite` only after the no-face checks, and its limits are unchanged. Verify: `photo-check.test.ts` and `synthetic-face.test.ts` pass unedited, and `pnpm typecheck` passes for `apps/web` (`photo.ts` unchanged).

## 3. The balance (design D3)

- [x] 3.1 In `traits.ts`, `traitsOf(regions, eyeWhite?)` shifts the skin, hair and eye a\*b\* by `k · (eyeWhite − REF)` before the existing terms, with L\* unchanged. A null or absent eye white means no shift. `REF` starts at the probe's mean (7.6, 6.2) and `k` at 0.5, both provisional until 4.x. `samplePhoto` passes its eye white. Verify: every 1.1 case passes, and the whole existing sampling, photo-check, classifier and pipeline suite passes unedited. If an existing case fails, stop and ask the user before changing it (CLAUDE.md), with the failing assertion and why.

## 4. Measure on the eval set (design D4)

- [x] 4.1 Measure `REF` (mean eye-white a\*, b\* of the usable photos that pass) from a fresh `pnpm eval:run` report, to one decimal, and set it in `traits.ts`. Verify: the value and its photo count are recorded in this task's note.
  - Note (2026-10-12): REF = (a\* 7.6, b\* 6.2), the mean eye white of 59 usable passing photos (16 people); no passing photo lacks an eye white. Unchanged from the probe.
- [x] 4.2 Sweep `k ∈ {0, 0.25, 0.5, 0.75, 1}` with one-off runs (`EVAL_MANIFEST=evals/manifest.json EVAL_RESULTS=<scratchpad>/k-<k>.json pnpm eval:run`). Record agreement, accuracy, false-reject rate and catch rate per `k` in a table in this task's note. Pick `k` by D4's rule; a pick of `k = 0` counts as the 4.5 failure path (the warm-cast scenario needs a real shift). Verify: the table is in the note, and the false-reject rate and catch rate are identical across `k`.
  - Note (2026-10-12), Lab offset, current midpoints:

    | k    | agreement | family agreement | accuracy | false-reject rate | catch rate | temperature SD | clarity SD |
    | ---- | --------- | ---------------- | -------- | ----------------- | ---------- | -------------- | ---------- |
    | 0    | 0.6021    | 0.7177           | 0.1806   | 0.1806            | 0.887      | 0.338          | 0.188      |
    | 0.25 | 0.5708    | 0.7333           | 0.1528   | 0.1806            | 0.887      | 0.291          | 0.175      |
    | 0.5  | 0.5729    | 0.7698           | 0.1250   | 0.1806            | 0.887      | 0.283          | 0.164      |
    | 0.75 | 0.5625    | 0.8219           | 0.1111   | 0.1806            | 0.887      | 0.279          | 0.160      |
    | 1    | 0.5052    | 0.7385           | 0.1111   | 0.1806            | 0.887      | 0.276          | 0.161      |

    SD = mean within-person standard deviation of the trait. False-reject and catch rates are identical across k. D4's rule picks k = 0: the 4.5 failure path. The balance does steady temperature and clarity and raises family agreement, but exact-season agreement falls.
- [ ] 4.3 With that `k`, re-check the `SKIN_HUE`, `HAIR_HUE` and `SKIN_C` midpoints at the corrected set's centers, one at a time. Keep each only if agreement rises and no other ratchet falls. Verify: a sweep row per midpoint tried is in the note.
  - Note (2026-10-12): n/a under D4, since k = 0. Balanced centers: skin hue 46.6° (k 0) to 47.8° (k 1); skin C\*ab 26.3 to 25.9, so SKIN_C stays; hair hue 47.0° (k 0), 41.7° (k 0.25), 39.4° (k 0.5). Rows tried (agreement at k 0 / 0.25 / 0.5 / 0.75 / 1): SKIN_HUE 47: 0.5344 / 0.5469 / 0.5521 / 0.5125 / 0.4844. HAIR_HUE 39: 0.5396 / 0.6302 / 0.5677 / 0.5542 / 0.4896. Exploratory, beyond D4's one-at-a-time rule: both moved, 0.55 / 0.5313 / 0.5208 / 0.4844 / 0.4719; HAIR_HUE 36–45 at k 0.25 all give 0.6271–0.6302 (accuracy 0.1389–0.1528). A finer k grid (0.15–0.35) was looked at after the fact and is not used.
- [ ] 4.4 Overfit check (D4.4). Record the per-person agreement change against the committed `results.json`, and reject the setting if two or fewer people carry the gain. Record the largest shift in `REF` when each person is left out, and whether it changes any person's season. Verify: both numbers are in the note and in the `traits.ts` comment beside the constants, the way `SKIN_C`'s measurement is recorded today.
  - Note (2026-10-12), for the exploratory best (k 0.25, HAIR_HUE 42, agreement 0.6302): per-person change against results.json: p02 +0.25, p04 +0.2, p11 +0.25, p08 −0.25, the other 12 unchanged (3 gainers, passes the "more than two" rule narrowly). Largest REF shift with one person left out: 0.66 (a\*b\* units). Leaving p05 out moves p09's season, so D4.4 rejects the setting (next smaller k is 0).
- [ ] 4.5 If no setting beats agreement 0.6021 with the false-reject rate and catch rate at or above baseline: try D3's von Kries alternative (update design.md first). If that also fails, stop and report the sweep tables to the user. Do not lower any baseline other than accuracy without their approval, recorded here. Verify: either 4.6 holds, or the user's decision is recorded in this task.
- [ ] 4.6 `pnpm fix`, then `pnpm eval:run` with the final constants. Raise `evals/baseline.json` to the new numbers. Accuracy is the one exception: if it fell, lower its baseline to the new result. The user approved trading accuracy for agreement on 2026-10-12, in the proposal conversation. Commit `results.json` and `baseline.json` with the code. Verify: `pnpm test:eval` passes, and agreement in `results.json` is above 0.6021.

## 5. Gate

- [ ] 5.1 `pnpm fix`, then `pnpm test` (format, lint, typecheck, unit with the citation gate, eval gate). Verify: all green locally. CI runs `ci.yml`, `openspec.yml` and `e2e.yml` green on the PR.
- [ ] 5.2 Manual sanity check on the device path. The user approved this paid run on 2026-10-12 with a budget of at most $1; each full analysis makes one AI Gateway vision call. In the user's Chrome (memory "manual photo tests"), on `pnpm dev`, analyze one selfie in daylight and one under warm indoor light, and confirm both reach the reveal with no console errors. Stop before the spend could pass $1: a handful of analyses at most; check the AI Gateway usage if more are needed. Verify: the two seasons and traits, plus the number of vision calls made, are recorded in this task's note.

## 6. Review, backlog, plan and archive

- [ ] 6.1 Run a phase review in a fresh `general-purpose` subagent (`phase-review` skill, `/code-review high`) and fix its findings. Verify: the findings and their fixes are listed in this task's note.
- [ ] 6.2 Backlog: delete BL-13 from `docs/backlog.md`. Log every unfixed review finding and every defect found on the way under the next `BL-nn` (from BL-39), including the accuracy finding if it still holds: skin hue does not separate the warm and cool labels (a 3° gap). Name the ids in the PR. Verify: `docs/backlog.md` has no BL-13, and `_Next id:_` is bumped for each new item.
- [ ] 6.3 After `/opsx:archive`:
  - In `openspec/specs/color-sampling/spec.md`, update the Public Interface (`Sample.eyeWhite`, `traitsOf(regions, eyeWhite?)`), the Behavior (the balance, `REF`, `k` and any retuned midpoint with its measured value) and the Edge Cases (no eye white, glasses or tinted lenses below the tint limit).
  - In `openspec/specs/analysis-eval/spec.md`, update the Behavior "Measured on" line with the new numbers and date.
  - Verify: `openspec validate --specs` passes.
- [ ] 6.4 Plan (Claude Docs concept, https://claude.ai/code/artifact/23434923-c1ff-47d6-8ce6-7c86fd14856c):
  - Set T15 to Done, with the new agreement, in the Tracker.
  - Add a Tracker Log line naming the result and any new BL ids.
  - Mark Phase 3 item 1 (`t15-white-balance`) done.
  - Remove the stale `t6-eval-set` "Carried in" item on result stability across one person's photos (`t6-eval-set` built the agreement metric).
  - Verify: the Tracker row and the Log line show.
- [ ] 6.5 Push the branch, open a PR to `main` that names the BL ids added and removed, and turn on auto-merge with a merge commit (never squash). Verify: the PR shows auto-merge enabled.
