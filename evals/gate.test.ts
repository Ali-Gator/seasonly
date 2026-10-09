/**
 * @see openspec/specs/analysis-eval/spec.md
 */
import path from "node:path";

import { describe, expect, it } from "vitest";

import playwrightConfig from "../playwright.config.ts";
import evalRunConfig from "../vitest.config.eval-run.ts";
import evalConfig from "../vitest.config.eval.ts";
import unitConfig from "../vitest.config.ts";
import {
  gateProblems,
  hashInputs,
  inputFiles,
  type Baseline,
  type RatchetedMetrics,
} from "./gate.ts";

const HASH = "h".repeat(64);
const NULLS: RatchetedMetrics = {
  agreement: null,
  accuracy: null,
  falseRejectRate: null,
  catchRate: null,
};
const METRICS: RatchetedMetrics = {
  agreement: 0.72,
  accuracy: 0.5,
  falseRejectRate: 0.15,
  catchRate: 0.9,
};
const baseline = (metrics: RatchetedMetrics): Baseline => ({ metrics });
const results = (metrics: RatchetedMetrics, inputsHash = HASH) => ({ inputsHash, metrics });

describe("the gate", () => {
  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-sampling-change-without-a-run} */
  it("fails a stale hash, saying to run eval:run", () => {
    const [problem, ...rest] = gateProblems(
      results(METRICS, "x".repeat(64)),
      baseline(METRICS),
      HASH,
    );
    expect(rest).toEqual([]);
    expect(problem).toMatch(/stale.*run pnpm eval:run/);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-agreement-drops} */
  it("fails a lower agreement, naming both values", () => {
    expect(gateProblems(results({ ...METRICS, agreement: 0.7 }), baseline(METRICS), HASH)).toEqual([
      "agreement: 0.7, worse than the baseline's 0.72",
    ]);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-fewer-false-rejects} */
  it("passes a lower false-reject rate, and fails a higher one", () => {
    const base = baseline(METRICS);
    expect(gateProblems(results({ ...METRICS, falseRejectRate: 0.1 }), base, HASH)).toEqual([]);
    expect(gateProblems(results({ ...METRICS, falseRejectRate: 0.2 }), base, HASH)).toEqual([
      "falseRejectRate: 0.2, worse than the baseline's 0.15",
    ]);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-an-empty-set} */
  it("passes null metrics on both sides", () => {
    expect(gateProblems(results(NULLS), baseline(NULLS), HASH)).toEqual([]);
  });

  it("fails a metric missing from the baseline, so it is never left unratcheted", () => {
    const { catchRate: _, ...rest } = METRICS;
    expect(gateProblems(results(METRICS), { metrics: rest } as Baseline, HASH)).toEqual([
      "catchRate: missing from baseline.json",
    ]);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#requirement-ci-fails-a-stale-or-worse-result} */
  it("fails a metric that went null, and passes any value over a null baseline", () => {
    expect(gateProblems(results({ ...METRICS, catchRate: null }), baseline(METRICS), HASH)).toEqual(
      ["catchRate: null, worse than the baseline's 0.9"],
    );
    expect(gateProblems(results(METRICS), baseline(NULLS), HASH)).toEqual([]);
  });
});

describe("the input hash", () => {
  const a = { path: "a.ts", content: "export const a = 1;\n" };
  const b = { path: "b/c.ts", content: "export const c = 2;\n" };

  it("is stable under CRLF and path order", () => {
    const crlf = { ...a, content: a.content.replace(/\n/g, "\r\n") };
    expect(hashInputs([a, b], "1.0.1")).toBe(hashInputs([b, crlf], "1.0.1"));
  });

  it("changes when one file, or the MediaPipe version, changes", () => {
    const base = hashInputs([a, b], "1.0.1");
    expect(hashInputs([a, { ...b, content: "export const c = 3;\n" }], "1.0.1")).not.toBe(base);
    expect(hashInputs([a, b], "1.0.2")).not.toBe(base);
    expect(hashInputs([a, { ...b, path: "b/d.ts" }], "1.0.1")).not.toBe(base);
  });

  it("covers the core's checking, sampling, classifying and palettes, the face code, the eval and the manifest", () => {
    const files = inputFiles(path.resolve(import.meta.dirname, ".."));
    expect(files).toEqual(
      expect.arrayContaining([
        "packages/analysis/src/sampling/traits.ts",
        "packages/analysis/src/photo-check/index.ts",
        "packages/analysis/src/classifier/reference.ts",
        "packages/analysis/src/palettes/seasons.ts",
        "apps/web/src/lib/capture/faces.ts",
        "apps/web/src/lib/capture/photo.ts",
        "apps/web/src/lib/capture/mediapipe.ts",
        "evals/metrics.ts",
        "evals/manifest.json",
      ]),
    );
    expect(files.filter((f) => /\.(test|eval)\.ts$|__tests__/.test(f))).toEqual([]);
    expect(files.filter((f) => f.startsWith("packages/analysis/src/report-text/"))).toEqual([]);
    expect(files).toEqual([...files].sort());
  });
});

describe("the paid vision run", () => {
  /** {@link openspec/specs/analysis-eval/spec.md#scenario-the-test-suites} */
  it("matches no unit, eval or E2E glob", () => {
    const file = "apps/web/src/lib/report-text/eval-vision.smoke.ts";
    for (const config of [unitConfig, evalConfig, evalRunConfig]) {
      const include = config.test?.include ?? [];
      expect(include.length).toBeGreaterThan(0);
      for (const glob of include) expect(path.matchesGlob(file, glob)).toBe(false);
    }
    // Playwright runs only files under its testDir.
    const testDir = path.normalize(playwrightConfig.testDir ?? "");
    expect(testDir).toBe("e2e");
    expect(path.matchesGlob(file, `${testDir}/**`)).toBe(false);
  });
});
