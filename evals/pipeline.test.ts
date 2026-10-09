/**
 * The Node stage on fake cache entries: synthetic faces in place of MediaPipe's output.
 *
 * @see openspec/specs/analysis-eval/spec.md
 */
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  face478,
  paint,
  ringsOf,
  type RGB,
} from "../packages/analysis/src/__tests__/synthetic-face.ts";
import {
  checkPhoto,
  classify,
  EYE_OPENINGS,
  REGIONS,
  samplePhoto,
} from "../packages/analysis/src/index.ts";
import type { EvalPhoto } from "./manifest.ts";
import { runPhotos, type Extraction, type Extractor } from "./pipeline.ts";

const SIZE = 400;
const LM = face478();

/** A face that passes the check: skin, near-white eye openings, dark irises, a hair band. */
function painted() {
  const rings = (r: readonly (readonly number[])[]) => ringsOf(r, LM);
  const skin: RGB = [222, 176, 148];
  const band = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 0.06 },
    { x: 0, y: 0.06 },
  ];
  return paint(
    SIZE,
    SIZE,
    [128, 128, 128],
    [
      ...[REGIONS.forehead, REGIONS.rightCheek, REGIONS.leftCheek].map((r) => ({
        rings: rings(r),
        color: skin,
      })),
      { rings: rings(EYE_OPENINGS.right), color: [240, 237, 232] },
      { rings: rings(EYE_OPENINGS.left), color: [240, 237, 232] },
      { rings: rings(REGIONS.rightIris), color: [96, 72, 52] },
      { rings: rings(REGIONS.leftIris), color: [96, 72, 52] },
      { rings: [band], color: [96, 70, 48], hair: true },
    ],
  );
}

const PHOTOS: EvalPhoto[] = [
  { file: "p01/one.jpg", person: "p01", season: "soft-autumn", light: "daylight" },
  {
    file: "p01/two.jpg",
    person: "p01",
    season: "soft-autumn",
    light: "indoor",
    expect: "several-faces",
  },
];

let root: string;
let photosDir: string;
let cacheDir: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(tmpdir(), "eval-pipeline-"));
  photosDir = path.join(root, "photos");
  cacheDir = path.join(photosDir, ".cache");
  fs.mkdirSync(path.join(photosDir, "p01"), { recursive: true });
  // Any distinct bytes: the cache is keyed by their hash, and the stub never decodes them.
  for (const p of PHOTOS) fs.writeFileSync(path.join(photosDir, p.file), p.file);
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

/** Stands in for the browser: one face for `one.jpg`, the same face twice for `two.jpg`. */
function stubExtractor() {
  const { pixels, hairMask } = painted();
  return vi.fn<Extractor>(async (file) => {
    const faces = file.endsWith("two.jpg") ? [LM, LM.map((p) => ({ ...p }))] : [LM];
    const extraction: Extraction = { width: SIZE, height: SIZE, pixels, faces, hairMask };
    return { ...extraction, crop: new Uint8Array([0xff, 0xd8]) };
  });
}

const run = (extract: Extractor, check = checkPhoto) =>
  runPhotos(PHOTOS, { photosDir, cacheDir, version: "1.0.1", extract, check });

describe("the Node stage", () => {
  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-usable-photo} */
  it("passes a single painted face and classifies it with no answers", async () => {
    const { outcomes } = await run(stubExtractor());
    const { pixels, hairMask } = painted();
    const traits = samplePhoto({
      pixels,
      width: SIZE,
      height: SIZE,
      landmarks: LM,
      hairMask,
    }).traits;
    const expected = classify({ photo: traits, answers: {} });
    expect(outcomes[0]).toMatchObject({ problem: null, season: expected.season });
    expect(outcomes[0]?.variants.map((v) => v.name)).toEqual(["dark", "warm", "gray"]);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-second-person-in-the-background} */
  it("reports two faces at least the minimum width as several-faces", async () => {
    const { outcomes } = await run(stubExtractor());
    expect(outcomes[1]).toMatchObject({ problem: "several-faces", season: null, variants: [] });
  });

  /** {@link openspec/specs/analysis-eval/spec.md#scenario-a-core-change-re-measured} */
  it("re-measures from cache, never calling the extractor again", async () => {
    await run(stubExtractor());
    const again = stubExtractor();
    const dark = vi.fn<typeof checkPhoto>((input) => ({ ...checkPhoto(input), problem: "dark" }));
    const { outcomes } = await run(again, dark);
    expect(again).not.toHaveBeenCalled();
    expect(dark).toHaveBeenCalled();
    expect(outcomes[0]).toMatchObject({ problem: "dark", season: null });
  });

  it("keeps the crop beside the cache entry", async () => {
    await run(stubExtractor());
    expect(fs.readdirSync(cacheDir).filter((f) => f.endsWith(".crop.jpg"))).toHaveLength(2);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#requirement-each-photo-goes-through-the-web-apps-own-steps} */
  it("fails on a missing photo, naming it", async () => {
    fs.rmSync(path.join(photosDir, "p01/two.jpg"));
    await expect(run(stubExtractor())).rejects.toThrow("p01/two.jpg");
  });
});
