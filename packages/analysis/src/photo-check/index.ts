/**
 * Photo check: is a selfie usable for color analysis, and if not, which one problem to retake for.
 * Runs on the same input as color sampling, before it.
 *
 * @see openspec/specs/photo-check/spec.md
 */
import type { Lab } from "../sampling/color.ts";
import { samplePhoto, type PhotoInput, type Traits } from "../sampling/index.ts";

export { EYE_OPENINGS } from "../sampling/regions.ts";
export { RETAKE_TIPS, type RetakeReason, type RetakeTip } from "./tips.ts";

// Eye-white C*ab and the skin-hue floor are measured (t6-eval-set, 2026-10-09): on
// the 72 usable photos of evals/manifest.json and their dark, warm and grayscale variants, they
// give the fewest false rejects (0.18, from 0.24) that keep agreement, label accuracy and the
// variant catch rate at the untuned run's level or better. Three usable daylight and flash photos
// read skin hue −5° to 9°, so the floor sits below 0°. Real selfies (2026-10-06) read sclera C*ab 12-21
// indoors, close under the cast limit. MIN_FACE_WIDTH and the skin chroma range are unchanged.
// Eye-white L* is from backlog-1's sweep (irises dropped, sclera share 0.3): on the eval tuning
// set, dark false rejects 14 → 4 and catch rate 0.8812 → 0.9167. The selfie readings above predate
// that measure. The C*ab limit was re-swept on it in backlog-2 triage (C*ab 20–32): no limit kept
// all four ratchets, so 22 stays (BL-50).
/** Narrower than this, in pixels, and the face is too small to measure. */
export const MIN_FACE_WIDTH = 120;
/** Eye-white L* below this is too dark. */
const MIN_EYE_WHITE_L = 24;
/** Eye-white C*ab above this is a color cast. */
const MAX_EYE_WHITE_CHROMA = 22;
/** Skin C*ab outside this range is a filter: grayscale below, oversaturated above. */
const MIN_SKIN_CHROMA = 2;
const MAX_SKIN_CHROMA = 45;
/** Skin hue outside this range, in degrees, is a filter, judged only from `minChroma` up. */
const SKIN_HUE = { from: -10, to: 100, minChroma: 6 };

export type PhotoProblem = "no-face" | "dark" | "tint" | "filter";

export interface PhotoMeasures {
  /** Pixels across the landmarks' bounding box. */
  faceWidth: number | null;
  /** Null when the eye openings hold too few pixels. */
  eyeWhite: Lab | null;
  /** Both cheeks and the forehead, as color sampling measures them. */
  skin: Lab | null;
}

/** A pass carries color sampling's traits of the same input; a rejection carries none. */
export type PhotoCheck =
  | { problem: null; measures: PhotoMeasures; traits: Traits }
  | { problem: PhotoProblem; measures: PhotoMeasures; traits?: never };

/** `PhotoInput` whose landmarks are null when no face was detected. */
export type PhotoCheckInput = Omit<PhotoInput, "landmarks"> & {
  landmarks: PhotoInput["landmarks"] | null;
};

const chroma = (c: Lab) => Math.hypot(c.a, c.b);
const hue = (c: Lab) => (Math.atan2(c.b, c.a) * 180) / Math.PI;

function isFiltered(skin: Lab): boolean {
  const c = chroma(skin);
  if (c < MIN_SKIN_CHROMA || c > MAX_SKIN_CHROMA) return true;
  const h = hue(skin);
  return c >= SKIN_HUE.minChroma && (h < SKIN_HUE.from || h > SKIN_HUE.to);
}

/**
 * Checks, in order, for no face, too dark, tinted light and a filter, and reports the first that
 * applies with the measurements gathered so far. Refuses malformed input as `samplePhoto` does.
 * Reads its input, never writes it.
 */
export function checkPhoto(input: PhotoCheckInput): PhotoCheck {
  const { landmarks, width, height, pixels, hairMask } = input;
  if (!landmarks) {
    // Sampling's refusals that need no landmarks, with its messages.
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
      throw new RangeError(`width and height: ${width} × ${height}, expected positive integers`);
    if (pixels.length !== width * height * 4)
      throw new RangeError(
        `pixels: length ${pixels.length}, expected ${width * height * 4} (${width} × ${height} × 4)`,
      );
    if (hairMask && hairMask.length !== width * height)
      throw new RangeError(
        `hairMask: length ${hairMask.length}, expected ${width * height} (${width} × ${height})`,
      );
    return { problem: "no-face", measures: { faceWidth: null, eyeWhite: null, skin: null } };
  }
  const sample = samplePhoto({ ...input, landmarks });
  const skin = sample.regions.skin;
  const xs = landmarks.map((p) => p.x);
  const faceWidth = (Math.max(...xs) - Math.min(...xs)) * width;
  const measures: PhotoMeasures = { faceWidth, eyeWhite: null, skin };
  const result = (problem: PhotoProblem): PhotoCheck => ({ problem, measures });

  // Written so a NaN coordinate counts as outside.
  const outside = landmarks.some((p) => !(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1));
  // A null traits never follows from a face this wide; checked so a pass always samples.
  if (outside || faceWidth < MIN_FACE_WIDTH || !sample.traits) return result("no-face");

  const eyeWhite = sample.eyeWhite;
  measures.eyeWhite = eyeWhite;
  if (eyeWhite && eyeWhite.L < MIN_EYE_WHITE_L) return result("dark");
  if (eyeWhite && chroma(eyeWhite) > MAX_EYE_WHITE_CHROMA) return result("tint");

  if (skin && isFiltered(skin)) return result("filter");
  return { problem: null, measures, traits: sample.traits };
}
