/**
 * @see openspec/specs/photo-check/spec.md
 */
import { describe, expect, it } from "vitest";

import { face478, paint, ringsOf, type Point, type RGB } from "../__tests__/synthetic-face.ts";
import { REGIONS, samplePhoto, type PhotoInput } from "../sampling/index.ts";
import {
  checkPhoto,
  EYE_OPENINGS,
  MIN_FACE_WIDTH,
  RETAKE_TIPS,
  type PhotoCheckInput,
  type PhotoProblem,
} from "./index.ts";

const SIZE = 400;
const LM = face478();
const BG: RGB = [128, 128, 128];
const SKIN: RGB = [222, 176, 148];
/** Near-white sclera: L* 93.8, C*ab 2.8. */
const SCLERA: RGB = [0xf0, 0xed, 0xe8];
const IRIS: RGB = [96, 72, 52];

/**
 * The 10 Monk Skin Tone colors, MST 1 to 10, from https://skintone.google/get-started
 * (Monk Skin Tone Scale, Google, CC BY 4.0).
 */
const MST: RGB[] = [
  "f6ede4",
  "f3e7db",
  "f7ead0",
  "eadaba",
  "d7bd96",
  "a07e56",
  "825c43",
  "604134",
  "3a312a",
  "292420",
].map((hex): RGB => {
  const n = parseInt(hex, 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
});
const DEEPEST = MST[9] as RGB;

/**
 * Upper-lid landmark → the lower-lid landmark below it, from FACEMESH_RIGHT_EYE and
 * FACEMESH_LEFT_EYE (face_mesh_connections.py, commit b453bf8).
 */
const LIDS: [upper: number, lower: number][] = [
  [246, 7],
  [161, 163],
  [160, 144],
  [159, 145],
  [158, 153],
  [157, 154],
  [173, 155],
  [466, 249],
  [388, 390],
  [387, 373],
  [386, 374],
  [385, 380],
  [384, 381],
  [398, 382],
];

/** A painted face: skin on forehead and cheeks, near-white eye openings, dark irises. */
function face({ skin = SKIN, landmarks = LM }: { skin?: RGB; landmarks?: Point[] } = {}) {
  const rings = (r: readonly (readonly number[])[]) => ringsOf(r, landmarks);
  const { pixels } = paint(SIZE, SIZE, BG, [
    ...[REGIONS.forehead, REGIONS.rightCheek, REGIONS.leftCheek].map((r) => ({
      rings: rings(r),
      color: skin,
    })),
    { rings: rings(EYE_OPENINGS.right), color: SCLERA },
    { rings: rings(EYE_OPENINGS.left), color: SCLERA },
    { rings: rings(REGIONS.rightIris), color: IRIS },
    { rings: rings(REGIONS.leftIris), color: IRIS },
  ]);
  return { pixels, width: SIZE, height: SIZE, landmarks } satisfies PhotoInput;
}

/** Every pixel's RGB through `f`; the buffer stores the result rounded and clamped. */
function edit(photo: PhotoInput, f: (rgb: RGB) => RGB): PhotoInput {
  const pixels = new Uint8ClampedArray(photo.pixels);
  for (let i = 0; i < pixels.length; i += 4)
    pixels.set(f([pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0]), i);
  return { ...photo, pixels };
}
/** Eye white L* 20. */
const darken = (p: PhotoInput) => edit(p, ([r, g, b]) => [r * 0.2, g * 0.2, b * 0.2]);
/** Eye white C*ab 29, yellow. */
const warm = (p: PhotoInput) => edit(p, ([r, g, b]) => [r, g * 0.9, b * 0.7]);
/** Eye white C*ab 30, blue-green. */
const cool = (p: PhotoInput) => edit(p, ([r, g, b]) => [r * 0.6, g, b]);
/** Rec. 709 luma. */
const gray = (p: PhotoInput) =>
  edit(p, ([r, g, b]) => {
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return [y, y, y];
  });

const xs = LM.map((p) => p.x);
const ys = LM.map((p) => p.y);
const CENTER = {
  x: (Math.min(...xs) + Math.max(...xs)) / 2,
  y: (Math.min(...ys) + Math.max(...ys)) / 2,
};
/** The canonical face's width in pixels at SIZE. */
const FULL_WIDTH = (Math.max(...xs) - Math.min(...xs)) * SIZE;

/** Landmarks scaled about the face center. */
const scaled = (s: number) =>
  LM.map((p) => ({ x: CENTER.x + (p.x - CENTER.x) * s, y: CENTER.y + (p.y - CENTER.y) * s }));

/** Upper lids moved onto the lower lids: both eye openings collapse to a line. */
function closedEyes(): Point[] {
  const out = LM.map((p) => ({ ...p }));
  for (const [upper, lower] of LIDS) out[upper] = { ...(LM[lower] as Point) };
  return out;
}

const problem = (photo: PhotoCheckInput) => checkPhoto(photo).problem;
/** The message `samplePhoto` refuses this input with; empty when it does not. */
function samplingError(photo: PhotoInput): string {
  try {
    samplePhoto(photo);
  } catch (e) {
    return (e as Error).message;
  }
  return "";
}
const chroma = (c: { a: number; b: number }) => Math.hypot(c.a, c.b);

/** Every photo this file expects to pass, for the sampling guarantee. */
const PASSING: [name: string, photo: () => PhotoInput][] = [
  ["the good photo", () => face()],
  ["MST 10", () => face({ skin: DEEPEST })],
  ["eyes closed", () => face({ landmarks: closedEyes() })],
  ["a face at the minimum width", () => face({ landmarks: atMinWidth() })],
  ["468 landmarks, no irises", () => ({ ...face(), landmarks: LM.slice(0, 468) })],
  ...MST.map((skin, i): [string, () => PhotoInput] => [`MST ${i + 1}`, () => face({ skin })]),
];

/** A face whose width is the minimum, nudged up so rounding never puts it a hair below. */
function atMinWidth(): Point[] {
  return scaled((MIN_FACE_WIDTH + 1e-6) / FULL_WIDTH);
}

describe("checkPhoto", () => {
  /** {@link openspec/specs/photo-check/spec.md#requirement-the-check-reports-at-most-one-of-four-problems} */
  describe("one problem at most", () => {
    /** {@link openspec/specs/photo-check/spec.md#scenario-a-good-photo} */
    it("passes a good photo with every measurement present", () => {
      const check = checkPhoto(face());
      expect(check.problem).toBeNull();
      expect(check.measures.faceWidth).toBeCloseTo(FULL_WIDTH, 6);
      expect(check.measures.eyeWhite).not.toBeNull();
      expect(check.measures.skin).not.toBeNull();
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-a-photo-with-two-problems} */
    it("reports only dark for a dark, tinted photo", () => {
      // A cast strong enough to outlive the darkening: eye white L* 19, C*ab 27.
      const check = checkPhoto(darken(edit(face(), ([r, g]) => [r, g, 0])));
      expect(check.problem).toBe("dark");
      const eyeWhite = check.measures.eyeWhite ?? { L: NaN, a: NaN, b: NaN };
      expect(eyeWhite.L).toBeLessThan(25);
      expect(chroma(eyeWhite)).toBeGreaterThan(25);
    });
  });

  /** {@link openspec/specs/photo-check/spec.md#requirement-a-missing-small-or-cut-off-face-is-reported-as-no-face} */
  describe("no face", () => {
    /** {@link openspec/specs/photo-check/spec.md#scenario-no-face-detected} */
    it("reports no-face without landmarks, every measurement absent", () => {
      expect(checkPhoto({ ...face(), landmarks: null })).toEqual({
        problem: "no-face",
        measures: { faceWidth: null, eyeWhite: null, skin: null },
      });
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-a-face-too-small} */
    it("reports no-face for a face half the minimum width", () => {
      const check = checkPhoto(face({ landmarks: scaled(MIN_FACE_WIDTH / 2 / FULL_WIDTH) }));
      expect(check.problem).toBe("no-face");
      expect(check.measures.faceWidth).toBeCloseTo(MIN_FACE_WIDTH / 2, 6);
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-a-face-partly-out-of-frame} */
    it.each([
      ["past the right edge", LM.map((p) => ({ x: p.x + 0.1, y: p.y }))],
      ["past the bottom edge", LM.map((p) => ({ x: p.x, y: p.y + 0.1 }))],
      ["not a number", LM.map((p, i) => (i === 10 ? { x: NaN, y: NaN } : p))],
    ])("reports no-face for a landmark %s", (_, landmarks) => {
      expect(problem(face({ landmarks }))).toBe("no-face");
    });

    /** Design decision 5: the eye whites stay measurable at the smallest face that passes. */
    it("measures the eye whites of a face at the minimum width", () => {
      const check = checkPhoto(face({ landmarks: atMinWidth() }));
      expect(check.measures.faceWidth).toBeGreaterThanOrEqual(MIN_FACE_WIDTH);
      expect(check.problem).toBeNull();
      expect(check.measures.eyeWhite).not.toBeNull();
    });
  });

  /** {@link openspec/specs/photo-check/spec.md#requirement-a-photo-that-passes-can-be-sampled} */
  describe("sampling guarantee", () => {
    /** {@link openspec/specs/photo-check/spec.md#scenario-sampling-a-passed-photo} */
    it.each(PASSING)("samples %s into traits", (_, photo) => {
      const input = photo();
      expect(problem(input)).toBeNull();
      expect(samplePhoto(input).traits).not.toBeNull();
    });
  });

  /** {@link openspec/specs/photo-check/spec.md#requirement-darkness-is-judged-from-the-eye-whites-not-the-skin} */
  describe("dark", () => {
    /** {@link openspec/specs/photo-check/spec.md#scenario-a-light-skinned-face-underexposed} */
    it("reports dark for a light-skinned face at a fifth of its brightness", () => {
      expect(problem(face())).toBeNull();
      expect(problem(darken(face()))).toBe("dark");
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-a-deep-skinned-face-in-good-light} */
    it("passes the deepest Monk Skin Tone in good light", () => {
      expect(problem(face({ skin: DEEPEST }))).toBeNull();
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-a-dim-indoor-selfie} */
    it("passes a face at a third of its brightness, eye white L* 33 as indoors", () => {
      expect(problem(edit(face(), ([r, g, b]) => [r * 0.33, g * 0.33, b * 0.33]))).toBeNull();
    });
  });

  /** {@link openspec/specs/photo-check/spec.md#requirement-a-color-cast-is-judged-from-the-eye-whites} */
  describe("tint", () => {
    /** {@link openspec/specs/photo-check/spec.md#scenario-warm-lamp-light} */
    it("reports tint for a warm cast", () => {
      expect(problem(warm(face()))).toBe("tint");
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-cool-light} */
    it("reports tint for a cool cast", () => {
      expect(problem(cool(face()))).toBe("tint");
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-warm-indoor-light} */
    it("passes a mild warm cast, eye white C*ab 19 as indoors", () => {
      expect(problem(edit(face(), ([r, g, b]) => [r, g * 0.85, b * 0.78]))).toBeNull();
    });
  });

  /** {@link openspec/specs/photo-check/spec.md#requirement-eye-whites-that-cannot-be-measured-do-not-reject-a-photo} */
  describe("unmeasurable eye whites", () => {
    /** {@link openspec/specs/photo-check/spec.md#scenario-eyes-closed} */
    it("passes closed eyes with no eye-white color", () => {
      const check = checkPhoto(face({ landmarks: closedEyes() }));
      expect(check.problem).toBeNull();
      expect(check.measures.eyeWhite).toBeNull();
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-eyes-closed-in-a-grayscale-photo} */
    it("still reports a grayscale filter with closed eyes", () => {
      expect(problem(gray(face({ landmarks: closedEyes() })))).toBe("filter");
    });
  });

  /** {@link openspec/specs/photo-check/spec.md#requirement-a-filter-is-judged-from-skin-color-no-natural-skin-has} */
  describe("filter", () => {
    /** {@link openspec/specs/photo-check/spec.md#scenario-a-black-and-white-photo} */
    it("reports filter for grayscale, whose neutral sclera is no tint", () => {
      expect(problem(gray(face()))).toBe("filter");
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-a-pink-filter-on-the-skin} */
    it("reports filter for magenta skin under neutral eye whites", () => {
      expect(problem(face({ skin: [0xc8, 0x90, 0xb8] }))).toBe("filter");
    });

    it("reports filter for green skin under neutral eye whites", () => {
      expect(problem(face({ skin: [160, 180, 130] }))).toBe("filter"); // C*ab 28, hue 124°
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-skin-reddened-by-dim-warm-light} */
    it("passes skin of hue 20°, as a webcam reads it in dim warm light", () => {
      expect(problem(face({ skin: [150, 95, 97] }))).toBeNull(); // C*ab 24, hue 20°
    });

    /** {@link openspec/specs/photo-check/spec.md#requirement-a-filter-is-judged-from-skin-color-no-natural-skin-has} */
    it("passes skin just below hue 0°, as daylight and flash render some light skin", () => {
      const check = checkPhoto(face({ skin: [182, 160, 167] })); // C*ab 9, hue −5°
      expect(check.problem).toBeNull();
      const skin = check.measures.skin ?? { a: 0, b: 1 };
      expect(Math.atan2(skin.b, skin.a)).toBeLessThan(0);
    });

    it("ignores the hue of near-gray skin", () => {
      expect(problem(face({ skin: [120, 124, 130] }))).toBeNull(); // C*ab 3.8, hue −94°
    });

    it("reports filter for oversaturated skin of a natural hue", () => {
      const check = checkPhoto(face({ skin: [255, 100, 0] }));
      expect(check.problem).toBe("filter");
      expect(chroma(check.measures.skin ?? { a: 0, b: 0 })).toBeGreaterThan(90);
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-every-skin-tone-passes} */
    it.each(MST.map((skin, i) => [i + 1, skin] as const))("passes MST %i", (_, skin) => {
      expect(problem(face({ skin }))).toBeNull();
    });
  });

  /** The eye openings are copied, not drawn: a mis-copied ring fails here. */
  describe("eye-opening rings", () => {
    const top = Math.max(...(ringsOf(REGIONS.forehead, LM)[0] ?? []).map((p) => p.y));
    it.each([
      ["right", EYE_OPENINGS.right, 468],
      ["left", EYE_OPENINGS.left, 473],
    ] as const)("the %s opening holds its iris center, between brows and cheeks", (_, rings, c) => {
      const iris = LM[c] as Point;
      const { pixels } = paint(
        SIZE,
        SIZE,
        [0, 0, 0],
        [{ rings: ringsOf(rings, LM), color: [255, 255, 255] }],
      );
      expect(pixels[(Math.floor(iris.y * SIZE) * SIZE + Math.floor(iris.x * SIZE)) * 4]).toBe(255);
      const cheeks = Math.min(
        ...[REGIONS.rightCheek, REGIONS.leftCheek]
          .flatMap((r) => ringsOf(r, LM)[0] ?? [])
          .map((p) => p.y),
      );
      for (const p of ringsOf(rings, LM).flat()) {
        expect(p.y).toBeGreaterThan(top);
        expect(p.y).toBeLessThan(cheeks);
      }
    });
  });

  /** {@link openspec/specs/photo-check/spec.md#requirement-malformed-input-is-refused} */
  describe("malformed input", () => {
    /** {@link openspec/specs/photo-check/spec.md#scenario-a-short-buffer-with-no-face} */
    it("refuses a short buffer without landmarks exactly as sampling does", () => {
      const short = { ...face(), pixels: face().pixels.slice(1) };
      const sampled = samplingError(short);
      expect(sampled).toContain(String(short.pixels.length));
      expect(() => checkPhoto({ ...short, landmarks: null })).toThrow(new RangeError(sampled));
    });

    it("refuses a wrong-size hair mask without landmarks exactly as sampling does", () => {
      const masked = { ...face(), hairMask: new Uint8Array(10) };
      expect(samplingError(masked)).toContain("hairMask: length 10");
      const sampled = samplingError(masked);
      expect(() => checkPhoto({ ...masked, landmarks: null })).toThrow(new RangeError(sampled));
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-too-few-landmarks} */
    it("refuses 100 landmarks, naming the count", () => {
      expect(() => checkPhoto({ ...face(), landmarks: LM.slice(0, 100) })).toThrow(/100 points/);
    });
  });

  /** {@link openspec/specs/photo-check/spec.md#requirement-the-check-is-deterministic-and-leaves-its-input-untouched} */
  describe("determinism", () => {
    /** {@link openspec/specs/photo-check/spec.md#scenario-one-photo-checked-twice} */
    it("gives equal results twice", () => {
      const photo = warm(face());
      expect(checkPhoto(photo)).toEqual(checkPhoto(photo));
    });

    /** {@link openspec/specs/photo-check/spec.md#scenario-the-buffer-after-the-check} */
    it("leaves the buffer and landmarks untouched", () => {
      const photo = face();
      const pixels = photo.pixels.slice();
      const landmarks = structuredClone(photo.landmarks);
      checkPhoto(photo);
      expect(photo.pixels).toEqual(pixels);
      expect(photo.landmarks).toEqual(landmarks);
    });
  });
});

/** {@link openspec/specs/photo-check/spec.md#requirement-each-problem-has-its-own-retake-tip} */
describe("RETAKE_TIPS", () => {
  /** {@link openspec/specs/photo-check/spec.md#scenario-four-bad-photos-four-tips} */
  it("gives four bad photos four problems and four distinct tips", () => {
    const problems = [
      problem({ ...face(), landmarks: null }),
      problem(darken(face())),
      problem(warm(face())),
      problem(gray(face())),
    ];
    expect(problems).toEqual(["no-face", "dark", "tint", "filter"]);
    const tips = problems.map((p) => RETAKE_TIPS[p as PhotoProblem]);
    expect(new Set(tips.map((t) => JSON.stringify(t))).size).toBe(4);
  });

  /**
   * Copied from the approved MVP canvas, https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3:
   * the danger and retake-tip notes of project/BadNoFace.dc.html, BadDark, BadTint, BadFilter and
   * BadSeveral.
   *
   * {@link openspec/specs/photo-check/spec.md#scenario-tips-match-the-canvas}
   */
  it("matches the canvas copy", () => {
    expect(RETAKE_TIPS).toEqual({
      "no-face": {
        title: "No face found",
        message: "We couldn't find a face in this photo.",
        tip: "Hold the phone at eye level, with your whole face in the frame and your hair off your forehead.",
        icon: "info",
      },
      dark: {
        title: "Too dark",
        message: "This photo is too dark to read your skin tone.",
        tip: "Move closer to a window and face it. Turn off the lamps, so daylight does the work.",
        icon: "sun",
      },
      tint: {
        title: "Tinted light",
        message:
          "The light in this photo has a color cast, from a lamp or a colored wall. It shifts your skin tone, so your result would be off.",
        tip: "Stand by a window in daylight, away from lamps and colored walls. A cloudy day works best.",
        icon: "sun",
      },
      filter: {
        title: "Filter detected",
        message: "Your photo looks filtered. Filters shift skin tone, so your result would be off.",
        tip: "Try one straight from the camera. Turn off beauty mode and portrait effects first.",
        icon: "camera",
      },
      "several-faces": {
        title: "More than one face",
        message: "We found more than one face in this photo.",
        tip: "Take it on your own, with nobody else close to you in the frame.",
        icon: "camera",
      },
    });
  });

  /**
   * Copied from project/BadSeveral.dc.html on the canvas, approved 2026-10-03.
   *
   * {@link openspec/specs/photo-check/spec.md#requirement-each-problem-has-its-own-retake-tip}
   */
  it("has a several-faces tip distinct from the other four", () => {
    const { "several-faces": several, ...four } = RETAKE_TIPS;
    expect(Object.keys(four).sort()).toEqual(["dark", "filter", "no-face", "tint"]);
    for (const tip of Object.values(four)) expect(several).not.toEqual(tip);
    expect(several.title).toBe("More than one face");
  });
});
