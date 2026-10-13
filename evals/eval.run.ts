/**
 * `pnpm eval:run`: fetches any missing photo, extracts the uncached ones in Chromium, runs the
 * core on all of them, and writes evals/results.json and the git-ignored
 * evals/photos/.cache/report.json. EVAL_MANIFEST and EVAL_RESULTS point a one-off run elsewhere.
 *
 * @see openspec/specs/analysis-eval/spec.md
 */
import path from "node:path";

import { expect, it } from "vitest";

import { createExtractor, EXTRACTOR_VERSION } from "./extract.ts";
import { MANIFEST_PATH, PHOTOS_DIR, readManifest } from "./fetch.ts";
import { RESULTS_PATH } from "./results.ts";
import { measure } from "./run.ts";

const CACHE_DIR = path.join(PHOTOS_DIR, ".cache");

it("measures the labeled photo set", async () => {
  // A subset's numbers must never land in the committed results.json under the full set's hash.
  if (process.env.EVAL_MANIFEST && !process.env.EVAL_RESULTS)
    throw new Error("EVAL_MANIFEST needs EVAL_RESULTS, so the committed results.json is kept");
  const manifest = readManifest(process.env.EVAL_MANIFEST ?? MANIFEST_PATH);
  const results = await measure({
    manifest,
    photosDir: PHOTOS_DIR,
    cacheDir: CACHE_DIR,
    resultsPath: process.env.EVAL_RESULTS ?? RESULTS_PATH,
    extractorVersion: EXTRACTOR_VERSION,
    createExtractor,
  });
  console.log(JSON.stringify({ counts: results.counts, metrics: results.metrics }, null, 2));
  expect(results.counts.photos).toBe(manifest.photos.length);
});
