/**
 * Synthetic bad versions of a usable photo, applied in sRGB to its pixels: each should get the
 * problem it names. The factors are frozen once the baseline is recorded; a change to them needs
 * a new baseline, approved by the user.
 *
 * {@link openspec/specs/analysis-eval/spec.md#requirement-the-photo-check-is-measured-both-ways}
 */
import type { PhotoProblem } from "../packages/analysis/src/index.ts";

const DARK = 0.35;
const WARM = { r: 1.15, b: 0.7 };
/** Rec. 709 luma weights. */
const LUMA = [0.2126, 0.7152, 0.0722] as const;

/** A copy of `pixels` with each pixel's RGB through `f`; alpha kept. */
function map(pixels: Uint8ClampedArray, f: (r: number, g: number, b: number) => number[]) {
  const out = new Uint8ClampedArray(pixels);
  for (let i = 0; i < out.length; i += 4) {
    const rgb = f(out[i] ?? 0, out[i + 1] ?? 0, out[i + 2] ?? 0);
    // Rounded half up, not by the clamped array's half-to-even.
    out.set(rgb.map(Math.round), i);
  }
  return out;
}

export const darken = (pixels: Uint8ClampedArray) =>
  map(pixels, (r, g, b) => [r * DARK, g * DARK, b * DARK]);

export const warmCast = (pixels: Uint8ClampedArray) =>
  map(pixels, (r, g, b) => [r * WARM.r, g, b * WARM.b]);

export const grayscale = (pixels: Uint8ClampedArray) =>
  map(pixels, (r, g, b) => {
    const y = LUMA[0] * r + LUMA[1] * g + LUMA[2] * b;
    return [y, y, y];
  });

export const VARIANTS: readonly {
  name: string;
  expected: PhotoProblem;
  apply: (pixels: Uint8ClampedArray) => Uint8ClampedArray;
}[] = [
  { name: "dark", expected: "dark", apply: darken },
  { name: "warm", expected: "tint", apply: warmCast },
  { name: "gray", expected: "filter", apply: grayscale },
];
