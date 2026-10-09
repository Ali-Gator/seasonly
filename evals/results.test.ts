/**
 * @see openspec/specs/analysis-eval/spec.md
 */
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { EvalPhoto } from "./manifest.ts";
import type { PhotoOutcome } from "./metrics.ts";
import { writeResults } from "./results.ts";

const PHOTOS: EvalPhoto[] = [
  { file: "p01/a.jpg", person: "p01", season: "true-autumn", light: "daylight" },
  { file: "p01/b.jpg", person: "p01", season: "true-autumn", light: "indoor-warm" },
];
const OUTCOMES: PhotoOutcome[] = [
  {
    photo: PHOTOS[0] as EvalPhoto,
    problem: null,
    season: "true-autumn",
    variants: [
      { name: "dark", expected: "dark", problem: "dark" },
      { name: "warm", expected: "tint", problem: null },
      { name: "gray", expected: "filter", problem: "filter" },
    ],
  },
  { photo: PHOTOS[1] as EvalPhoto, problem: "dark", season: null, variants: [] },
];
const HASH = "0".repeat(64);

let dir: string;
let out: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(tmpdir(), "eval-results-"));
  out = path.join(dir, "results.json");
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

/** Every key and every leaf value in a JSON value. */
function walk(value: unknown, keys: string[] = [], leaves: unknown[] = []) {
  if (Array.isArray(value)) value.forEach((v) => walk(v, keys, leaves));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      keys.push(k);
      walk(v, keys, leaves);
    }
  else leaves.push(value);
  return { keys, leaves };
}

describe("results.json", () => {
  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-run-on-the-full-set} */
  it("holds the metrics, the per-person table, the counts and the input hash", async () => {
    await writeResults(out, PHOTOS, OUTCOMES, { inputsHash: HASH, mediapipe: "1.0.1" });
    const results = JSON.parse(fs.readFileSync(out, "utf8"));
    expect(results).toMatchObject({
      inputsHash: HASH,
      mediapipe: "1.0.1",
      counts: { photos: 2, people: 1, variants: 3 },
      metrics: { accuracy: 0.5, falseRejectRate: 0.5, catchRate: 0.6667, agreement: null },
      people: [
        {
          person: "p01",
          label: "true-autumn",
          measured: false,
          photos: [
            {
              file: "p01/a.jpg",
              light: "daylight",
              expect: "pass",
              problem: null,
              season: "true-autumn",
            },
            {
              file: "p01/b.jpg",
              light: "indoor-warm",
              expect: "pass",
              problem: "dark",
              season: null,
            },
          ],
        },
      ],
    });
  });

  /** {@link openspec/specs/analysis-eval/spec.md#requirement-results-are-recorded-with-the-inputs-they-came-from} */
  it("holds no pixels, landmarks, masks or colors", async () => {
    await writeResults(out, PHOTOS, OUTCOMES, { inputsHash: HASH, mediapipe: "1.0.1" });
    const { keys, leaves } = walk(JSON.parse(fs.readFileSync(out, "utf8")));
    const banned = [
      "pixels",
      "landmarks",
      "faces",
      "hairMask",
      "crop",
      "measures",
      "traits",
      "L",
      "a",
      "b",
      "x",
      "y",
    ];
    expect(keys.filter((k) => banned.includes(k))).toEqual([]);
    // Numbers are metrics and counts only: no long run of values could be a color or a point.
    expect(leaves.filter((v) => typeof v === "number").length).toBeLessThan(30);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-photo-cannot-be-had} */
  it("throws on a photo with no outcome, naming it, and leaves results.json unchanged", async () => {
    fs.writeFileSync(out, "previous\r\n");
    const missing = { ...PHOTOS[0], file: "p02/c.jpg", person: "p02" } as EvalPhoto;
    await expect(
      writeResults(out, [...PHOTOS, missing], OUTCOMES, { inputsHash: HASH, mediapipe: "1.0.1" }),
    ).rejects.toThrow("p02/c.jpg");
    expect(fs.readFileSync(out, "utf8")).toBe("previous\r\n");
  });

  it("is formatted as Prettier formats it", async () => {
    await writeResults(out, PHOTOS, OUTCOMES, { inputsHash: HASH, mediapipe: "1.0.1" });
    const { format, resolveConfig } = await import("prettier");
    const config = await resolveConfig(path.join(import.meta.dirname, "results.json"));
    const text = fs.readFileSync(out, "utf8");
    expect(await format(text, { ...config, parser: "json" })).toBe(text);
  });
});
