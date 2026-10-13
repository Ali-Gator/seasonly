/**
 * Color sampling: pixels, face landmarks and an optional hair mask → region colors → traits,
 * plus the eye white.
 *
 * @see openspec/specs/color-sampling/spec.md
 */
import { robustCenter, srgbToLab, type Lab } from "./color.ts";
import { EYE_OPENINGS, REGIONS, regionPixels, type Rings } from "./regions.ts";
import { traitsOf, type RegionColors, type Traits } from "./traits.ts";

export { deltaE, srgbToLab, type Lab } from "./color.ts";
export { EYE_OPENINGS, REGIONS, type Rings } from "./regions.ts";
export { traitsOf, type RegionColors, type Traits } from "./traits.ts";

export interface PhotoInput {
  /** RGBA, row-major, length = width × height × 4. */
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  /** Face-mesh landmarks in normalized image coordinates: 468, or 478 with irises. */
  landmarks: readonly { x: number; y: number }[];
  /** width × height; non-zero = hair. */
  hairMask?: Uint8Array;
}

export interface Sample {
  regions: RegionColors;
  /**
   * The brightest share of both eye openings, irises left out with 478 landmarks; null when the
   * openings hold too few pixels.
   */
  eyeWhite: Lab | null;
  /** Null when the skin region is too small to sample. */
  traits: Traits | null;
}

/** Fewer usable pixels than this and a region is absent, not estimated. */
export const MIN_REGION_PIXELS = 50;

/** Pixels per region converted to Lab; larger regions are sampled at an even stride. */
const MAX_REGION_SAMPLES = 20_000;

/**
 * Share of the eye openings outside the irises, brightest first, taken as the sclera: above the
 * lids and lashes.
 */
const SCLERA_SHARE = 0.3;

/** Iris center landmark, then its four ring landmarks; 478 landmarks only. */
const IRISES = [
  [468, 469, 470, 471, 472],
  [473, 474, 475, 476, 477],
] as const;

/**
 * The brightest share of both eye openings, centered, leaving out the pixels inside each iris
 * circle when the landmarks have irises; null below MIN_REGION_PIXELS opening pixels.
 */
function eyeWhiteOf({ pixels, width, height, landmarks }: PhotoInput): Lab | null {
  const indices = [EYE_OPENINGS.right, EYE_OPENINGS.left].flatMap((r) =>
    regionPixels(r, landmarks, width, height),
  );
  if (indices.length < MIN_REGION_PIXELS) return null;
  // In pixels, so the circle stays round on a photo that is not square.
  const at = (i: number) => ({
    x: (landmarks[i]?.x ?? 0) * width,
    y: (landmarks[i]?.y ?? 0) * height,
  });
  const irises =
    landmarks.length === 478
      ? IRISES.map(([center, ...ring]) => {
          const c = at(center);
          const r =
            ring.reduce((s, i) => s + Math.hypot(at(i).x - c.x, at(i).y - c.y), 0) / ring.length;
          return { ...c, r };
        })
      : [];
  const outside = (i: number) =>
    irises.every(
      (c) => Math.hypot((i % width) + 0.5 - c.x, Math.floor(i / width) + 0.5 - c.y) >= c.r,
    );
  const sclera = indices.filter(outside);
  // An opening that lies wholly inside an iris circle keeps its pixels rather than read L* 0.
  const colors = (sclera.length > 0 ? sclera : indices)
    .map((i) => srgbToLab(pixels[i * 4] ?? 0, pixels[i * 4 + 1] ?? 0, pixels[i * 4 + 2] ?? 0))
    .sort((p, q) => q.L - p.L);
  // robustCenter's top trim then drops the catchlight.
  return robustCenter(colors.slice(0, Math.ceil(colors.length * SCLERA_SHARE)));
}

function check({ pixels, width, height, landmarks, hairMask }: PhotoInput): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    throw new RangeError(`width and height: ${width} × ${height}, expected positive integers`);
  if (pixels.length !== width * height * 4)
    throw new RangeError(
      `pixels: length ${pixels.length}, expected ${width * height * 4} (${width} × ${height} × 4)`,
    );
  if (landmarks.length !== 468 && landmarks.length !== 478)
    throw new RangeError(`landmarks: ${landmarks.length} points, expected 468 or 478`);
  if (hairMask && hairMask.length !== width * height)
    throw new RangeError(
      `hairMask: length ${hairMask.length}, expected ${width * height} (${width} × ${height})`,
    );
}

/**
 * Samples skin, eyes, lips and hair, reduces them to traits, and measures the eye white.
 * Reads its input, never writes it.
 */
export function samplePhoto(input: PhotoInput): Sample {
  check(input);
  const { pixels, width, height, landmarks, hairMask } = input;
  const inside = (rings: Rings) => regionPixels(rings, landmarks, width, height);
  const notHair = (i: number) => !hairMask?.[i];
  const color = (indices: number[]): Lab | null => {
    if (indices.length < MIN_REGION_PIXELS) return null;
    // Every step-th pixel: a full-resolution selfie can have millions of hair pixels.
    const step = Math.ceil(indices.length / MAX_REGION_SAMPLES);
    const kept = step > 1 ? indices.filter((_, k) => k % step === 0) : indices;
    return robustCenter(
      kept.map((i) =>
        srgbToLab(pixels[i * 4] ?? 0, pixels[i * 4 + 1] ?? 0, pixels[i * 4 + 2] ?? 0),
      ),
    );
  };
  const hair: number[] = [];
  if (hairMask) for (let i = 0; i < hairMask.length; i++) if (hairMask[i]) hair.push(i);

  const skin = [
    ...new Set([REGIONS.forehead, REGIONS.rightCheek, REGIONS.leftCheek].flatMap(inside)),
  ]
    .filter(notHair)
    .sort((a, b) => a - b);
  const regions: RegionColors = {
    skin: color(skin),
    eyes: color([...inside(REGIONS.rightIris), ...inside(REGIONS.leftIris)]),
    lips: color(inside(REGIONS.lips).filter(notHair)),
    hair: hairMask ? color(hair) : null,
  };
  return { regions, eyeWhite: eyeWhiteOf(input), traits: traitsOf(regions) };
}
