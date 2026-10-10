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
