## MODIFIED Requirements

### Requirement: Photos are fetched, verified and never committed

`pnpm eval:fetch` SHALL download every entry whose file is missing under `evals/photos/` from its `source`, and SHALL keep it only if its SHA-256 matches the entry's `sha256`. Downloads SHALL run one at a time, with a pause between one download and the next. A download answered with HTTP 429 SHALL be retried a bounded number of times, each after the wait its `Retry-After` header asks for, capped, or after a growing backoff when it gives none; it counts as a failed download only once the retries run out. Any other failed status SHALL NOT be retried. A mismatch or a failed download SHALL fail the fetch, name the entry, and leave no file behind. Photos, and everything derived from their pixels, SHALL stay under the git-ignored `evals/photos/`.

#### Scenario: A missing photo

- **WHEN** an entry's file is absent and its source serves the bytes whose hash is recorded
- **THEN** the fetch writes the file under `evals/photos/` and reports it fetched

#### Scenario: The source changed

- **WHEN** an entry's source now serves different bytes
- **THEN** the fetch fails naming that entry, and no file is written for it

#### Scenario: Nothing to fetch

- **WHEN** every listed file is already present
- **THEN** the fetch downloads nothing

#### Scenario: Two photos to fetch

- **WHEN** two entries' files are absent
- **THEN** the fetch pauses between the first download and the second, and not before the first

#### Scenario: The source rate-limits the fetch

- **WHEN** an entry's source answers HTTP 429 with `Retry-After: 2`, then serves the recorded bytes
- **THEN** the fetch waits 2 seconds, retries, and writes the file

#### Scenario: The rate limit persists

- **WHEN** an entry's source answers HTTP 429 to every attempt
- **THEN** the fetch gives up after its retries, fails naming that entry, and no file is written for it

#### Scenario: A photo that is gone is not retried

- **WHEN** an entry's source answers HTTP 404
- **THEN** the fetch requests it once and fails naming that entry

### Requirement: Each photo goes through the web app's own steps

`pnpm eval:run` SHALL put each photo through the same steps the web app runs on an upload:

1. Decode it, with EXIF orientation applied, and scale it so its longer side is at most the app's limit.
2. Detect up to two faces with the app's MediaPipe version and face model.
3. Choose the face, or report `several-faces`, as the app does.
4. Segment the hair, then run the core's `checkPhoto`.
5. For a pass, run `classify` on the traits the check returned, with no quiz answers.

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

### Requirement: Results are recorded with the inputs they came from

`eval:run` SHALL write `evals/results.json`. The file SHALL hold:

- the tuning set's metrics (`metrics`) and the holdout's metrics (`holdout`, null without a holdout), each with its trait spread;
- a table per person: person, label, whether they are held out, and each photo's outcome and season;
- the counts of photos, people and variants;
- a hash of every input the results depend on: the core's checking, sampling, classifying and palette source, the app's face-choice code, the eval's own code, the manifest and the MediaPipe version.

It SHALL hold no pixels, landmarks, masks, crops or color measurements of any photo, and no trait of any single photo. A run SHALL fetch before it extracts, and SHALL fail, before extracting any photo and writing anything, if any listed photo is missing after fetching.

#### Scenario: A run on the full set

- **WHEN** `eval:run` completes
- **THEN** `results.json` holds the metrics, the holdout metrics, the per-person table and the input hash, and no pixel, landmark, color value or single photo's trait

#### Scenario: A photo cannot be had

- **WHEN** a listed photo is absent and its fetch fails
- **THEN** `eval:run` fails naming it before extracting any photo, and `results.json` is unchanged
