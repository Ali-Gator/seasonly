/**
 * @see openspec/specs/analysis-eval/spec.md
 */
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { Manifest } from "./manifest.ts";
import { measure } from "./run.ts";

const MANIFEST: Manifest = {
  version: 1,
  photos: [
    {
      file: "p01/a.jpg",
      person: "p01",
      season: "soft-autumn",
      light: "daylight",
      source: "https://upload.wikimedia.org/a.jpg",
      sha256: "0".repeat(64),
      license: "CC0",
    },
  ],
};

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(tmpdir(), "eval-run-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

/** {@link openspec/specs/analysis-eval/spec.md#scenario-a-photo-cannot-be-had} */
it("fails naming an absent photo it cannot fetch, before extracting or writing anything", async () => {
  const photosDir = path.join(dir, "photos");
  const cacheDir = path.join(photosDir, ".cache");
  const resultsPath = path.join(dir, "results.json");
  fs.writeFileSync(resultsPath, "previous\r\n");
  const createExtractor = vi.fn();

  await expect(
    measure({
      manifest: MANIFEST,
      photosDir,
      cacheDir,
      resultsPath,
      fetchImpl: async () => new Response(null, { status: 404 }),
      fetchOptions: { sleep: async () => {} },
      extractorVersion: "test",
      createExtractor,
    }),
  ).rejects.toThrow("p01/a.jpg");

  expect(createExtractor).not.toHaveBeenCalled();
  expect(fs.readFileSync(resultsPath, "utf8")).toBe("previous\r\n");
  expect(fs.existsSync(path.join(cacheDir, "report.json"))).toBe(false);
});
