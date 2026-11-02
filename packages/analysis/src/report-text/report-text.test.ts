/**
 * @see openspec/specs/report-text/spec.md
 */
import { describe, expect, it } from "vitest";

import { SEASON_SLUGS } from "../palettes/index.ts";
import { AGREEMENT_COPY, COPY_LIMITS, SEASON_COPY, type SeasonCopy } from "./index.ts";

const FIELDS = [
  "tagline",
  "summary",
  "undertone",
  "chroma",
  "contrast",
  "neutralsIntro",
  "metalsIntro",
  "makeupIntro",
  "hairTip",
  "drapingLine",
  "revealLine",
] as const satisfies readonly (keyof SeasonCopy)[];

describe("season copy", () => {
  /** {@link openspec/specs/report-text/spec.md#scenario-all-12-seasons} */
  it.each(SEASON_SLUGS)("%s has every field, non-empty and within its limit", (slug) => {
    const copy = SEASON_COPY[slug];
    expect(Object.keys(copy).sort()).toEqual([...FIELDS].sort());
    for (const field of FIELDS) {
      expect(copy[field].trim(), field).not.toBe("");
      expect(copy[field].length, field).toBeLessThanOrEqual(COPY_LIMITS[field]);
    }
  });

  /** {@link openspec/specs/report-text/spec.md#scenario-soft-autumn-against-the-canvas} */
  it("Soft Autumn is the canvas copy", () => {
    expect(SEASON_COPY["soft-autumn"]).toEqual({
      tagline: "Warm, soft and earthy.",
      summary:
        "Soft Autumn is the gentlest of the three Autumns. Your coloring is warm and muted, with medium depth and low contrast between your hair, skin and eyes. Colors with a golden base and a little dust in them blend with you. Bright, icy and very dark colors compete.",
      undertone: "Warm, leaning neutral",
      chroma: "Soft: muted, never neon",
      contrast: "Low to medium",
      neutralsIntro: "Swap black and stark white for these. They carry a whole outfit.",
      metalsIntro: "Brushed and warm beats bright and cool.",
      makeupIntro: "Stay warm and muted: terracotta nude, warm rosewood and brick rose.",
      hairTip:
        "Go one or two shades warmer than your natural color. Skip ash blonde and blue-black.",
      drapingLine: "Terracotta warms your skin; fuchsia competes with it.",
      revealLine:
        "Colors with a golden base and a little dust in them work with you. Bright, icy and very dark colors compete.",
    });
  });

  /** {@link openspec/specs/report-text/spec.md#scenario-the-soft-seasons-makeup-lines-name-shades} */
  it("the soft seasons' makeup lines name shades", () => {
    expect(SEASON_COPY["soft-summer"].makeupIntro).toBe(
      "Stay cool and dusty: dusty rose, mauve berry and soft raspberry.",
    );
    expect(SEASON_COPY["soft-autumn"].makeupIntro).toBe(
      "Stay warm and muted: terracotta nude, warm rosewood and brick rose.",
    );
  });
});

describe("agreement notes", () => {
  /** {@link openspec/specs/report-text/spec.md#scenario-all-four-cases} */
  it("has a title and body within limits for each case", () => {
    expect(Object.keys(AGREEMENT_COPY).sort()).toEqual(
      ["agree", "differ", "photo-only", "quiz-only"].sort(),
    );
    for (const [agreement, note] of Object.entries(AGREEMENT_COPY)) {
      expect(note.title.trim(), agreement).not.toBe("");
      expect(note.body.trim(), agreement).not.toBe("");
      expect(note.title.length, agreement).toBeLessThanOrEqual(COPY_LIMITS.noteTitle);
      expect(note.body.length, agreement).toBeLessThanOrEqual(COPY_LIMITS.noteBody);
    }
    expect(AGREEMENT_COPY.agree.title).toBe("Photo and quiz agree");
  });
});
