/**
 * Color sampling: pixels, face landmarks and an optional hair mask → region colors → traits.
 *
 * @see openspec/specs/color-sampling/spec.md
 */
import { robustCenter, srgbToLab, type Lab } from "./color.ts";
import { REGIONS, regionPixels, type Rings } from "./regions.ts";
import { traitsOf, type RegionColors, type Traits } from "./traits.ts";

export { deltaE, srgbToLab, type Lab } from "./color.ts";
export { REGIONS, type Rings } from "./regions.ts";
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
  /** Null when the skin region is too small to sample. */
  traits: Traits | null;
}

/** Fewer usable pixels than this and a region is absent, not estimated. */
export const MIN_REGION_PIXELS = 50;

/** Pixels per region converted to Lab; larger regions are sampled at an even stride. */
const MAX_REGION_SAMPLES = 20_000;

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

/** Samples skin, eyes, lips and hair, and reduces them to traits. Reads its input, never writes it. */
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
  return { regions, traits: traitsOf(regions) };
}
