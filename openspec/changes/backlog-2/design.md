## Context

See proposal.md for why. Triage ran on `origin/main` at `65fddfe` with seven investigated items: one Plan investigator per item, plus two free local sweeps over the cached eval set (scratch scripts outside the repo, outputs outside the repo, `git status` clean after each; the unchanged check reproduced `results.json` exactly before either sweep was read).

| Id    | Lane | Why                                                                                                     |
| ----- | ---- | ------------------------------------------------------------------------------------------------------- |
| BL-52 | A    | `fetchMissing` fires all downloads back to back with no 429 handling; fix is local to `evals/fetch.ts`. |
| BL-40 | A    | `checkPhoto` drops the sample it took; an optional `traits` on a pass changes no existing test.         |
| BL-17 | B    | Moves code out of two run-only vitest files; approved by Oleg (Decision 1).                             |
| BL-50 | D    | Triage sweep: no tint limit keeps all four ratchets (table below). Gated on more photos.                |
| BL-13 | D    | Triage re-run of t15's D6 on the current eye white: no strength passes (table below).                   |
| BL-51 | D    | 1 production `photo_checked` event since the backlog-1 deploy; needs volume. Then lane C.               |
| BL-39 | D    | Gate unmet: still 26 tuning people, no quiz answers for eval people.                                    |
| BL-49 | D    | Needs four clean weekly runs; zero so far. BL-52 is its blocker.                                        |

## Goals / Non-Goals

**Goals:** a weekly eval run that gets past the fetch; one sampling pass per passing photo; the two analysis-eval scenarios proven where they live.

**Non-Goals:** splitting the weekly workflow's cache into restore and save steps so a failed run keeps the photos it fetched. With pacing the full fetch is expected to succeed; a partial cache saved under the manifest-hash key would never be re-saved, which is worse. No change to any metric, limit or baseline.

## Members

### BL-52 — pace the fetch and retry 429

`fetchMissing(manifest, dir, fetchImpl)` gains an options argument carrying an injectable `sleep` (default a real timer), so tests never wait. Between downloads (not before the first) it sleeps `FETCH_PAUSE_MS`. A 429 is retried up to `MAX_RETRIES` times; each wait is `Retry-After` in seconds (an HTTP date is also accepted) capped at `MAX_RETRY_AFTER_MS`, or `BACKOFF_MS × 2^attempt` without one. Any other non-OK status fails at once, as today. The final failure message keeps `HTTP 429` and names the entry. `eval.run.ts` (through BL-17's `run.ts`) calls the same function, so `eval:run` is paced too. Files: `evals/fetch.ts`, `evals/fetch.test.ts` (new `it`s only).

Correction to the bullet: the loop does not stop at the first 429. It collects every failure and throws once at the end; the run failed because all 180 requests left with no gap and 154 were refused within 3 s. The User-Agent is already descriptive (`SeasonlyEval/1.0 (https://seasonly.me; …)`), so it is not the cause. The failed run's log shows no `Retry-After` value, because the message keeps only the status.

### BL-40 — the check returns the traits it sampled

`PhotoCheck` gains `traits?: Traits`, set only when `problem` is null, from the `samplePhoto` call `checkPhoto` already makes. `checkImage` (`apps/web/src/lib/capture/photo.ts`) and `analyze` in `evals/pipeline.ts` read `check.traits` and stop importing `samplePhoto`. Optional rather than `Traits | null` so the exact `toEqual` at `photo-check.test.ts` (no-face case) stays green without an edit. Files: `packages/analysis/src/photo-check/index.ts`, `apps/web/src/lib/capture/photo.ts`, `evals/pipeline.ts`, `photo-check.test.ts` (new `it`s only). The Public Interface's `PhotoCheck` block and Behavior step 2 of `photo-check`, and the Behavior sentence "Node then runs … for a pass `samplePhoto` and `classify`" of `analysis-eval`, are hand-edited (archive keeps text outside requirement blocks as is).

### BL-17 — reach the run and the tally from unit tests

The body of `eval.run.ts`'s `it()` moves into `measure()` in a new `evals/run.ts`, taking the manifest, the photo and cache directories, the results path, the fetch implementation and an extractor factory (so a unit test never loads `extract.ts`, which pulls in Playwright). `eval.run.ts` keeps the `EVAL_MANIFEST`/`EVAL_RESULTS` guard, calls `measure()` and keeps its one `expect`. The inline tally in `eval-vision.smoke.ts` moves into a pure `tallyVerdicts` in a new `evals/vision.ts`, with the same output keys (`sent`, `usable`, `severalFaces`), so `vision-results.json` needs no paid re-run; the verdict mapping stays in the smoke file. New tests: `evals/run.test.ts` (one absent photo, stubbed fetch answers 404: rejects naming it, the extractor factory is never called, a pre-seeded results file is byte-identical, no `report.json`) and `evals/vision.test.ts` (an `expect: pass` photo with verdict `several-faces` counts under `usable["several-faces"]`). The existing citation of "A photo cannot be had" in `results.test.ts` stays; the citation gate allows several. Order: after BL-52, since `measure()` passes through BL-52's fetch options.

## Decisions

### Decision 1 — BL-17 edits two run-only vitest files

The run body and the vision tally sit inside `it()` blocks of `evals/eval.run.ts` and the paid `apps/web/src/lib/report-text/eval-vision.smoke.ts`. The repo's classifiers (citation gate, eval input hash, spec hook) treat these as code, but they are vitest files, and CLAUDE.md makes any edit to an existing test the user's call.

- **Option A:** move the code out into `evals/run.ts` and `evals/vision.ts`; both files become thin wrappers with the same `expect`s; new unit tests cite the two scenarios. Nothing paid is run.
- **Option B:** leave both files; BL-17 parks and the batch drops to two fixes.

Trade-off: A edits a paid file that cannot be run to check it (typecheck and lint cover it); B leaves both scenarios proven one level down or not at all.

**Recommendation:** A.

**Answer:** A — approve the harness edits (Oleg, 2026-10-13).

### Decision 2 — BL-52's numbers (technical, decided in triage)

Pause 1 s between downloads (180 photos ≈ 3 min, inside the workflow's 30-minute job and `eval:run`'s 30-minute test timeout); 4 retries on 429; `Retry-After` capped at 60 s; backoff 5 s doubling without one. A photo refused every time costs up to 4 min, so a Commons that refuses everything ends at the job's 30-minute limit, a red run like today's. Constants sit beside `FETCH_TIMEOUT_MS`.

### Decision 3 — BL-40's shape (technical, decided in triage)

`traits?: Traits` on a pass only, not the whole `Sample`: both callers read only `.traits`, and an optional field changes no existing test.

## Parked evidence

### BL-50 — tint limit sweep (tuning set, cached extractions, 2026-10-13)

Rule fixed before the run: all four ratchets at baseline or better, catch margin of three or more copies, fewer than 12 tuning `tint` false rejects.

| C\*ab limit | Agreement | Catch (caught / needed) | FR rate | Tint FR | Holdout agreement |
| ----------- | --------- | ----------------------- | ------- | ------- | ----------------- |
| 22 (today)  | 0.5733    | 0.9167 (253 / 253)      | 0.2269  | 12      | 0.55              |
| 22.1        | 0.5700    | 0.9176 (256 / 256)      | 0.2185  | 11      | 0.5375            |
| 22.2–22.6   | 0.5567    | 0.9193 (262 / 262)      | 0.2017  | 9       | 0.5375            |
| 22.7        | 0.5527    | 0.9167 (264 / 265)      | 0.1933  | 8       | 0.5375            |
| 24          | 0.5460    | 0.8935                  | 0.1849  | 7       | 0.5375            |
| 27          | 0.5387    | 0.8548                  | 0.1513  | 3       | 0.5375            |

Every limit above 22 lowers agreement: the photos it lets through land off their person's mode season. None qualifies.

### BL-13 — t15 D6 re-run on the iris-free eye white (2026-10-13)

Reference a\* 6.21, b\* 5.76 (mean of 95 passing tuning originals). Pass rule: tuning agreement +0.0232 or more with temperature spread down; holdout spread down and agreement down by 0.036 or less.

| k    | Tuning agreement | Tuning temp spread | Accuracy | Holdout agreement | Holdout temp spread |
| ---- | ---------------- | ------------------ | -------- | ----------------- | ------------------- |
| 0    | 0.5733           | 0.3297             | 0.1765   | 0.5500            | 0.2040              |
| 0.25 | 0.5800           | 0.2884             | 0.1681   | 0.4875            | 0.1949              |
| 0.5  | 0.5613           | 0.2735             | 0.1681   | 0.4979            | 0.2093              |
| 0.75 | 0.5513           | 0.2663             | 0.1429   | 0.5604            | 0.2399              |
| 1    | 0.5320           | 0.2777             | 0.1345   | 0.5292            | 0.2780              |

No k passes. The bullet's "parked again" verdict, measured on the old measure, holds on the new one.

## Risks / Trade-offs

- [Commons still refuses a paced fetch] → The failure names every refused entry with `HTTP 429`; the pause and retry constants are one-line changes, and BL-49 stays deferred until four clean runs.
- [`results.json` goes stale] → `fetch.ts`, `pipeline.ts`, the new `evals/*.ts` files, `photo-check/index.ts` and `capture/photo.ts` are all hashed inputs. One free local `pnpm eval:run` after all code tasks regenerates it; metrics must match the committed ones exactly (no behavior change), and any difference is a bug, not a new baseline.
- [The paid smoke file cannot be run to check it] → Typecheck and lint cover it; the tally it now imports has a unit test.
