## ADDED Requirements

### Requirement: A holdout set judges what the rest tuned

A manifest entry MAY carry `holdout: true`. Every photo of one person SHALL carry the same `holdout` value. An entry whose `holdout` is anything but `true` or absent SHALL be reported by the manifest check.

`eval:run` SHALL compute the metrics twice: once over the people without `holdout` (the tuning set) and once over the holdout people. The tuning set's metrics SHALL be the ones `results.json` records as `metrics` and the ones CI holds to the baseline. The holdout's metrics SHALL be recorded as `holdout`, reported only and never ratcheted, so no change is tuned against them. With no holdout people, `holdout` SHALL be null.

A person SHALL be put in the holdout when they join the set, by a rule fixed before their photos are first run, and SHALL never be moved out of it because of a result.

#### Scenario: Two people, one held out

- **WHEN** person `p17` has `holdout: true` on every photo and `p18` has none
- **THEN** `metrics` is computed from `p18`'s photos alone and `holdout` from `p17`'s alone

#### Scenario: A person split across both sets

- **WHEN** one of `p17`'s photos has `holdout: true` and another has none
- **THEN** the manifest check reports `p17`'s `holdout` as inconsistent

#### Scenario: No holdout

- **WHEN** no entry has `holdout`
- **THEN** `metrics` covers every person and `holdout` is null

### Requirement: Trait spread is measured across one person's photos

For each person with at least two usable photos that pass the check, the eval SHALL compute the population standard deviation of each trait (temperature, value, clarity) across those photos. The set's trait spread SHALL be the mean of each over those people, rounded to four decimals, and null when no person is measured. It SHALL be recorded beside the other metrics, in `metrics` and in `holdout`. It is reported only and not ratcheted. No per-photo trait SHALL be written to `results.json`.

#### Scenario: Two photos

- **WHEN** a person's two passing photos have temperature 0.2 and 0.6, value 0 and 0, and clarity 0.1 and 0.1
- **THEN** that person's spread is temperature 0.2, value 0 and clarity 0

#### Scenario: One passing photo has no spread

- **WHEN** only one of a person's photos passes the check
- **THEN** that person does not move the set's trait spread

## MODIFIED Requirements

### Requirement: Results are recorded with the inputs they came from

`eval:run` SHALL write `evals/results.json`. The file SHALL hold:

- the tuning set's metrics (`metrics`) and the holdout's metrics (`holdout`, null without a holdout), each with its trait spread;
- a table per person: person, label, whether they are held out, and each photo's outcome and season;
- the counts of photos, people and variants;
- a hash of every input the results depend on: the core's checking, sampling, classifying and palette source, the app's face-choice code, the eval's own code, the manifest and the MediaPipe version.

It SHALL hold no pixels, landmarks, masks, crops or color measurements of any photo, and no trait of any single photo. A run SHALL fail, and write nothing, if any listed photo is missing after fetching.

#### Scenario: A run on the full set

- **WHEN** `eval:run` completes
- **THEN** `results.json` holds the metrics, the holdout metrics, the per-person table and the input hash, and no pixel, landmark, color value or single photo's trait

#### Scenario: A photo cannot be had

- **WHEN** a listed photo is absent and its fetch fails
- **THEN** `eval:run` fails naming it and `results.json` is unchanged
