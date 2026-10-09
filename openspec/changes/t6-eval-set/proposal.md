## Why

The analysis core has never been measured on real photos. Its photo-check limits, sampling constants and classifier reference points are all marked provisional "until `t6-eval-set` tunes them". The only field data is bad:

- Real selfies forced the photo-check limits down on 2026-10-06.
- Daylight selfies, glasses and smiles were rejected as `dark` or `tint`.
- One person got 5 seasons in 8 runs in one evening.

The Phase 1 table gives `t6-eval-set` the `analysis-eval` capability, with this exit check: season agreement across several photos of the same person, in different light, is recorded as a baseline, and CI fails a change that lowers it. The Oct 26 launch gate needs the eval green.

## What Changes

- **A labeled photo set from the internet, kept locally.** The user chose this on 2026-10-09, in place of photos of themselves and people close to them.
  - Several photos per person in different light, mostly from Wikimedia Commons, with each photo's source URL, license and author recorded in `evals/manifest.json`.
  - The photos themselves stay git-ignored under `evals/photos/`. `pnpm eval:fetch` downloads any listed photo that is missing, so any machine can rebuild the set.
  - Claude drafts the people, photos and proposed seasons. The user approves the list and the labels on a review page before anything is downloaded.
  - A few photos are deliberately bad: a second person in the background, real dim or tinted light.
- **Additive manifest fields.** `source`, `license` and `author` record each photo's origin. `expect` is the check outcome the photo should get (`pass` by default, or a problem). Entries without the new fields stay valid, so the existing manifest test is untouched.
- **An eval runner, `pnpm eval:run`, that runs locally.**
  - Headless Chromium runs MediaPipe as the web app does: the same pinned version, the same models, the same downscale. It writes each photo's landmarks, hair mask, pixels and face crop to a git-ignored cache.
  - Node then runs the real `checkPhoto`, `samplePhoto` and `classify` on that cache (photo only, no quiz answers). It also runs synthetic dark, tinted and grayscale variants of each usable photo.
  - It writes `evals/results.json`. That file holds aggregate metrics, a per-person table with no pixel-level data, and a hash of every input the run depends on.
- **Metrics, ratcheted against `evals/baseline.json`:**
  - agreement: how often a person's usable photos give the same season;
  - label accuracy;
  - false-reject rate: usable photos the check rejects, background people included;
  - bad-variant catch rate.

  Family-level agreement and accuracy, and the pass rate, are reported too.

- **The CI gate, `pnpm test:eval`.** CI has no photos (user's choice, 2026-10-09). It fails when:
  - `results.json` was computed from inputs other than the committed analysis code, manifest and MediaPipe version (a stale hash);
  - or any ratcheted metric is worse than `baseline.json`.

  So a change to sampling, photo-check, the classifier or the manifest cannot merge without a fresh local run that holds the line. Lowering the baseline needs the user's approval.

- **Tuning against the set** (user's choice, 2026-10-09: measure and fix).
  - The three photo-check limits: eye-white L*, eye-white C*ab, and the skin-hue floor.
  - The on-device several-faces width.
  - The color-sampling trait constants and the classifier reference points.

  Each is changed only where the eval shows a gain, and its spec is updated with the measured numbers in this change.

- **One paid vision run (`pnpm eval:vision`, only with the user's approval).**
  - One AI Gateway call per usable photo's face crop, made the same way the analyze route makes it.
  - It counts how often the model says `several-faces` (or `no-face`) for a photo labeled usable, and compares its verdicts with the labels.
  - If false rejects are frequent, relax the prompt rule, or record the verdict without rejecting.
- **Folded in from the plan's "Carried in" list:**
  - measure the several-faces false-reject rate, from the vision model and on the device, and compare the model's verdicts with the labels (`t4-report-text`);
  - tune the photo-check limits on labeled photos, and measure result stability across one person's photos (`t5-analysis-flow`).

  No `docs/backlog.md` item is in this area.

## Capabilities

### New Capabilities

- `analysis-eval`: covers these parts of the eval:
  - the manifest's format, and where photos come from;
  - fetching photos and extracting their landmarks in the browser;
  - the metrics and how each is computed;
  - `results.json` and its input hash;
  - the baseline ratchet that CI enforces;
  - the paid vision run and what it records.

### Modified Capabilities

Planned. Each delta is written with real numbers during apply, once the first run shows which constants move (`/opsx:update`). No limit is invented before it is measured.

- `photo-check`: the eye-white and skin-hue limits, set from the eval; "provisional" removed.
- `capture-flow`: the several-faces width, set from the eval; the "provisional until `t6-eval-set`" note replaced by the measured rate.
- `color-sampling`: the trait constants, if tuning moves them.
- `season-classifier`: the reference points, if tuning moves them.
- `report-text`: the several-faces rule, only if the paid run shows the model rejects usable photos too often.

## Impact

- **Code**
  - `evals/` (new files): the manifest's new fields, the fetch, the browser extractor, the metrics, the gate check, `results.json` and `baseline.json`.
  - `packages/analysis/src/{photo-check,sampling,classifier}/`: constants only, as the eval earns it.
  - `apps/web/src/lib/capture/faces.ts`: possibly the several-faces width.
  - A new paid run beside `report-text.smoke.ts`.
- **Scripts:**
  - `eval:fetch` and `eval:run` are new and local only.
  - `eval:vision` is new, paid, and runs only with the user's approval.
  - `test:eval` already runs in `ci.yml` and is kept there.
- **Tests:**
  - New unit tests for the metrics and the gate check run on fixture data, with no photos.
  - Existing tests that pin a constant the tuning moves (for example `photo-check.test.ts`'s L* 25 and C*ab 25) are edits to existing tests, so each waits for the user's approval.
- **Dependencies:** none. Playwright's Chromium is already installed for E2E. MediaPipe's wasm and models come from the same pinned URLs the app uses.
- **Data and privacy:**
  - Photos are public, licensed images of public figures, kept only on the machine that runs the eval.
  - Git gets the manifest (URLs, licenses, labels) and aggregate results, no pixels.
  - The paid run sends the face crops to the model as the app does, with the provider's retention noted in `t4-report-text`.
- **Cost:** one approved vision run, about one cheap Gemini Flash call per photo.
- **Downstream:**
  - The launch gate (T11) needs `test:eval` green.
  - Until a CI runner can fetch and run the set itself, only a machine with the photos can refresh `results.json`. `eval:fetch` lets any machine get them. Running the full eval in CI is the upgrade path.
