/**
 * Region colors → temperature, value and clarity.
 *
 * Every constant here is provisional: t6-eval-set tunes them against labeled photos.
 *
 * @see openspec/specs/color-sampling/spec.md
 */
import type { Lab } from "./color.ts";

export interface RegionColors {
  /** Both cheeks and the forehead together. */
  skin: Lab | null;
  /** Both irises; needs 478 landmarks. */
  eyes: Lab | null;
  lips: Lab | null;
  /** Needs a hair mask. */
  hair: Lab | null;
}

/** Each from −1 to 1, three decimals: cool → warm, deep → light, soft → bright. */
export interface Traits {
  temperature: number;
  value: number;
  clarity: number;
}

/** `[mid, half]`: the input that maps to 0, and the distance from it that maps to ±1. */
const SKIN_HUE = [55, 15] as const;
const HAIR_HUE = [60, 20] as const;
const SKIN_L = [62, 15] as const;
const HAIR_L = [40, 25] as const;
const EYES_L = [40, 20] as const;
const SKIN_C = [20, 8] as const;
const EYES_C = [20, 15] as const;
/** Largest lightness gap from the skin to the hair or the eyes. */
const CONTRAST = [30, 20] as const;

/** Weights within each trait's mean. */
const W = {
  temperature: { skin: 2, hair: 1 },
  value: { skin: 2, hair: 1, eyes: 0.5 },
  clarity: { skin: 1, eyes: 1, contrast: 1 },
};

const n = (v: number, [mid, half]: readonly [number, number]) =>
  Math.min(1, Math.max(-1, (v - mid) / half));
const hue = (c: Lab) => (Math.atan2(c.b, c.a) * 180) / Math.PI;
const chroma = (c: Lab) => Math.hypot(c.a, c.b);
/** Rounded to three decimals, and never −0. */
const round3 = (v: number) => Math.round(v * 1000) / 1000 || 0;

/** Weighted mean of `[value, weight]` terms; absent regions are left out, not counted as 0. */
function mean(terms: ([number, number] | null)[]): number {
  const present = terms.filter((t) => t !== null);
  const total = present.reduce((s, [, w]) => s + w, 0);
  return round3(present.reduce((s, [v, w]) => s + v * w, 0) / total);
}

/** Null without skin: there is nothing to measure against. */
export function traitsOf({ skin, eyes, hair }: RegionColors): Traits | null {
  if (!skin) return null;
  const gaps = [hair, eyes].flatMap((c) => (c ? [Math.abs(skin.L - c.L)] : []));
  return {
    temperature: mean([
      [n(hue(skin), SKIN_HUE), W.temperature.skin],
      hair && [n(hue(hair), HAIR_HUE), W.temperature.hair],
    ]),
    value: mean([
      [n(skin.L, SKIN_L), W.value.skin],
      hair && [n(hair.L, HAIR_L), W.value.hair],
      eyes && [n(eyes.L, EYES_L), W.value.eyes],
    ]),
    clarity: mean([
      [n(chroma(skin), SKIN_C), W.clarity.skin],
      eyes && [n(chroma(eyes), EYES_C), W.clarity.eyes],
      gaps.length ? [n(Math.max(...gaps), CONTRAST), W.clarity.contrast] : null,
    ]),
  };
}
