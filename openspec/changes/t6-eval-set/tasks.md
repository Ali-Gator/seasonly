## 1. Harness setup

- [ ] 1.1 Wire the commands (design decision 2):
  - `vitest.config.ts` also includes `evals/**/*.test.ts`;
  - a new `vitest.config.eval-run.ts` includes `evals/**/*.run.ts`, with the `@/` alias and a long timeout;
  - in `package.json`, `eval:fetch` is `node evals/fetch.ts`, `eval:run` uses the new config, `eval:vision` is `vitest run --config vitest.config.smoke.ts eval-vision`, and `test:smoke` is narrowed to `report-text.smoke`.

  Done when `pnpm test:unit` and `pnpm test:eval` still pass, and `pnpm eval:run --passWithNoTests` starts and finds no file until 3.4 lands.

- [ ] 1.2 Export `MAX_SIDE` from `apps/web/src/lib/capture/photo.ts`, and `WASM`, `FACE_MODEL` and `HAIR_MODEL` from `mediapipe.ts`. There is no behavior change. Done when `pnpm typecheck`, `pnpm test:unit` and `e2e/analysis-flow.spec.ts` pass.

## 2. Tests first

Cite scenarios at `openspec/specs/analysis-eval/spec.md#…`. Add new files only. `evals/manifest.eval.ts` stays as it is, unless the user approves an edit.

- [ ] 2.1 `evals/manifest.test.ts` covers the new manifest fields:
  - a Commons entry (`source`, `sha256`, `license`, `author`, no `expect`) is valid and read as `pass`;
  - a `source` without `sha256`, or without `license`, is reported;
  - `expect: "blurry"` is reported;
  - an old-shape entry with none of the new fields stays valid.

  Done when it fails against today's `manifestProblems`.

- [ ] 2.2 `evals/fetch.test.ts`, with `fetch` stubbed and a temp directory:
  - a missing file is written when its bytes hash right;
  - a hash mismatch or an HTTP error fails, naming the entry, and leaves no file;
  - a present file is not downloaded.

  Done when it fails because `evals/fetch.ts` does not exist.

- [ ] 2.3 `evals/metrics.test.ts` runs on hand-built outcomes, with no photos. It covers:
  - every scenario of agreement, the tie and the person who is not measured;
  - accuracy, right family but wrong season;
  - the false-reject breakdown and the expected-problem rate;
  - variants caught and missed;
  - an empty set giving null metrics.

  Done when it fails because `evals/metrics.ts` does not exist.

- [ ] 2.4 `evals/gate.test.ts` covers the gate logic with fixture results and baselines:
  - a stale hash fails with "run pnpm eval:run";
  - agreement 0.70 against a baseline of 0.72 fails, naming both values;
  - a lower false-reject rate passes;
  - null metrics on both sides pass.

  The hash is stable under CRLF and path order, and changes when one hashed file changes. Done when it fails for the missing module.

- [ ] 2.5 `evals/variants.test.ts` covers the synthetic variants (design decision 4) on a small RGBA buffer:
  - darkened is channel × 0.35;
  - the warm cast is R × 1.15 and B × 0.7, clamped;
  - grayscale is Rec. 709 luma;
  - the input buffer is unchanged.

  Done when it fails for the missing module.

- [ ] 2.6 Show that no vision call runs in a test suite. Add a case to `evals/gate.test.ts`: `eval-vision.smoke.ts` matches no `include` glob of `vitest.config.ts`, `vitest.config.eval.ts`, `vitest.config.eval-run.ts` or `playwright.config.ts`. Done when it passes after 1.1.

## 3. Harness code

- [ ] 3.1 `evals/manifest.ts`: add the optional fields `source`, `sha256`, `license`, `author` and `expect`, and their checks. Done when 2.1 passes and `evals/manifest.eval.ts` still passes unedited.
- [ ] 3.2 `evals/fetch.ts`: download each missing manifest file, check its SHA-256, write it atomically, and report what was fetched. Runnable as `pnpm eval:fetch`. Done when 2.2 passes.
- [ ] 3.3 `evals/metrics.ts`, `evals/variants.ts` and `evals/gate.ts`:
  - pure functions for the metrics, the variants, the input hash (design decision 3's file list) and the comparison with the baseline;
  - `results.json` and `baseline.json` as committed files, with null metrics for the empty set.

  Done when 2.3–2.5 pass.

- [ ] 3.4 `evals/extract.ts` and `evals/eval.run.ts`. The run:
  1. fetches;
  2. for each photo, uses the cache or runs the Chromium extractor (design decision 1), which serves the installed `vision_bundle.mjs` and reuses the app's exported constants;
  3. runs `pickFace`, then `checkPhoto`, then `samplePhoto` and `classify` (`answers: {}`), plus the variants on each passing usable photo;
  4. writes the face crop with `cropBox`, at JPEG 0.85, next to the cache entry for 6.1;
  5. writes `evals/results.json`, and the git-ignored `evals/photos/.cache/report.json` with per-photo measures and traits.

  Done when two checks pass:
  - a run on the empty manifest writes null metrics and a hash that `test:eval` accepts;
  - a one-off run on `e2e/fixtures/face.jpg`, listed in a temporary manifest that is not committed, reproduces the pass the E2E sees.

- [ ] 3.5 `evals/gate.eval.ts` reads the committed `results.json` and `baseline.json`, recomputes the hash and fails as specified. Done when `pnpm test:eval` passes on the empty set, and fails after a throwaway edit to `packages/analysis/src/sampling/traits.ts` (then reverted).

## 4. The photo set (user approval)

- [ ] 4.1 Search Wikimedia Commons for candidates (design decision 5):
  - 12–16 public figures, with 4–6 photos each in clearly different light;
  - skin tones from light to deep, and all four season families;
  - at least 4 photos with a second person visible;
  - at least 3 genuinely dim or color-cast photos.

  Note each photo's file page, original URL, license and author, a proposed season with a one-line reason, and a proposed `expect`. Done when the list is drafted.

- [ ] 4.2 Publish the candidate list as a private review page: Commons thumbnails, source, license, author, the proposed season and `expect`. **The user approves or edits** the people, photos, labels and expected outcomes. Done when the user says yes.
- [ ] 4.3 Download the approved photos, compute their SHA-256, and write the manifest entries (`p01`… person ids). Done when `pnpm eval:fetch` reports nothing missing, and `pnpm test:eval`'s manifest test passes.

## 5. Measure, then tune

- [ ] 5.1 First run, untuned. Commit its `results.json` and copy its metrics to `baseline.json` as v0. Also record v0 here, in the Tracker log and in the PR. If a variant factor is not plainly bad to the eye on the first run, adjust it once before recording v0. Done when `pnpm test:eval` passes with v0.
- [ ] 5.2 Tune the photo check (design decision 6, step 2): a small grid over eye-white L*, eye-white C*ab, the skin-hue floor and the several-faces width, using cached runs. Keep the setting with the fewest false rejects whose catch rate is at least v0's. Done when the chosen values are in the code. Any existing test that pins a moved limit (for example `photo-check.test.ts` L* 25 and C*ab 25) is listed for the user, and **edited only with the user's approval**.
- [ ] 5.3 Update `photo-check` with the new limits and the measured rates through `/opsx:update`, replacing "provisional", and do the same for `capture-flow` if the several-faces width moved. If `face.jpg` now fails, swap the fixture per its README. Done when `openspec validate t6-eval-set` passes, along with `pnpm test:unit`, `pnpm test:eval` (fresh results) and `e2e/analysis-flow.spec.ts`.
- [ ] 5.4 Tune sampling and the classifier (design decision 6, step 3). From `report.json`, find what light moves in each person's traits, and adjust the fewest `traits.ts` and `reference.ts` constants that explain it. Keep a change only if agreement and label accuracy both rise. Existing tests that pin a moved constant wait for the user's approval. Done when a fresh `results.json` beats the 5.3 numbers on both. If no change earns its place, record that, and leave the constants and their specs as they are.
- [ ] 5.5 Update `color-sampling` and `season-classifier` with the moved constants, and drop "provisional" where a constant is now measured, through `/opsx:update`. Done when `openspec validate t6-eval-set` passes, along with `pnpm test:unit` and `pnpm test:eval`.

## 6. Paid vision run (user approval)

- [ ] 6.1 `apps/web/src/lib/report-text/eval-vision.smoke.ts`:
  - for each photo with a crop, call `generateReportText` with the crop, its classify result, `answers: {}` and a stubbed `claimSlot`;
  - tally `kind`, `problem` and `photo` for usable photos and for those with `expect: several-faces`;
  - write `evals/vision-results.json` with counts and per-file verdicts, and no model text.

  Done when it typechecks, and 2.6 still passes.

- [ ] 6.2 Ask the user to approve the spend, stating the photo count, the model and the estimated cost. **Run `pnpm eval:vision` only after the user says yes.** Commit `vision-results.json`. Done when the counts are in the PR.
- [ ] 6.3 Act on the run (design decision 6, step 4):
  - If more than 1 in 10 usable photos got `several-faces`, bring the user the numbers and the two options, then write the chosen one as a `report-text` delta and code it, tests first.
  - Otherwise, record the measured rate in the `report-text` spec's Edge Cases through `/opsx:update`.

  Done when the decision is in the spec.

## 7. Baseline and wrap-up

- [ ] 7.1 Final run. Raise `baseline.json` to the final `results.json`, and record v0 → final for every metric here and in the PR. Done when `pnpm fix`, `pnpm test:unit` and `pnpm test:eval` pass, and CI is green on the branch.
- [ ] 7.2 Update the docs:
  - `evals/README.md` (new): how to fetch, run, read the results, and refresh the baseline;
  - the comments that say "provisional until t6-eval-set" in the core, `vitest.config.eval.ts` and `evals/manifest.ts`, updated to the measured state.

  Done when `grep -rn "t6-eval-set tunes" packages apps evals` finds only what was deliberately left provisional, with a reason.
