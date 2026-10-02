/**
 * Photo check: is a selfie usable for color analysis, and if not, which one problem to retake for.
 * Runs on the same input as color sampling, before it.
 *
 * The eye openings are the closed loops of FACEMESH_RIGHT_EYE and FACEMESH_LEFT_EYE, chained
 * from the edge sets in
 * https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py
 * (commit b453bf8): the lower lid from the outer corner to the inner one, then the upper lid back.
 * They stay out of REGIONS: an eye opening contains the iris, and sampling regions never overlap.
 *
 * @see openspec/specs/photo-check/spec.md
 */
import { robustCenter, srgbToLab, type Lab } from "../sampling/color.ts";
import { MIN_REGION_PIXELS, samplePhoto, type PhotoInput } from "../sampling/index.ts";
import { regionPixels, type Rings } from "../sampling/regions.ts";

export { RETAKE_TIPS, type RetakeTip } from "./tips.ts";

// Provisional limits: t6-eval-set tunes them against labeled photos across the skin-tone range.
/** Narrower than this, in pixels, and the face is too small to measure. */
export const MIN_FACE_WIDTH = 120;
/** Eye-white L* below this is too dark. */
const MIN_EYE_WHITE_L = 50;
/** Eye-white C*ab above this is a color cast. */
const MAX_EYE_WHITE_CHROMA = 15;
/** Skin C*ab outside this range is a filter: grayscale below, oversaturated above. */
const MIN_SKIN_CHROMA = 2;
const MAX_SKIN_CHROMA = 45;
/** Skin hue outside this range, in degrees, is a filter, judged only from `minChroma` up. */
const SKIN_HUE = { from: 25, to: 100, minChroma: 6 };

/** Share of an eye opening, brightest first, taken as the sclera: above the iris, pupil and lashes. */
const SCLERA_SHARE = 0.4;

export const EYE_OPENINGS = {
  right: [[33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]],
  left: [[263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]],
} as const satisfies Record<string, Rings>;

export type PhotoProblem = "no-face" | "dark" | "tint" | "filter";

export interface PhotoMeasures {
  /** Pixels across the landmarks' bounding box. */
  faceWidth: number | null;
  /** Null when the eye openings hold too few pixels. */
  eyeWhite: Lab | null;
  /** Both cheeks and the forehead, as color sampling measures them. */
  skin: Lab | null;
}

export interface PhotoCheck {
  problem: PhotoProblem | null;
  measures: PhotoMeasures;
}

/** `PhotoInput` whose landmarks are null when no face was detected. */
export type PhotoCheckInput = Omit<PhotoInput, "landmarks"> & {
  landmarks: PhotoInput["landmarks"] | null;
};

const chroma = (c: Lab) => Math.hypot(c.a, c.b);
const hue = (c: Lab) => (Math.atan2(c.b, c.a) * 180) / Math.PI;

/** The brightest share of both eye openings, centered; null below MIN_REGION_PIXELS. */
function eyeWhiteOf({ pixels, width, height, landmarks }: PhotoInput): Lab | null {
  const indices = [EYE_OPENINGS.right, EYE_OPENINGS.left].flatMap((r) =>
    regionPixels(r, landmarks, width, height),
  );
  if (indices.length < MIN_REGION_PIXELS) return null;
  const colors = indices
    .map((i) => srgbToLab(pixels[i * 4] ?? 0, pixels[i * 4 + 1] ?? 0, pixels[i * 4 + 2] ?? 0))
    .sort((p, q) => q.L - p.L);
  // robustCenter's top trim then drops the catchlight.
  return robustCenter(colors.slice(0, Math.ceil(colors.length * SCLERA_SHARE)));
}

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
  const photo = { ...input, landmarks };
  const sample = samplePhoto(photo);
  const skin = sample.regions.skin;
  const xs = landmarks.map((p) => p.x);
  const faceWidth = (Math.max(...xs) - Math.min(...xs)) * width;
  const measures: PhotoMeasures = { faceWidth, eyeWhite: null, skin };
  const result = (problem: PhotoProblem | null): PhotoCheck => ({ problem, measures });

  // Written so a NaN coordinate counts as outside.
  const outside = landmarks.some((p) => !(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1));
  // A null traits never follows from a face this wide; checked so a pass always samples.
  if (outside || faceWidth < MIN_FACE_WIDTH || !sample.traits) return result("no-face");

  const eyeWhite = eyeWhiteOf(photo);
  measures.eyeWhite = eyeWhite;
  if (eyeWhite && eyeWhite.L < MIN_EYE_WHITE_L) return result("dark");
  if (eyeWhite && chroma(eyeWhite) > MAX_EYE_WHITE_CHROMA) return result("tint");

  return result(skin && isFiltered(skin) ? "filter" : null);
}
