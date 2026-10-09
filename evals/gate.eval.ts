import fs from "node:fs";
import path from "node:path";

import { expect, it } from "vitest";

import { type Baseline, currentInputsHash, gateProblems } from "./gate.ts";
import { BASELINE_PATH, type Results, RESULTS_PATH } from "./results.ts";

// The committed results hold against the committed inputs and the baseline. No photos needed.
it("results.json is fresh and no worse than baseline.json", () => {
  const read = <T>(file: string): T => JSON.parse(fs.readFileSync(file, "utf8")) as T;
  const results = read<Results>(RESULTS_PATH);
  const baseline = read<Baseline>(BASELINE_PATH);
  const hash = currentInputsHash(path.resolve(import.meta.dirname, ".."));
  expect(gateProblems(results, baseline, hash)).toEqual([]);
});
