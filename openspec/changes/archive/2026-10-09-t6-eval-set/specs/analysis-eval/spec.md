## Purpose

Measures the analysis core on a labeled set of real photos: how often one person's photos in different light give the same season, how often a usable photo is wrongly rejected and a bad one let through, and how the vision model's verdicts compare with the labels. It records those numbers as a baseline that CI holds every change to the analysis to.

## ADDED Requirements

### Requirement: The manifest records where every photo comes from

Every entry in `evals/manifest.json` SHALL carry the photo's file, person, season label and light, as before. An entry MAY also carry:

- `source`, an `https` URL the photo can be downloaded from;
- `sha256` of the downloaded bytes;
- `license`;
- `author`;
- `expect`, the check outcome the photo should get: `pass` or one of `no-face`, `dark`, `tint`, `filter` and `several-faces`.

An entry with a `source` SHALL also carry `sha256` and `license`. An entry without `expect` SHALL be read as `pass`. Every rule the manifest already has SHALL still hold: one season per person, no duplicate file, a file path of the form `<person>/<name>.<ext>`.

#### Scenario: A photo from Wikimedia Commons

- **WHEN** an entry has `source`, `sha256`, `license` and `author`, and no `expect`
- **THEN** the manifest is valid and the photo is treated as usable

#### Scenario: A source without its hash

- **WHEN** an entry has a `source` and no `sha256`
- **THEN** the manifest check reports that entry's missing `sha256`

#### Scenario: An unknown expected outcome

- **WHEN** an entry's `expect` is `blurry`
- **THEN** the manifest check reports that entry's `expect` as not one of the allowed outcomes

### Requirement: Photos are fetched, verified and never committed

`pnpm eval:fetch` SHALL download every entry whose file is missing under `evals/photos/` from its `source`, and SHALL keep it only if its SHA-256 matches the entry's `sha256`. A mismatch or a failed download SHALL fail the fetch, name the entry, and leave no file behind. Photos, and everything derived from their pixels, SHALL stay under the git-ignored `evals/photos/`.

#### Scenario: A missing photo

- **WHEN** an entry's file is absent and its source serves the bytes whose hash is recorded
- **THEN** the fetch writes the file under `evals/photos/` and reports it fetched

#### Scenario: The source changed

- **WHEN** an entry's source now serves different bytes
- **THEN** the fetch fails naming that entry, and no file is written for it

#### Scenario: Nothing to fetch

- **WHEN** every listed file is already present
- **THEN** the fetch downloads nothing

### Requirement: Each photo goes through the web app's own steps

`pnpm eval:run` SHALL put each photo through the same steps the web app runs on an upload:

1. Decode it, with EXIF orientation applied, and scale it so its longer side is at most the app's limit.
2. Detect up to two faces with the app's MediaPipe version and face model.
3. Choose the face, or report `several-faces`, as the app does.
4. Segment the hair, then run the core's `checkPhoto`.
5. For a pass, run `samplePhoto` and `classify` with no quiz answers.

The MediaPipe steps SHALL run in a browser engine, because the app runs them there. The core's steps SHALL run the repository's current code. A photo's MediaPipe output MAY be cached under `evals/photos/`, keyed by the photo's hash and the MediaPipe version. A change to the core SHALL then be re-measured without re-running the browser.

#### Scenario: A usable photo

- **WHEN** a well-lit single-face photo labeled `soft-autumn` is run
- **THEN** its outcome records no problem and the season `classify` returns for its traits with no answers

#### Scenario: A second person in the background

- **WHEN** a photo holds a second face at least the core's minimum face width at the checked size
- **THEN** its outcome is `several-faces`, as the web app would show

#### Scenario: A core change re-measured

- **WHEN** a photo-check limit changes and `eval:run` runs again on cached photos
- **THEN** the outcomes reflect the new limit and the browser step is not repeated

### Requirement: Agreement is measured across one person's photos

For each person with at least two usable photos that pass the check, agreement SHALL be the share of those photos whose season is the person's most frequent season. A tie SHALL be broken in favor of the person's label, then by the earlier slug. The set's agreement SHALL be the mean over those people. A person with fewer than two passing photos SHALL be listed, and left out of the mean. Family agreement SHALL be computed the same way over season families.

#### Scenario: Three of four photos agree

- **WHEN** a person's four passing photos give `soft-autumn`, `soft-autumn`, `soft-autumn` and `true-autumn`
- **THEN** that person's agreement is 0.75 and their family agreement is 1

#### Scenario: A tie

- **WHEN** a person labeled `light-summer` has passing photos giving `light-summer`, `light-spring`, `light-spring` and `light-summer`
- **THEN** their most frequent season is `light-summer` and their agreement is 0.5

#### Scenario: One photo passes

- **WHEN** only one of a person's photos passes the check
- **THEN** the person is listed as unmeasured and does not move the set's agreement

### Requirement: Accuracy is measured against the labels

Label accuracy SHALL be the share of usable photos that pass the check and whose season equals their person's label. Family accuracy SHALL be the same share over season families.

#### Scenario: Right family, wrong season

- **WHEN** a photo labeled `deep-winter` passes and is classified `true-winter`
- **THEN** it counts against label accuracy and toward family accuracy

### Requirement: The photo check is measured both ways

The eval SHALL report these rates:

- **False-reject rate:** the share of usable photos (`expect: pass`) that get any problem, broken down by problem.
- **Expected-problem rate:** for photos with another `expect`, the share that get exactly that problem.
- **Bad-variant catch rate:** each usable photo that passes is also run as three synthetic variants: darkened, given a warm color cast, and turned grayscale. These should get `dark`, `tint` and `filter` in turn. The rate is the share that gets the problem it should.

Loosening a limit therefore cannot lower false rejects without the cost showing up in the catch rate.

#### Scenario: A usable photo rejected as dark

- **WHEN** a usable photo gets `dark`
- **THEN** the false-reject rate counts it, under `dark`

#### Scenario: The grayscale variant

- **WHEN** a usable photo's grayscale variant gets `filter`
- **THEN** that variant counts as caught

#### Scenario: A usable photo's variant that passes

- **WHEN** a usable photo's darkened variant passes the check
- **THEN** that variant counts as missed

### Requirement: Results are recorded with the inputs they came from

`eval:run` SHALL write `evals/results.json`. The file SHALL hold:

- the set's metrics;
- a table per person: person, label, and each photo's outcome and season;
- the counts of photos, people and variants;
- a hash of every input the results depend on: the core's checking, sampling, classifying and palette source, the app's face-choice code, the eval's own code, the manifest and the MediaPipe version.

It SHALL hold no pixels, landmarks, masks, crops or color measurements of any photo. A run SHALL fail, and write nothing, if any listed photo is missing after fetching.

#### Scenario: A run on the full set

- **WHEN** `eval:run` completes
- **THEN** `results.json` holds the metrics, the per-person table and the input hash, and no pixel, landmark or color value

#### Scenario: A photo cannot be had

- **WHEN** a listed photo is absent and its fetch fails
- **THEN** `eval:run` fails naming it and `results.json` is unchanged

### Requirement: CI fails a stale or worse result

`pnpm test:eval` SHALL run without photos, and therefore in CI. It SHALL fail in either case:

- `results.json`'s input hash differs from the hash of the inputs as committed. The analysis or the set changed without a fresh run.
- Any ratcheted metric in `results.json` is worse than in `evals/baseline.json`.

The ratcheted metrics are agreement, label accuracy, the false-reject rate (lower is better) and the bad-variant catch rate. With an empty set, every metric SHALL be null and the check SHALL pass.

#### Scenario: A sampling change without a run

- **WHEN** a commit changes a sampling constant and leaves `results.json` as it was
- **THEN** `test:eval` fails, saying the results are stale and `eval:run` must be run

#### Scenario: Agreement drops

- **WHEN** a fresh `results.json` has agreement 0.70 and `baseline.json` has 0.72
- **THEN** `test:eval` fails naming agreement, with both values

#### Scenario: Fewer false rejects

- **WHEN** a fresh `results.json` has a false-reject rate of 0.10 and the baseline has 0.15, and every other metric is at least the baseline
- **THEN** `test:eval` passes

#### Scenario: An empty set

- **WHEN** the manifest lists no photos and `results.json` and `baseline.json` hold null metrics with the matching hash
- **THEN** `test:eval` passes

### Requirement: Lowering the baseline needs the user's approval

`evals/baseline.json` SHALL be raised to a fresh result's numbers when a change improves on it. It SHALL be lowered only with the user's approval, given in the conversation for that change and recorded in the change's tasks.

**Unenforced:** who approved an edit is not visible to a mechanical check; review catches it, as for edits to existing tests.

#### Scenario: A change that trades metrics

- **WHEN** a tuning change raises agreement but lowers the catch rate
- **THEN** the change does not merge until the user approves the lower catch rate and the baseline is lowered with that note

### Requirement: The paid vision run happens only on request

`pnpm eval:vision` SHALL send each photo's face crop, cropped as the web app crops it, to the report-text vision call. The call's daily slot SHALL be stubbed. The run SHALL write `evals/vision-results.json`, which holds:

- the count of each verdict for usable photos;
- the count of each verdict for photos expected to show several faces;
- each photo's verdict.

It holds no text the model wrote about a person. No unit, eval or E2E run SHALL make this call: its file SHALL match no glob of `test:unit`, `test:eval` or `test:e2e`. It SHALL run only after the user approves the spend.

#### Scenario: The test suites

- **WHEN** `pnpm test:unit` and `pnpm test:eval` run with an AI Gateway key in the environment
- **THEN** no vision call is made

#### Scenario: A usable photo the model rejects

- **WHEN** the model returns `several-faces` for a photo with `expect: pass`
- **THEN** `vision-results.json` counts it among the usable photos' `several-faces` verdicts
