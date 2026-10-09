/**
 * `pnpm eval:run`: fetches any missing photo, extracts the uncached ones in Chromium, runs the
 * core on all of them, and writes evals/results.json and the git-ignored
 * evals/photos/.cache/report.json. EVAL_MANIFEST and EVAL_RESULTS point a one-off run elsewhere.
 *
 * @see openspec/specs/analysis-eval/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import { expect, it } from "vitest";

import { createExtractor, EXTRACTOR_VERSION } from "./extract.ts";
import { fetchMissing, MANIFEST_PATH, PHOTOS_DIR, readManifest } from "./fetch.ts";
import { currentInputsHash, mediapipeVersion } from "./gate.ts";
import { runPhotos } from "./pipeline.ts";
import { RESULTS_PATH, writeResults } from "./results.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE_DIR = path.join(PHOTOS_DIR, ".cache");

it("measures the labeled photo set", async () => {
  // A subset's numbers must never land in the committed results.json under the full set's hash.
  if (process.env.EVAL_MANIFEST && !process.env.EVAL_RESULTS)
    throw new Error("EVAL_MANIFEST needs EVAL_RESULTS, so the committed results.json is kept");
  const manifest = readManifest(process.env.EVAL_MANIFEST ?? MANIFEST_PATH);
  await fetchMissing(manifest, PHOTOS_DIR);
  const version = mediapipeVersion(ROOT);
  const extractor = createExtractor();
  const run = await runPhotos(manifest.photos, {
    photosDir: PHOTOS_DIR,
    cacheDir: CACHE_DIR,
    version: EXTRACTOR_VERSION,
    extract: extractor.extract,
  }).finally(extractor.close);

  const results = await writeResults(
    process.env.EVAL_RESULTS ?? RESULTS_PATH,
    manifest.photos,
    run.outcomes,
    { inputsHash: currentInputsHash(ROOT), mediapipe: version },
  );
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, "report.json"), JSON.stringify(run.report, null, 2));
  console.log(JSON.stringify({ counts: results.counts, metrics: results.metrics }, null, 2));
  expect(results.counts.photos).toBe(manifest.photos.length);
});
