/**
 * The body of `pnpm eval:run`: fetches any missing photo, extracts the uncached ones, runs the
 * core on all of them, and writes the results and the cache's report.json. Takes the extractor
 * as a factory, so it never imports extract.ts (Playwright) and a unit test can stub it.
 *
 * {@link openspec/specs/analysis-eval/spec.md#requirement-results-are-recorded-with-the-inputs-they-came-from}
 */
import fs from "node:fs";
import path from "node:path";

import { fetchMissing } from "./fetch.ts";
import { currentInputsHash, mediapipeVersion } from "./gate.ts";
import type { createExtractor } from "./extract.ts";
import type { Manifest } from "./manifest.ts";
import { runPhotos } from "./pipeline.ts";
import { writeResults, type Results } from "./results.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

export interface MeasureOptions {
  manifest: Manifest;
  photosDir: string;
  cacheDir: string;
  resultsPath: string;
  fetchImpl?: typeof fetch;
  fetchOptions?: Parameters<typeof fetchMissing>[3];
  extractorVersion: string;
  /** extract.ts's factory, imported by type only, so Playwright is never loaded here. */
  createExtractor: typeof createExtractor;
}

/** Fetches first, so a photo that cannot be had fails the run before any extraction or write. */
export async function measure(options: MeasureOptions): Promise<Results> {
  const { manifest, photosDir, cacheDir } = options;
  await fetchMissing(manifest, photosDir, options.fetchImpl, options.fetchOptions);
  const version = mediapipeVersion(ROOT);
  const extractor = options.createExtractor();
  const run = await runPhotos(manifest.photos, {
    photosDir,
    cacheDir,
    version: options.extractorVersion,
    extract: extractor.extract,
  }).finally(extractor.close);

  const results = await writeResults(options.resultsPath, manifest.photos, run.outcomes, {
    inputsHash: currentInputsHash(ROOT),
    mediapipe: version,
  });
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, "report.json"), JSON.stringify(run.report, null, 2));
  return results;
}
