/**
 * sRGB to CIELAB (D65), and the robust central value of a region's colors.
 *
 * @see openspec/specs/color-sampling/spec.md
 */

export interface Lab {
  L: number;
  a: number;
  b: number;
}

/** sRGB channel value 0–255 → linear light. */
const LINEAR = Array.from({ length: 256 }, (_, i) => {
  const c = i / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

/** D65 reference white. */
const XN = 0.95047;
const ZN = 1.08883;
const EPSILON = (6 / 29) ** 3;
const f = (t: number) => (t > EPSILON ? Math.cbrt(t) : t / (3 * (6 / 29) ** 2) + 4 / 29);

/** CIELAB of an 8-bit sRGB color. */
export function srgbToLab(r: number, g: number, b: number): Lab {
  const R = LINEAR[r] ?? 0;
  const G = LINEAR[g] ?? 0;
  const B = LINEAR[b] ?? 0;
  const x = f((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / XN);
  const y = f(0.2126729 * R + 0.7151522 * G + 0.072175 * B);
  const z = f((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / ZN);
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

/** CIE76 color difference. */
export const deltaE = (p: Lab, q: Lab) => Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);

/** Share of a region dropped at each end of the lightness order: highlights and shadows. */
const TRIM = 0.1;

function median(values: number[]): number {
  const s = values.sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}

/**
 * Sorts by L* (ties by position, so the order is total), drops the top and bottom tenth,
 * then takes the per-channel median of the rest.
 */
export function robustCenter(colors: readonly Lab[]): Lab {
  const order = colors
    .map((_, i) => i)
    .sort((i, j) => (colors[i] as Lab).L - (colors[j] as Lab).L || i - j);
  const drop = Math.floor(colors.length * TRIM);
  const kept = order.slice(drop, colors.length - drop).map((i) => colors[i] as Lab);
  return {
    L: median(kept.map((c) => c.L)),
    a: median(kept.map((c) => c.a)),
    b: median(kept.map((c) => c.b)),
  };
}
