/**
 * Synthetic faces for the analysis core's tests: the canonical landmarks plus irises, and a
 * painter that fills polygons with flat colors on an RGBA buffer.
 */
import { CANONICAL_468 } from "./canonical-face.ts";

export interface Point {
  x: number;
  y: number;
}
export type RGB = readonly [number, number, number];

/** Iris radius in normalized units: about a fifth of the canonical eye width. */
const IRIS_R = 0.028;

/** 468 canonical landmarks, then 10 iris points (468 right center, 469–472 its ring; 473 left center, 474–477). */
export function face478(): Point[] {
  const at = (i: number) => CANONICAL_468[i] ?? { x: 0, y: 0 };
  const iris = (outer: number, inner: number): Point[] => {
    const c = { x: (at(outer).x + at(inner).x) / 2, y: (at(outer).y + at(inner).y) / 2 };
    const ring = [0, 1, 2, 3].map((k) => ({
      x: c.x + IRIS_R * Math.cos((k * Math.PI) / 2),
      y: c.y - IRIS_R * Math.sin((k * Math.PI) / 2),
    }));
    return [c, ...ring];
  };
  return [...CANONICAL_468, ...iris(33, 133), ...iris(263, 362)];
}

/** Landmark index rings as point rings. */
export const ringsOf = (rings: readonly (readonly number[])[], landmarks: readonly Point[]) =>
  rings.map((ring) => ring.map((i) => landmarks[i] ?? { x: 0, y: 0 }));

export interface Fill {
  /** Normalized point rings; a pixel is filled when its center is inside an odd number of them. */
  rings: readonly (readonly Point[])[];
  color: RGB;
  /** Marks the filled pixels as hair in the mask. */
  hair?: boolean;
}

function inside(px: number, py: number, rings: readonly (readonly Point[])[]): boolean {
  let odd = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i] as Point;
      const b = ring[j] as Point;
      if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) odd = !odd;
    }
  }
  return odd;
}

/** Paints `fills` in order over `background`; a later fill overwrites an earlier one. */
export function paint(
  width: number,
  height: number,
  background: RGB,
  fills: readonly Fill[],
): { pixels: Uint8ClampedArray; hairMask: Uint8Array } {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const hairMask = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) pixels.set([...background, 255], p * 4);
  for (const fill of fills) {
    const rings = fill.rings.map((r) => r.map((pt) => ({ x: pt.x * width, y: pt.y * height })));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!inside(x + 0.5, y + 0.5, rings)) continue;
        pixels.set([...fill.color, 255], (y * width + x) * 4);
        hairMask[y * width + x] = fill.hair ? 1 : 0;
      }
    }
  }
  return { pixels, hairMask };
}
