/**
 * @see openspec/specs/color-sampling/spec.md
 */
import { describe, expect, it } from "vitest";

import {
  face478,
  paint,
  ringsOf,
  type Fill,
  type Point,
  type RGB,
} from "../__tests__/synthetic-face.ts";
import {
  deltaE,
  MIN_REGION_PIXELS,
  REGIONS,
  samplePhoto,
  srgbToLab,
  type PhotoInput,
  type Traits,
} from "./index.ts";

const SIZE = 400;
const LM = face478();
const BG: RGB = [128, 128, 128];
const SKIN: RGB = [222, 176, 148];
const LIPS: RGB = [178, 92, 90];
const EYES: RGB = [96, 72, 52];
const HAIR: RGB = [74, 52, 38];
/** A band above the face: the canonical forehead starts at y ≈ 0.107. */
const HAIR_BAND: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 0.08 },
  { x: 0, y: 0.08 },
];

interface FaceOptions {
  skin?: RGB;
  lips?: RGB;
  eyes?: RGB;
  hair?: RGB | null;
  landmarks?: readonly Point[];
  extra?: Fill[];
}

/** A painted synthetic face: skin on forehead and cheeks, lips, irises and, unless null, a hair band. */
function face({
  skin = SKIN,
  lips = LIPS,
  eyes = EYES,
  hair = HAIR,
  landmarks = LM,
  extra = [],
}: FaceOptions = {}): PhotoInput {
  const rings = (r: readonly (readonly number[])[]) => ringsOf(r, landmarks);
  const fills: Fill[] = [
    ...[REGIONS.forehead, REGIONS.rightCheek, REGIONS.leftCheek].map((r) => ({
      rings: rings(r),
      color: skin,
    })),
    { rings: rings(REGIONS.lips), color: lips },
    { rings: rings(REGIONS.rightIris), color: eyes },
    { rings: rings(REGIONS.leftIris), color: eyes },
    ...(hair ? [{ rings: [HAIR_BAND], color: hair, hair: true }] : []),
    ...extra,
  ];
  const { pixels, hairMask } = paint(SIZE, SIZE, BG, fills);
  return { pixels, width: SIZE, height: SIZE, landmarks, ...(hair ? { hairMask } : {}) };
}

/** Pixel indices a region covers on the canonical layout, painted alone. */
function regionPixels(rings: readonly (readonly number[])[]): Set<number> {
  const { hairMask } = paint(SIZE, SIZE, BG, [
    { rings: ringsOf(rings, LM), color: [0, 0, 0], hair: true },
  ]);
  return new Set([...hairMask.keys()].filter((i) => hairMask[i]));
}

const lab = ([r, g, b]: RGB) => srgbToLab(r, g, b);
const traits = (options: FaceOptions = {}): Traits => {
  const t = samplePhoto(face(options)).traits;
  if (!t) throw new Error("expected traits");
  return t;
};

describe("color conversion", () => {
  it("matches the standard sRGB D65 CIELAB values", () => {
    const white = srgbToLab(255, 255, 255);
    expect(white.L).toBeCloseTo(100, 1);
    expect(Math.abs(white.a)).toBeLessThan(0.01);
    expect(Math.abs(white.b)).toBeLessThan(0.01);
    const red = srgbToLab(255, 0, 0);
    expect(red.L).toBeCloseTo(53.24, 1);
    expect(red.a).toBeCloseTo(80.09, 1);
    expect(red.b).toBeCloseTo(67.2, 1);
  });
});

describe("regions", () => {
  /** {@link openspec/specs/color-sampling/spec.md#scenario-a-painted-synthetic-face} */
  it("reads each painted region back within ΔE 2", () => {
    const { regions } = samplePhoto(face());
    expect(deltaE(regions.skin ?? lab(BG), lab(SKIN))).toBeLessThan(2);
    expect(deltaE(regions.lips ?? lab(BG), lab(LIPS))).toBeLessThan(2);
    expect(deltaE(regions.eyes ?? lab(BG), lab(EYES))).toBeLessThan(2);
    expect(deltaE(regions.hair ?? lab(BG), lab(HAIR))).toBeLessThan(2);
  });

  /** {@link openspec/specs/color-sampling/spec.md#scenario-no-hair-mask} */
  it("reports no hair without a hair mask", () => {
    const { regions } = samplePhoto(face({ hair: null }));
    expect(regions.hair).toBeNull();
    expect(regions.skin).not.toBeNull();
    expect(regions.eyes).not.toBeNull();
    expect(regions.lips).not.toBeNull();
  });

  /** {@link openspec/specs/color-sampling/spec.md#scenario-landmarks-with-irises} */
  it("samples eyes only with 478 landmarks, and the rest the same either way", () => {
    const full = face();
    const with478 = samplePhoto(full).regions;
    const with468 = samplePhoto({ ...full, landmarks: full.landmarks.slice(0, 468) }).regions;
    expect(with478.eyes).not.toBeNull();
    expect(with468.eyes).toBeNull();
    expect(with468.skin).toEqual(with478.skin);
    expect(with468.lips).toEqual(with478.lips);
    expect(with468.hair).toEqual(with478.hair);
  });

  /** {@link openspec/specs/color-sampling/spec.md#requirement-regions-are-sampled-from-pixels-and-face-landmarks} */
  it("places the regions apart and top to bottom on the canonical face", () => {
    const names = ["forehead", "rightIris", "leftIris", "rightCheek", "leftCheek", "lips"] as const;
    const px = Object.fromEntries(names.map((n) => [n, regionPixels(REGIONS[n])])) as Record<
      (typeof names)[number],
      Set<number>
    >;
    for (const n of names) expect(px[n].size, n).toBeGreaterThanOrEqual(MIN_REGION_PIXELS);
    for (const a of names)
      for (const b of names)
        if (a < b)
          expect(
            [...px[a]].filter((i) => px[b].has(i)),
            `${a} ∩ ${b}`,
          ).toEqual([]);

    const centroid = (s: Set<number>) => {
      const xs = [...s].map((i) => (i % SIZE) / SIZE);
      const ys = [...s].map((i) => Math.floor(i / SIZE) / SIZE);
      const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
      return { x: mean(xs), y: mean(ys) };
    };
    const c = Object.fromEntries(names.map((n) => [n, centroid(px[n])])) as Record<
      (typeof names)[number],
      Point
    >;
    expect(c.forehead.y).toBeLessThan(Math.min(c.rightIris.y, c.leftIris.y));
    expect(Math.max(c.rightIris.y, c.leftIris.y)).toBeLessThan(
      Math.min(c.rightCheek.y, c.leftCheek.y),
    );
    expect(Math.max(c.rightCheek.y, c.leftCheek.y)).toBeLessThan(c.lips.y);
    // The person's right side is on the image's left.
    expect(c.rightIris.x).toBeLessThan(0.5);
    expect(c.rightCheek.x).toBeLessThan(0.5);
    expect(c.leftIris.x).toBeGreaterThan(0.5);
    expect(c.leftCheek.x).toBeGreaterThan(0.5);
  });
});

describe("highlights and shadows", () => {
  const skinPixels = [
    ...regionPixels([...REGIONS.forehead, ...REGIONS.rightCheek, ...REGIONS.leftCheek]),
  ];
  // Every tenth skin pixel, rounded down so no more than a tenth is replaced.
  const tenth = skinPixels.filter((_, k) => k % 10 === 9);

  const withSpots = (color: RGB): PhotoInput => {
    const input = face();
    for (const i of tenth) input.pixels.set(color, i * 4);
    return input;
  };
  const base = samplePhoto(face()).regions.skin ?? lab(BG);

  /** {@link openspec/specs/color-sampling/spec.md#scenario-a-highlight-on-the-cheek} */
  it("ignores a highlight on a tenth of the skin", () => {
    const skin = samplePhoto(withSpots([252, 252, 250])).regions.skin ?? lab(BG);
    expect(deltaE(skin, base)).toBeLessThan(1);
  });

  /** {@link openspec/specs/color-sampling/spec.md#scenario-a-shadow-on-the-cheek} */
  it("ignores a shadow on a tenth of the skin", () => {
    const skin = samplePhoto(withSpots([6, 5, 5])).regions.skin ?? lab(BG);
    expect(deltaE(skin, base)).toBeLessThan(1);
  });
});

describe("traits", () => {
  /** {@link openspec/specs/color-sampling/spec.md#scenario-warmer-skin} */
  it("rises in temperature as the skin turns more yellow", () => {
    const steps = [0, 1, 2, 3, 4, 5, 6].map((k) => traits({ skin: [222, 172 + k, 160 - 6 * k] }));
    for (let k = 1; k < steps.length; k++)
      expect(steps[k]?.temperature).toBeGreaterThanOrEqual(steps[k - 1]?.temperature ?? 2);
    expect(steps.at(-1)?.temperature).toBeGreaterThan(steps[0]?.temperature ?? 2);
  });

  /** {@link openspec/specs/color-sampling/spec.md#scenario-deeper-coloring} */
  it("falls in value as skin and hair darken", () => {
    const shade = ([r, g, b]: RGB, f: number): RGB => [r * f, g * f, b * f];
    const steps = [1, 0.9, 0.8, 0.7, 0.6, 0.5].map((f) =>
      traits({ skin: shade(SKIN, f), hair: shade(HAIR, f) }),
    );
    for (let k = 1; k < steps.length; k++)
      expect(steps[k]?.value).toBeLessThanOrEqual(steps[k - 1]?.value ?? -2);
    expect(steps.at(-1)?.value).toBeLessThan(steps[0]?.value ?? -2);
  });

  /** {@link openspec/specs/color-sampling/spec.md#scenario-higher-contrast} */
  it("rises in clarity as the hair darkens against the same skin", () => {
    const steps = [160, 130, 100, 70, 40, 10].map((v) => traits({ hair: [v, v * 0.75, v * 0.55] }));
    for (let k = 1; k < steps.length; k++)
      expect(steps[k]?.clarity).toBeGreaterThanOrEqual(steps[k - 1]?.clarity ?? 2);
    expect(steps.at(-1)?.clarity).toBeGreaterThan(steps[0]?.clarity ?? 2);
  });

  /** {@link openspec/specs/color-sampling/spec.md#scenario-higher-contrast} */
  it("rises in clarity as hair lighter than the skin darkens", () => {
    const steps = [250, 240, 230, 220].map((v) =>
      traits({ skin: [200, 160, 130], hair: [v, v * 0.92, v * 0.74] }),
    );
    for (let k = 1; k < steps.length; k++)
      expect(steps[k]?.clarity).toBeGreaterThanOrEqual(steps[k - 1]?.clarity ?? 2);
  });

  /** {@link openspec/specs/color-sampling/spec.md#requirement-colors-reduce-to-temperature-value-and-clarity} */
  it("barely moves temperature between black and near-black hair", () => {
    const black = traits({ hair: [0, 0, 0] }).temperature;
    for (const v of [10, 20, 30])
      expect(Math.abs(traits({ hair: [v, v, v] }).temperature - black)).toBeLessThan(0.05);
    expect(
      Math.abs(
        traits({ hair: [30, 28, 27] }).temperature - traits({ hair: [30, 30, 32] }).temperature,
      ),
    ).toBeLessThan(0.1);
  });

  /** {@link openspec/specs/color-sampling/spec.md#scenario-traits-stay-in-range} */
  it("stays within −1 and 1 with at most three decimals", () => {
    const colors: RGB[] = [
      [0, 0, 0],
      [255, 255, 255],
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
      [0, 255, 255],
      [255, 0, 255],
    ];
    const cases: FaceOptions[] = [
      ...colors.map((c) => ({ skin: c, lips: c, eyes: c, hair: c })),
      { skin: [255, 255, 255], eyes: [0, 0, 0], hair: [0, 0, 0] },
      { skin: [0, 0, 0], eyes: [255, 255, 255], hair: [255, 255, 255] },
      { skin: [255, 0, 0], eyes: [0, 0, 255], hair: [0, 255, 0], lips: [255, 255, 0] },
    ];
    for (const c of cases) {
      const t = traits(c);
      for (const v of [t.temperature, t.value, t.clarity]) {
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
        expect(Math.round(v * 1000) / 1000).toBe(v);
      }
    }
  });

  /** {@link openspec/specs/color-sampling/spec.md#scenario-a-tiny-face} */
  it("gives no traits for a face too small to sample", () => {
    const tiny = LM.map((p) => ({ x: 0.5 + p.x * 0.02, y: 0.5 + p.y * 0.02 }));
    const sample = samplePhoto(face({ landmarks: tiny }));
    expect(sample.regions.skin).toBeNull();
    expect(sample.traits).toBeNull();
  });
});

describe("malformed input", () => {
  /** {@link openspec/specs/color-sampling/spec.md#scenario-a-buffer-of-the-wrong-size} */
  it("refuses a pixel buffer of the wrong length, naming it", () => {
    const input = face();
    const short = input.pixels.slice(0, input.pixels.length - 1);
    expect(() => samplePhoto({ ...input, pixels: short })).toThrow(RangeError);
    expect(() => samplePhoto({ ...input, pixels: short })).toThrow(String(short.length));
  });

  /** {@link openspec/specs/color-sampling/spec.md#scenario-too-few-landmarks} */
  it("refuses 100 landmarks, naming the count", () => {
    const input = face();
    expect(() => samplePhoto({ ...input, landmarks: LM.slice(0, 100) })).toThrow(/\b100\b/);
  });

  it("refuses a hair mask of the wrong length", () => {
    const input = face();
    expect(() => samplePhoto({ ...input, hairMask: new Uint8Array(10) })).toThrow(/\b10\b/);
  });

  /** {@link openspec/specs/color-sampling/spec.md#scenario-a-face-partly-outside-the-frame} */
  it("clips a face partly outside the frame", () => {
    for (const dx of [0.5, -0.5]) {
      const shifted = LM.map((p) => ({ x: p.x + dx, y: p.y - 0.05 }));
      const sample = samplePhoto(face({ landmarks: shifted }));
      expect(deltaE(sample.regions.skin ?? lab(BG), lab(SKIN))).toBeLessThan(2);
    }
  });
});

describe("input", () => {
  /** {@link openspec/specs/color-sampling/spec.md#scenario-the-buffer-after-sampling} */
  it("is left untouched", () => {
    const input = face();
    const before = {
      pixels: input.pixels.slice(),
      hairMask: input.hairMask?.slice(),
      landmarks: structuredClone(input.landmarks),
    };
    samplePhoto(input);
    expect(input.pixels).toEqual(before.pixels);
    expect(input.hairMask).toEqual(before.hairMask);
    expect(input.landmarks).toEqual(before.landmarks);
  });
});
