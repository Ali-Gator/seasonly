/**
 * @see openspec/specs/season-palettes/spec.md
 */
import { describe, expect, it } from "vitest";

import { PALETTES, SEASON_SLUGS } from "./index.ts";

describe("highlights", () => {
  /** {@link openspec/specs/season-palettes/spec.md#scenario-every-palettes-highlights} */
  it.each(SEASON_SLUGS)("%s has 6 distinct highlights from its best colors or neutrals", (slug) => {
    const { highlights, best, neutrals } = PALETTES[slug];
    expect(highlights).toHaveLength(6);
    const pool = [...best, ...neutrals];
    for (const h of highlights) expect(pool).toContainEqual(h);
    expect(new Set(highlights.map((h) => h.hex)).size).toBe(6);
    expect(new Set(highlights.map((h) => h.name)).size).toBe(6);
  });

  /** {@link openspec/specs/season-palettes/spec.md#scenario-soft-autumns-highlights} */
  it("Soft Autumn's are the canvas share card's colors, in order", () => {
    expect(PALETTES["soft-autumn"].highlights).toEqual([
      { name: "Terracotta", hex: "#B4694F" },
      { name: "Deep Teal", hex: "#4C7774" },
      { name: "Camel", hex: "#C39D6F" },
      { name: "Dusty Rose", hex: "#C4918A" },
      { name: "Olive", hex: "#7B7848" },
      { name: "Mushroom", hex: "#A08F7E" },
    ]);
  });
});
