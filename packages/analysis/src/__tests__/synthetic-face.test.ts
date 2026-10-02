import { describe, expect, it } from "vitest";

import { CANONICAL_468 } from "./canonical-face.ts";
import { face478, paint } from "./synthetic-face.ts";

describe("synthetic face fixture", () => {
  it("has 468 canonical landmarks inside the unit square, plus 10 iris points", () => {
    expect(CANONICAL_468).toHaveLength(468);
    expect(face478()).toHaveLength(478);
    for (const p of CANONICAL_468) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
    // Forehead (10) above the nose tip (1) above the chin (152).
    const y = (i: number) => CANONICAL_468[i]?.y ?? NaN;
    expect(y(10)).toBeLessThan(y(1));
    expect(y(1)).toBeLessThan(y(152));
  });

  it("paints a polygon and reads back its pixels", () => {
    const square = [
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.25 },
      { x: 0.75, y: 0.75 },
      { x: 0.25, y: 0.75 },
    ];
    const { pixels, hairMask } = paint(
      8,
      8,
      [10, 20, 30],
      [{ rings: [square], color: [200, 100, 50], hair: true }],
    );
    const at = (x: number, y: number) => [...pixels.subarray((y * 8 + x) * 4, (y * 8 + x) * 4 + 4)];
    expect(at(3, 3)).toEqual([200, 100, 50, 255]);
    expect(at(0, 0)).toEqual([10, 20, 30, 255]);
    expect(hairMask[3 * 8 + 3]).toBe(1);
    expect(hairMask[0]).toBe(0);
    expect(hairMask.reduce((a, b) => a + b, 0)).toBe(16);
  });
});
