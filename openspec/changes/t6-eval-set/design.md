## Context

- **The core** (`packages/analysis`) is pure TypeScript and deterministic. It takes RGBA pixels, MediaPipe landmarks and an optional hair mask.
- **Landmarks and the hair mask** come only from `@mediapipe/tasks-vision` 1.0.1. It runs in the browser (`apps/web/src/lib/capture/mediapipe.ts`, wasm from jsDelivr, models from Google). `checkImage` in `apps/web/src/lib/capture/photo.ts` takes these steps:
  1. decode with EXIF orientation;
  2. scale to at most 1280 px on the longer side;
  3. detect up to 2 faces;
  4. `pickFace`;
  5. segment the hair;
  6. `checkPhoto`;
  7. `samplePhoto`;
  8. crop with a 30 % margin, at most 512 px.
- **The eval harness** has a manifest type (`evals/manifest.ts`), a manifest test (`evals/manifest.eval.ts`) and `pnpm test:eval`, which `ci.yml` runs. The manifest is empty.
- **Photos** are git-ignored under `evals/photos/`, which already holds `smoke.jpg` and six unlabeled web images.
- **E2E** already runs Playwright's Chromium with real MediaPipe (`e2e/analysis-flow.spec.ts`), so Chromium and network access to the model URLs are known to work locally and in CI.
- **User choices of 2026-10-09:**
  - photos from the internet, kept locally;
  - CI checks a committed result, not the photos;
  - one approved paid vision run;
  - tune sampling and the classifier too, not only the photo check.

## Goals / Non-Goals

**Goals:**

- Run the eval on the browser's own MediaPipe output and the repository's own core code, so a number in `results.json` means what a user would see.
- A core change is re-measured in seconds, from cache, so tuning can iterate.
- CI holds the line without photos, secrets or face-derived data in git.
- Any machine with network access can rebuild the exact set: pinned URLs and hashes.

**Non-Goals:**

- Running the full eval in CI. That is the upgrade path, once a fetch from Commons in CI is judged stable enough.
- Measuring the quiz. Photos carry no quiz answers, so the eval classifies photo only.
- A holdout split. The set is too small to split; the risk is noted below.
- New UI or copy. A retake tip that changes wording goes to the canvas first, and none is planned.

## Decisions

### 1. Two stages: a browser extractor, then the core in Node

`eval:run` runs in two stages:

- **Browser stage, cached.** Playwright's Chromium opens a blank page. It serves `vision_bundle.mjs` from the installed `@mediapipe/tasks-vision` through `page.route`, and the wasm and models from the same URLs the app uses. Each photo is decoded and scaled as `checkImage` does. For every face found it returns:
  - RGBA pixels;
  - width and height;
  - landmarks, up to 2 faces;
  - the hair category mask.

  The result is cached, gzip-compressed, at `evals/photos/.cache/<sha256>-<mediapipe version>.json.gz`.

- **Node stage, every run.** It reads the cache and calls the app's real `pickFace` from `faces.ts`, then the core's `checkPhoto`, `samplePhoto` and `classify` (`answers: {}`), plus the synthetic variants.

To keep the app and the eval from drifting, the eval imports the app's own constants and functions rather than copying them. That needs two small exports:

- `MAX_SIDE` from `photo.ts`;
- `WASM`, `FACE_MODEL` and `HAIR_MODEL` from `mediapipe.ts`.

The eval also imports `pickFace` and `cropBox`. Only the browser glue is written twice: the canvas draw, the detect call and the segment call, about 20 lines.

**Alternatives:**

- Drive the real `/analyze` page with Playwright. That couples the eval to the UI and consent flow, and makes it re-run the browser for every core change.
- Run MediaPipe in Node. tasks-vision is not supported there.
- Bundle the core into the page. That needs a bundler the repo does not have, and the core would then run as built code instead of source.

### 2. Run through Vitest configs, like the smoke run

The eval imports app files that use `@/` aliases and a bare JSON import, which plain Node cannot load. So each command is a Vitest config with its own file suffix:

| Command       | Config                        | Files                                                    | Needs photos | Where                 |
| ------------- | ----------------------------- | -------------------------------------------------------- | ------------ | --------------------- |
| `test:unit`   | `vitest.config.ts`            | adds `evals/**/*.test.ts` (metrics, gate logic, hashing) | no           | pre-commit, CI        |
| `test:eval`   | `vitest.config.eval.ts`       | `evals/**/*.eval.ts` (manifest, gate on committed files) | no           | CI                    |
| `eval:fetch`  | plain Node (`evals/fetch.ts`) | downloads and verifies                                   | —            | local                 |
| `eval:run`    | `vitest.config.eval-run.ts`   | `evals/**/*.run.ts`                                      | yes          | local                 |
| `eval:vision` | `vitest.config.smoke.ts`      | `apps/web/src/lib/report-text/eval-vision.smoke.ts`      | yes          | local, paid, approved |

`test:smoke` is narrowed to `report-text.smoke`, so approving the 3-call smoke run never also starts the much larger vision run.

### 3. The CI gate checks a committed result against an input hash

`results.json` carries `inputsHash`: SHA-256 over the sorted list of `(path, LF-normalized content)` for these inputs:

- `packages/analysis/src/{sampling,photo-check,classifier,palettes}/**/*.ts` (no tests);
- `apps/web/src/lib/capture/{faces,photo,mediapipe}.ts`;
- `evals/*.ts` (no `*.test.ts` or `*.eval.ts`);
- `evals/manifest.json`;
- the pinned tasks-vision version.

`gate.eval.ts` recomputes the hash and compares it, then compares the four ratcheted metrics with `baseline.json`, with tolerance 0. The core is deterministic on cached MediaPipe output, so a rerun on the same cache gives the same numbers.

Any edit to a hashed file, a Prettier reflow included, makes the result stale. A rerun from cache takes seconds. That cost is accepted, and it makes "forgot to re-run" impossible to merge.

**Alternative:** gate on the photos themselves, from a private bucket or a CI fetch from Commons. Not chosen (user, 2026-10-09). Kept as the upgrade path.

### 4. Metrics are defined to resist gaming

The spec defines each metric. These are the design reasons:

- **Agreement and accuracy are both ratcheted.** Collapsing every photo onto one season would max out agreement and crash accuracy.
- **The false-reject rate and the bad-variant catch rate are both ratcheted.** Loosening every limit would zero the false rejects and crash the catch rate.
- **The variants are constants in the eval code, and so hashed.** They are applied in sRGB to the cached pixels:
  - dark: every channel × 0.35;
  - warm cast: R × 1.15, B × 0.7;
  - grayscale: Rec. 709 luma.

  The starting factors may be adjusted once on the first run, so each variant is plainly bad to the eye. After the baseline is recorded they are frozen; changing them later means a new baseline, with the user's approval.

- **Results hold no color values per photo.** For debugging, `eval:run` writes each photo's measures and traits to a git-ignored `evals/photos/.cache/report.json`.

### 5. The photo set: Wikimedia Commons, approved by the user before download

- **Candidates.** Claude searches Commons, preferring public figures with several photos of their own in clearly different light: daylight outdoors, indoor tungsten, flash, stage, overcast. Event photos and selfie-like candids are preferred to studio portraits, because users arrive with phone selfies.
- **Target:**
  - 12–16 people, 4–6 photos each;
  - every Monk skin-tone band (light, medium, deep) represented;
  - all four families, ideally 8 or more of the 12 seasons;
  - at least 4 photos with a second person visible (`expect: several-faces`, or `pass` when the second face is small and blurred);
  - at least 3 genuinely dim or color-cast photos.
- **The review page.** Each candidate shows its Commons thumbnail, source, license, author, the proposed season with a one-line reason, and the proposed `expect`. The user approves or edits the list, the labels and the expected outcomes. Only then are the photos downloaded and their hashes written into the manifest.
- **Labels.** These are the user's call, informed by Claude's proposal, and are subjective for any public figure. That is why agreement, which needs no label, is the primary metric, and accuracy is the guard against collapse.
- **Person ids.** Short slugs (`p01`…), so file paths stay neutral. The `source` URL identifies the photo anyway.

### 6. Tuning order, and what may move

Each step runs only where the eval shows a gain. Each ends with the spec delta (`/opsx:update`) and the new numbers.

1. **First run, untuned.** Record the v0 metrics in tasks.md and the Tracker. This is the honest "before".
2. **Photo-check limits and the several-faces width.** Search a small grid over eye-white L*, eye-white C*ab, the skin-hue floor and `MIN_FACE_WIDTH` in `pickFace`, minimizing the false-reject rate with the catch rate held at least at v0. `MIN_FACE_WIDTH` also gates sampling (`no-face`), so a separate several-faces width is introduced only if the two needs diverge.
3. **Sampling and classifier constants.** Use the per-photo traits in `report.json` to see why one person's photos scatter, for example how much light moves `value` and `clarity` while `temperature` holds. Adjust the fewest constants that explain it. A change is kept only if agreement and accuracy both rise, and every unit test still passes: the Monk scale, the synthetic face and the determinism tests.
4. **Paid vision run, once, with approval.**
   - If the model says `several-faces` for more than 1 in 10 usable photos, bring the user the numbers and the two options: relax the prompt rule, or record the verdict without rejecting. The chosen one becomes a `report-text` delta.
   - If the rate is 1 in 10 or lower, the rule stays and the measured rate goes into the `report-text` spec.
5. **Record the final baseline.** Write `baseline.json` from the final `results.json`.

## Risks / Trade-offs

- **Overfitting.** About 15 people tune about 50 constants. → Move few constants, prefer changes with a physical reason (light moves L* more than hue), keep the Monk-scale and synthetic tests green, and record the v0→final numbers so the gain is visible. A holdout set comes when the set grows past launch.
- **Studio and event photos are not phone selfies.** → Prefer candids and selfies on Commons. Entries without a `source` (the user's own selfies, later) stay allowed. Those can only be refreshed on the machine that holds them.
- **Celebrity seasons are contested.** → Agreement is primary and needs no label. The user approves every label.
- **MediaPipe output may differ slightly between machines.** → The cache is per machine and keyed by photo hash and version. A different machine re-extracts, and its first run may move a metric. Rerun, and if a metric fell, ask the user before lowering the baseline.
- **Commons files can be overwritten with a new version.** → The SHA-256 check fails loudly. Replace the URL with the versioned original link (`upload.wikimedia.org/.../archive/...`) or swap the photo, and re-run.
- **Every hashed-file edit forces a rerun, and only a machine with network access and Chromium can do it.** → Cloud sessions have both, and `eval:fetch` rebuilds the set anywhere.
- **Retuned limits could make the E2E fixture `face.jpg` fail the check.** → Per its README, pick another public-domain portrait and never loosen a limit for the fixture.
- **Edits to existing tests.** `photo-check.test.ts` pins L* 25 and C*ab 25, and other tests may pin constants that tuning moves. → Each such edit is listed in tasks.md and waits for the user's approval, per the constitution.

## Migration Plan

Nothing is deployed by the harness itself. Retuned constants ship with the app on merge. Rollback is a revert, which restores the old constants and the old `results.json`/`baseline.json` together.

The README row `analysis-eval` → `evals/*.ts` is added at archive. `*.json` is exempt, and the vision run is a `*.smoke.ts` test, so neither needs a row.
