/**
 * The eval's Node stage: each photo's MediaPipe output, from the cache or the browser extractor,
 * through the app's own face choice, then the core's check, sampling and classifier, with no quiz
 * answers, and the synthetic variants of each usable photo that passes.
 *
 * {@link openspec/specs/analysis-eval/spec.md#requirement-each-photo-goes-through-the-web-apps-own-steps}
 */
import fs from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import { type Landmarks, pickFace } from "../apps/web/src/lib/capture/faces.ts";
import {
  checkPhoto,
  classify,
  type PhotoMeasures,
  samplePhoto,
  type SeasonResult,
} from "../packages/analysis/src/index.ts";
import { sha256 } from "./fetch.ts";
import { type EvalPhoto, expectOf } from "./manifest.ts";
import type { PhotoOutcome } from "./metrics.ts";
import { VARIANTS } from "./variants.ts";

/** MediaPipe's output for one photo, decoded and scaled as the app checks it. */
export interface Extraction {
  width: number;
  height: number;
  /** RGBA, row-major. */
  pixels: Uint8ClampedArray;
  /** Up to two faces' landmarks, as the face landmarker returned them. */
  faces: Landmarks[];
  /** Null when no face was found. 0 is background, 1 hair. */
  hairMask: Uint8Array | null;
}

/** Runs the browser on one photo, given its absolute path: the extraction and the largest face's crop. */
export type Extractor = (file: string) => Promise<Extraction & { crop: Uint8Array | null }>;

/** One photo's debugging record, for the git-ignored report.json. */
export interface PhotoReport {
  file: string;
  person: string;
  label: string;
  expect: string;
  light: string;
  /** Names the cache entry and the crop beside it. */
  cacheKey: string;
  faceCount: number;
  problem: PhotoOutcome["problem"];
  measures: PhotoMeasures | null;
  result: SeasonResult | null;
  variants: { name: string; problem: PhotoOutcome["problem"]; measures: PhotoMeasures }[];
}

export interface RunOptions {
  photosDir: string;
  cacheDir: string;
  /** Names the extractor in the cache key: `EXTRACTOR_VERSION` from extract.ts. */
  version: string;
  extract: Extractor;
  check?: typeof checkPhoto;
}

export const cropPath = (cacheDir: string, cacheKey: string) =>
  path.join(cacheDir, `${cacheKey}.crop.jpg`);

const b64 = (bytes: Uint8Array | Uint8ClampedArray) =>
  Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

function readCache(file: string): Extraction | null {
  if (!fs.existsSync(file)) return null;
  const raw = JSON.parse(gunzipSync(fs.readFileSync(file)).toString("utf8"));
  return {
    width: raw.width,
    height: raw.height,
    faces: raw.faces,
    pixels: new Uint8ClampedArray(Buffer.from(raw.pixels, "base64")),
    hairMask: raw.hairMask === null ? null : new Uint8Array(Buffer.from(raw.hairMask, "base64")),
  };
}

function writeCache(file: string, e: Extraction) {
  const raw = {
    width: e.width,
    height: e.height,
    faces: e.faces.map((face) => face.map(({ x, y }) => ({ x, y }))),
    pixels: b64(e.pixels).toString("base64"),
    hairMask: e.hairMask && b64(e.hairMask).toString("base64"),
  };
  const part = `${file}.${process.pid}.part`;
  fs.writeFileSync(part, gzipSync(JSON.stringify(raw)));
  fs.renameSync(part, file);
}

/** The app's steps after MediaPipe, as `checkImage` in apps/web/src/lib/capture/photo.ts runs them. */
function analyze(photo: EvalPhoto, e: Extraction, check: typeof checkPhoto) {
  const { width, height, pixels } = e;
  const { severalFaces, landmarks } = pickFace(e.faces, width, height);
  if (severalFaces)
    return { problem: "several-faces" as const, measures: null, result: null, variants: [] };

  const hairMask = landmarks ? (e.hairMask ?? undefined) : undefined;
  const input = { pixels, width, height, landmarks, hairMask };
  const checked = check(input);
  if (checked.problem || !landmarks)
    return {
      problem: checked.problem ?? "no-face",
      measures: checked.measures,
      result: null,
      variants: [],
    };

  const traits = samplePhoto({ ...input, landmarks }).traits;
  const result = classify({ photo: traits, answers: {} });
  const variants =
    expectOf(photo) === "pass"
      ? VARIANTS.map((v) => {
          const c = check({ ...input, pixels: v.apply(pixels) });
          return { name: v.name, expected: v.expected, problem: c.problem, measures: c.measures };
        })
      : [];
  return {
    problem: null,
    measures: checked.measures,
    result: result.season ? result : null,
    variants,
  };
}

/** Every photo's outcome, in manifest order. Throws, naming them, if any photo file is missing. */
export async function runPhotos(
  photos: readonly EvalPhoto[],
  { photosDir, cacheDir, version, extract, check = checkPhoto }: RunOptions,
): Promise<{ outcomes: PhotoOutcome[]; report: PhotoReport[] }> {
  const missing = photos.filter((p) => !fs.existsSync(path.join(photosDir, p.file)));
  if (missing.length)
    throw new Error(`missing under ${photosDir}: ${missing.map((p) => p.file).join(", ")}`);
  fs.mkdirSync(cacheDir, { recursive: true });

  const outcomes: PhotoOutcome[] = [];
  const report: PhotoReport[] = [];
  for (const photo of photos) {
    const file = path.join(photosDir, photo.file);
    const hash = sha256(fs.readFileSync(file));
    if (photo.sha256 && hash !== photo.sha256)
      throw new Error(
        `${photo.file}: sha256 ${hash}, expected ${photo.sha256}; delete it and re-fetch`,
      );
    const cacheKey = `${hash}-${version}`;
    const cacheFile = path.join(cacheDir, `${cacheKey}.json.gz`);
    let extraction = readCache(cacheFile);
    if (!extraction) {
      const { crop, ...extracted } = await extract(file);
      if (crop) fs.writeFileSync(cropPath(cacheDir, cacheKey), crop);
      writeCache(cacheFile, extracted);
      extraction = extracted;
    }
    const a = analyze(photo, extraction, check);
    outcomes.push({
      photo,
      problem: a.problem,
      season: a.result?.season ?? null,
      variants: a.variants.map(({ name, expected, problem }) => ({ name, expected, problem })),
    });
    report.push({
      file: photo.file,
      person: photo.person,
      label: photo.season,
      expect: expectOf(photo),
      light: photo.light,
      cacheKey,
      faceCount: extraction.faces.length,
      problem: a.problem,
      measures: a.measures,
      result: a.result,
      variants: a.variants.map(({ name, problem, measures }) => ({ name, problem, measures })),
    });
  }
  return { outcomes, report };
}
