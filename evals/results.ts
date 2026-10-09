/**
 * `evals/results.json`: the metrics, a per-person table of outcomes and seasons, the counts, and
 * the hash of the inputs they came from. Nothing in it is derived from a photo's pixels beyond a
 * check outcome and a season.
 *
 * {@link openspec/specs/analysis-eval/spec.md#requirement-results-are-recorded-with-the-inputs-they-came-from}
 */
import fs from "node:fs";
import path from "node:path";

import { format, resolveConfig } from "prettier";

import { type EvalPhoto, expectOf } from "./manifest.ts";
import { type Metrics, metricsOf, type PhotoOutcome } from "./metrics.ts";

export const RESULTS_PATH = path.join(import.meta.dirname, "results.json");
export const BASELINE_PATH = path.join(import.meta.dirname, "baseline.json");

export interface Results {
  inputsHash: string;
  mediapipe: string;
  counts: { photos: number; people: number; variants: number };
  metrics: Metrics;
  people: {
    person: string;
    label: string;
    measured: boolean;
    season: string | null;
    agreement: number | null;
    familyAgreement: number | null;
    photos: {
      file: string;
      light: string;
      expect: string;
      problem: string | null;
      season: string | null;
    }[];
  }[];
}

/** Throws, naming it, for a manifest photo with no outcome. */
export function resultsOf(
  photos: readonly EvalPhoto[],
  outcomes: readonly PhotoOutcome[],
  meta: { inputsHash: string; mediapipe: string },
): Results {
  const byFile = new Map(outcomes.map((o) => [o.photo.file, o]));
  const missing = photos.filter((p) => !byFile.has(p.file)).map((p) => p.file);
  if (missing.length) throw new Error(`no outcome for ${missing.join(", ")}`);
  const ordered = photos.map((p) => byFile.get(p.file) as PhotoOutcome);
  const { metrics, people } = metricsOf(ordered);
  return {
    ...meta,
    counts: {
      photos: ordered.length,
      people: people.length,
      variants: ordered.reduce((n, o) => n + o.variants.length, 0),
    },
    metrics,
    people: people.map(({ photos: rows, ...person }) => ({
      ...person,
      photos: rows.map((o) => ({
        file: o.photo.file,
        light: o.photo.light,
        expect: expectOf(o.photo),
        problem: o.problem,
        season: o.season,
      })),
    })),
  };
}

/** Prettier-formatted, so `format:check` passes on a fresh file. */
export async function formatJson(value: unknown): Promise<string> {
  const config = await resolveConfig(RESULTS_PATH);
  return format(JSON.stringify(value), { ...config, parser: "json" });
}

/** Builds the results first, so a failure leaves `out` as it was; then writes them atomically. */
export async function writeResults(
  out: string,
  photos: readonly EvalPhoto[],
  outcomes: readonly PhotoOutcome[],
  meta: { inputsHash: string; mediapipe: string },
): Promise<Results> {
  const results = resultsOf(photos, outcomes, meta);
  const part = `${out}.${process.pid}.part`;
  fs.writeFileSync(part, await formatJson(results));
  fs.renameSync(part, out);
  return results;
}
