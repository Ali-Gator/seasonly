/**
 * @see openspec/specs/season-palettes/spec.md
 */
import { describe, expect, it } from "vitest";

import { PALETTES, SEASON_SLUGS, seasonFamily, type Palette, type Swatch } from "./index.ts";

const SECTIONS = [
  "best",
  "avoid",
  "neutrals",
  "metals",
  "metalsAvoid",
  "lips",
  "blush",
  "eyes",
  "hair",
] as const;

/** [min, max] swatches per section. */
const COUNTS: Record<(typeof SECTIONS)[number], [number, number]> = {
  best: [24, 24],
  neutrals: [6, 6],
  avoid: [6, Infinity],
  metals: [2, Infinity],
  metalsAvoid: [1, Infinity],
  lips: [3, 3],
  blush: [3, 3],
  eyes: [3, 3],
  hair: [3, 3],
};

describe("season list", () => {
  /** {@link openspec/specs/season-palettes/spec.md#requirement-the-core-owns-the-season-list} */
  it("has the 12 fixed slugs in family order", () => {
    expect(SEASON_SLUGS).toEqual([
      "light-spring",
      "true-spring",
      "bright-spring",
      "light-summer",
      "true-summer",
      "soft-summer",
      "soft-autumn",
      "true-autumn",
      "deep-autumn",
      "deep-winter",
      "true-winter",
      "bright-winter",
    ]);
    expect(SEASON_SLUGS.map(seasonFamily)).toEqual(
      ["spring", "summer", "autumn", "winter"].flatMap((f) => [f, f, f]),
    );
  });

  /** {@link openspec/specs/season-palettes/spec.md#scenario-a-seasons-family} */
  it("puts soft-autumn in autumn", () => {
    expect(seasonFamily("soft-autumn")).toBe("autumn");
  });
});

describe.each(SEASON_SLUGS)("%s palette", (slug) => {
  const palette: Palette = PALETTES[slug];

  /** {@link openspec/specs/season-palettes/spec.md#scenario-all-12-palettes} */
  it("has every section at its count, uppercase hex and unique names", () => {
    for (const section of SECTIONS) {
      const list: readonly Swatch[] = palette[section];
      const [min, max] = COUNTS[section];
      expect(list.length, section).toBeGreaterThanOrEqual(min);
      expect(list.length, section).toBeLessThanOrEqual(max);
      for (const s of list) expect(s.hex, `${section} ${s.name}`).toMatch(/^#[0-9A-F]{6}$/);
      expect(new Set(list.map((s) => s.name)).size, section).toBe(list.length);
    }
  });

  /** {@link openspec/specs/season-palettes/spec.md#scenario-the-draping-pair} */
  it("takes its draping pair from best and avoid", () => {
    expect(palette.best).toContainEqual(palette.draping.best);
    expect(palette.avoid).toContainEqual(palette.draping.worst);
  });

  /** {@link openspec/specs/season-palettes/spec.md#scenario-a-color-listed-twice} */
  it("lists no avoid hex among best colors or neutrals", () => {
    const good = new Set([...palette.best, ...palette.neutrals].map((s) => s.hex));
    expect(palette.avoid.filter((s) => good.has(s.hex))).toEqual([]);
  });
});

/** The full report on the approved canvas, project/Report.dc.html, section by section. */
const CANVAS_SOFT_AUTUMN = {
  best: [
    ["Soft Coral", "#D88E77"],
    ["Dusty Rose", "#C4918A"],
    ["Mauve", "#9C7A82"],
    ["Rosewood", "#8E5A55"],
    ["Plum Brown", "#6E4D4F"],
    ["Copper", "#B87A4D"],
    ["Terracotta", "#B4694F"],
    ["Rust", "#A65E3E"],
    ["Burnt Terracotta", "#A4583F"],
    ["Brick", "#9B5544"],
    ["Wheat", "#D8C3A0"],
    ["Camel", "#C39D6F"],
    ["Honey", "#C99A5B"],
    ["Mustard", "#BF9A4A"],
    ["Khaki", "#A9A27A"],
    ["Sage", "#8E9A78"],
    ["Olive", "#7B7848"],
    ["Moss", "#66704A"],
    ["Jade", "#5E8C7A"],
    ["Pine", "#3F5A4C"],
    ["Denim Smoke", "#6C7E8A"],
    ["Slate Teal", "#577C80"],
    ["Deep Teal", "#4C7774"],
    ["Spruce", "#3E6366"],
  ],
  avoid: [
    ["Optic White", "#FDFDFD"],
    ["Icy Pink", "#F1D3E2"],
    ["Lemon Yellow", "#F2E14C"],
    ["Fuchsia", "#CC2A7E"],
    ["Electric Blue", "#2457D6"],
    ["Jet Black", "#111111"],
  ],
  neutrals: [
    ["Ivory Cream", "#EDE3CF"],
    ["Oatmeal", "#D9CDB8"],
    ["Mushroom", "#A08F7E"],
    ["Warm Taupe", "#8C7766"],
    ["Cocoa", "#6A5145"],
    ["Espresso", "#4A3A33"],
  ],
  metals: [
    ["Brushed Gold", "#C8A464"],
    ["Rose Gold", "#B98A72"],
    ["Bronze", "#8C6A43"],
    ["Antique Brass", "#A88A5A"],
  ],
  metalsAvoid: [
    ["Polished Silver", "#C7CBD1"],
    ["Platinum", "#DCDDDF"],
  ],
  lips: [
    ["Terracotta Nude", "#B06B5A"],
    ["Warm Rosewood", "#94574F"],
    ["Brick Rose", "#A2564A"],
  ],
  blush: [
    ["Soft Peach", "#D9967E"],
    ["Dusty Apricot", "#CC9277"],
    ["Muted Rose", "#BF8780"],
  ],
  eyes: [
    ["Soft Bronze", "#8F6B48"],
    ["Olive Khaki", "#7E7A52"],
    ["Warm Taupe", "#8C7766"],
  ],
  hair: [
    ["Golden Brown", "#7A5A3C"],
    ["Soft Caramel", "#A57B52"],
    ["Honey Bronde", "#A8875F"],
  ],
} as const;

describe("Soft Autumn", () => {
  /** {@link openspec/specs/season-palettes/spec.md#scenario-soft-autumn-against-the-canvas} */
  it("equals the approved canvas palette", () => {
    const sa = PALETTES["soft-autumn"];
    expect(sa.best[0]).toEqual({ name: "Soft Coral", hex: "#D88E77" });
    expect(sa.best).toHaveLength(24);
    expect(sa.draping).toEqual({
      best: { name: "Terracotta", hex: "#B4694F" },
      worst: { name: "Fuchsia", hex: "#CC2A7E" },
    });
    for (const section of SECTIONS) {
      expect(sa[section], section).toEqual(
        CANVAS_SOFT_AUTUMN[section].map(([name, hex]) => ({ name, hex })),
      );
    }
  });
});
