/**
 * The generated example photos: one fictional woman, and her "bad" twins edited from the same
 * image (t9-site-content design.md decision 4). Approved by the user on the canvas on 2026-10-10.
 *
 * {@link openspec/specs/site-content/spec.md#requirement-example-photos-show-a-fictional-person}
 */
export interface Photo {
  src: string;
  alt: string;
}

/** Each photo tip's good and bad example; every good one is the same base photo. */
export const TIP_PHOTOS = {
  light: {
    good: {
      src: "/images/examples/base.webp",
      alt: "A woman facing a window in soft daylight, no makeup, hair pulled back",
    },
    bad: {
      src: "/images/examples/lamp.webp",
      alt: "The same woman lit from above by a warm ceiling lamp, her skin cast orange",
    },
  },
  makeup: {
    good: {
      src: "/images/examples/base.webp",
      alt: "The same woman with bare skin and her hair pulled back",
    },
    bad: {
      src: "/images/examples/makeup.webp",
      alt: "The same woman wearing foundation and bronzer a shade too dark for her",
    },
  },
  filter: {
    good: {
      src: "/images/examples/base.webp",
      alt: "The same woman in a photo straight from the camera",
    },
    bad: {
      src: "/images/examples/filter.webp",
      alt: "The same woman through a beauty filter: smoothed skin, a pink cast and a glow",
    },
  },
} satisfies Record<string, { good: Photo; bad: Photo }>;

/** The sample draping face, cut tight from the base photo. */
export const SAMPLE_FACE: Photo = {
  src: "/images/examples/face.webp",
  alt: "Sample face: a fictional woman with light brown hair and hazel eyes",
};

/**
 * The sample face's outline, made once by `scripts/sample-face-mask.ts` with the phone's person
 * segmenter, so the sample is cut out like a real report. Static, so it never reaches `/api/`.
 *
 * {@link openspec/specs/site-content/spec.md#requirement-the-sample-face-is-cut-out-like-a-real-reports}
 */
export const SAMPLE_FACE_MASK = "/images/examples/face-mask.png";

/**
 * The quiz's example photos (t18-design-review design.md decision 8): the same fictional woman's
 * wrist and face, edited per answer, and a gold jewelry set edited to silver and to a mix. Approved by the user on the canvas on 2026-10-13.
 *
 * {@link openspec/specs/quiz/spec.md#requirement-questions-answered-by-looking-show-example-photos}
 */
export const QUIZ_PHOTOS = {
  veins: {
    green: { src: "/images/quiz/veins-green.webp", alt: "A wrist with green to olive veins" },
    blue: { src: "/images/quiz/veins-blue.webp", alt: "A wrist with blue to purple veins" },
    mix: { src: "/images/quiz/veins-mix.webp", alt: "A wrist with both green and blue veins" },
  },
  jewelry: {
    gold: { src: "/images/quiz/jewelry-gold.webp", alt: "Two gold rings and a gold chain" },
    silver: { src: "/images/quiz/jewelry-silver.webp", alt: "Two silver rings and a silver chain" },
    both: {
      src: "/images/quiz/jewelry-both.webp",
      alt: "Two silver rings beside a gold chain",
    },
  },
  hair: {
    dark: { src: "/images/quiz/hair-dark.webp", alt: "The example woman with dark brown hair" },
    medium: {
      src: "/images/quiz/hair-medium.webp",
      alt: "The example woman with light brown hair",
    },
    blonde: { src: "/images/quiz/hair-blonde.webp", alt: "The example woman with blonde hair" },
    red: { src: "/images/quiz/hair-red.webp", alt: "The example woman with auburn hair" },
  },
} satisfies Record<string, Record<string, Photo>>;
