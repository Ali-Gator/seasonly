/**
 * The CI gate's logic: the hash of every input `results.json` depends on, and the ratchet against
 * `baseline.json`. CI has no photos, so it checks the committed result instead of re-running it.
 *
 * {@link openspec/specs/analysis-eval/spec.md#requirement-ci-fails-a-stale-or-worse-result}
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Higher is better, except where marked. */
export const RATCHETED = {
  agreement: "higher",
  accuracy: "higher",
  falseRejectRate: "lower",
  catchRate: "higher",
} as const;

export type RatchetedMetrics = Record<keyof typeof RATCHETED, number | null>;

export interface Baseline {
  metrics: RatchetedMetrics;
}

/** Directories whose `.ts` files, tests aside, the results depend on. */
const CORE_DIRS = ["sampling", "photo-check", "classifier", "palettes"].map(
  (d) => `packages/analysis/src/${d}`,
);
const APP_FILES = ["faces", "photo", "mediapipe"].map((f) => `apps/web/src/lib/capture/${f}.ts`);

const isTest = (file: string) => /\.(test|eval)\.ts$/.test(file) || file.includes("__tests__/");

/** The hashed files, as sorted POSIX paths relative to `root`. */
export function inputFiles(root: string): string[] {
  const core = CORE_DIRS.flatMap((dir) =>
    fs
      .readdirSync(path.join(root, dir), { recursive: true, encoding: "utf8" })
      .map((f) => `${dir}/${f.split(path.sep).join("/")}`),
  );
  const evals = fs.readdirSync(path.join(root, "evals")).map((f) => `evals/${f}`);
  return [...core, ...APP_FILES, ...evals]
    .filter((f) => (f.endsWith(".ts") && !isTest(f)) || f === "evals/manifest.json")
    .sort();
}

/** SHA-256 over each (path, LF-normalized content), in path order, and the MediaPipe version. */
export function hashInputs(files: { path: string; content: string }[], mediapipe: string): string {
  const hash = createHash("sha256");
  for (const f of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)))
    hash.update(`${f.path}\0${f.content.replace(/\r\n/g, "\n")}\0`);
  return hash.update(`@mediapipe/tasks-vision@${mediapipe}`).digest("hex");
}

/** The installed, pinned version, as `mediapipe.ts` reads it. */
export const mediapipeVersion = (root: string): string =>
  JSON.parse(fs.readFileSync(path.join(root, "apps/web/package.json"), "utf8")).dependencies[
    "@mediapipe/tasks-vision"
  ];

export function currentInputsHash(root: string): string {
  const files = inputFiles(root).map((p) => ({
    path: p,
    content: fs.readFileSync(path.join(root, p), "utf8"),
  }));
  return hashInputs(files, mediapipeVersion(root));
}

/** Every reason the committed results fail the gate, empty when they pass. */
export function gateProblems(
  results: { inputsHash: string; metrics: RatchetedMetrics },
  baseline: Baseline,
  inputsHash: string,
): string[] {
  if (results.inputsHash !== inputsHash)
    return [
      "results.json is stale: the analysis code, the eval or the manifest changed since it was computed; run pnpm eval:run",
    ];
  const problems: string[] = [];
  for (const [key, better] of Object.entries(RATCHETED) as [keyof RatchetedMetrics, string][]) {
    const value = results.metrics[key];
    const floor = baseline.metrics[key];
    if (floor === null) continue;
    const worse = value === null || (better === "higher" ? value < floor : value > floor);
    if (worse) problems.push(`${key}: ${value}, worse than the baseline's ${floor}`);
  }
  return problems;
}
