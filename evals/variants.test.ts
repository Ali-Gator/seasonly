/**
 * @see openspec/specs/analysis-eval/spec.md
 */
import { describe, expect, it } from "vitest";

import { darken, grayscale, VARIANTS, warmCast } from "./variants.ts";

/** Two pixels, RGBA. */
const PIXELS = new Uint8ClampedArray([200, 100, 40, 255, 240, 230, 220, 128]);

describe("synthetic variants", () => {
  it("darkens every channel by 0.35, alpha kept", () => {
    expect([...darken(PIXELS)]).toEqual([70, 35, 14, 255, 84, 81, 77, 128]);
  });

  it("casts warm: R × 1.15 clamped, B × 0.7", () => {
    expect([...warmCast(PIXELS)]).toEqual([230, 100, 28, 255, 255, 230, 154, 128]);
  });

  it("turns grayscale by Rec. 709 luma", () => {
    // 0.2126 × 200 + 0.7152 × 100 + 0.0722 × 40 = 116.9; 0.2126 × 240 + 0.7152 × 230 + 0.0722 × 220 = 231.4
    expect([...grayscale(PIXELS)]).toEqual([117, 117, 117, 255, 231, 231, 231, 128]);
  });

  /** {@link openspec/specs/analysis-eval/spec.md#requirement-the-photo-check-is-measured-both-ways} */
  it("leaves the input unchanged, and each variant expects its problem", () => {
    const copy = new Uint8ClampedArray(PIXELS);
    for (const v of VARIANTS) v.apply(PIXELS);
    expect(PIXELS).toEqual(copy);
    expect(VARIANTS.map((v) => [v.name, v.expected])).toEqual([
      ["dark", "dark"],
      ["warm", "tint"],
      ["gray", "filter"],
    ]);
  });
});
