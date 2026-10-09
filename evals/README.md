# Eval set

The labeled photo set that measures the analysis core on real photos, and the CI gate that holds
every change to it. Spec: `openspec/specs/analysis-eval/spec.md`.

## What is where

- `manifest.json` (committed): each photo's file, person, season label, light, expected check
  outcome (`expect`, `pass` when absent), and, for downloaded photos, its `source`, `sha256`,
  `license` and `author`. Photos come from Wikimedia Commons under their own licenses; the user
  approves every person, photo and label.
- `photos/` (git-ignored): the photos, and `photos/.cache/` with each photo's MediaPipe output,
  face crop and `report.json`, the per-photo measures and traits for debugging. Nothing derived
  from pixels leaves this folder.
- `results.json` (committed): the metrics, a per-person table of outcomes and seasons, and the
  hash of every input they came from.
- `baseline.json` (committed): the four ratcheted metrics CI holds the results to.
- `vision-results.json` (committed): verdict counts from the one approved paid vision run.

## Commands

```bash
pnpm eval:fetch
```

Downloads every listed photo that is missing and checks its SHA-256. A changed Commons file
fails loudly: point `source` at the versioned original or swap the photo.

```bash
pnpm eval:run
```

Fetches, extracts any photo not yet cached in headless Chromium (MediaPipe as the web app runs
it), runs the core in Node, and writes `results.json` and `photos/.cache/report.json`. A cached
rerun takes about a minute. `EVAL_MANIFEST` and `EVAL_RESULTS` point a one-off run at another
manifest and output.

```bash
pnpm test:eval
```

What CI runs: fails when `results.json` is stale (an analysis, eval or manifest file changed
since the run) or when a ratcheted metric is worse than `baseline.json`.

`pnpm eval:vision` is a paid run: one real vision call per photo that passes the device check.
Run it only after the user approves the spend.

## Reading the results

- **agreement**: for each person with two or more passing usable photos, the share on their most
  frequent season; the mean over those people. Needs no label, so it is the primary metric.
- **accuracy**: usable photos that pass and get their person's label, over all usable photos.
- **falseRejectRate**: usable photos the check rejects (lower is better), with `falseRejects` by
  problem.
- **catchRate**: each passing usable photo's dark, warm and grayscale variants that get `dark`,
  `tint` and `filter` in turn.
- Family agreement and accuracy, the expected-problem rate and the pass rate are reported, not
  ratcheted.

## Changing the analysis

Any edit to a hashed file (the core's sampling, photo-check, classifier and palettes, the
capture code, `evals/*.ts`, `manifest.json`), a Prettier reflow included, makes `results.json`
stale. Run `pnpm fix`, then `pnpm eval:run`, then commit both.

When a change improves a metric, raise `baseline.json` to the new numbers. Lower it only with
the user's approval, recorded in the change's tasks.
