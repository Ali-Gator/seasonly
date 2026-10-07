import { PALETTES, type SeasonSlug, type Swatch } from "@seasonly/analysis";

import { CHIP_EDGE, EM, foot, ground, kicker, OG_COLORS, seasonTitle } from "@/lib/og";
import { seasonName } from "@/lib/site/routes";

/**
 * The share cards, translated from the design system's `.sn-share*` at 1080 px wide. Plain
 * elements only, so the tests read the tree without rendering.
 *
 * @see openspec/specs/share-card/spec.md
 */
export const RATIOS = ["story", "post"] as const;
export type Ratio = (typeof RATIOS)[number];

export const SIZES: Record<Ratio, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1080 },
};

/** {@link openspec/specs/share-card/spec.md#requirement-a-card-shows-the-season-its-highlights-and-the-address-and-nothing-personal} */
const shown = (slug: SeasonSlug, ratio: Ratio) =>
  PALETTES[slug].highlights.slice(0, ratio === "story" ? 5 : 6);

/** {@link openspec/specs/share-card/spec.md#requirement-a-cards-alt-text-names-the-season-and-its-colors} */
export const shareCardAlt = (slug: SeasonSlug, ratio: Ratio) =>
  `My color season: ${seasonName(slug)}. ${shown(slug, ratio)
    .map((c) => c.name)
    .join(", ")}.`;

const name = (c: Swatch, size: number, lineHeight: number, whiteSpace = "normal") => (
  <span style={{ fontSize: size * EM, lineHeight, fontWeight: 600, whiteSpace }}>{c.name}</span>
);
const hex = (c: Swatch, size: number, lineHeight: number) => (
  <span
    style={{
      fontSize: size * EM,
      lineHeight,
      color: OG_COLORS.inkMuted,
      letterSpacing: 0.02 * size * EM,
    }}
  >
    {c.hex.toUpperCase()}
  </span>
);

/**
 * `.sn-share__list`: one row per color, chip then name over hex. A season name that wraps to two
 * lines ("Light Summer") leaves too little height for five 3 em rows, so each row takes an equal
 * share of the list, at most 3 em, and its 3 em wide chip takes the row's height.
 */
const list = (colors: readonly Swatch[]) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 0.5 * EM,
      marginTop: 1.25 * EM,
      flex: 1,
      minHeight: 0,
    }}
  >
    {colors.map((c) => (
      <div
        key={c.hex}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0.75 * EM,
          flex: "1 1 0",
          minHeight: 0,
          maxHeight: 3 * EM,
        }}
      >
        <div
          style={{
            width: 3 * EM,
            alignSelf: "stretch",
            flex: "none",
            borderRadius: 0.25 * EM,
            background: c.hex,
            boxShadow: CHIP_EDGE,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {name(c, 0.875, 1.3)}
          {hex(c, 0.6875, 1.4)}
        </div>
      </div>
    ))}
  </div>
);

/**
 * `.sn-share__grid` as two flex rows of three, each chip `flex: 1`. Names and hex codes are set
 * smaller than the design system's 0.75 em and 0.625 em, so the widest highlight name ("Bright
 * Turquoise") fits its column on one line (redesigned 2026-10-07).
 */
const grid = (colors: readonly Swatch[]) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 0.5 * EM,
      marginTop: 0.875 * EM,
      flex: 1,
      minHeight: 0,
    }}
  >
    {[colors.slice(0, 3), colors.slice(3, 6)].map((row) => (
      <div key={row[0]?.hex} style={{ display: "flex", gap: 0.5 * EM, flex: 1, minHeight: 0 }}>
        {row.map((c) => (
          <div
            key={c.hex}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0.2 * EM,
              flex: 1,
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 1.25 * EM,
                borderRadius: 0.25 * EM,
                background: c.hex,
                boxShadow: CHIP_EDGE,
              }}
            />
            {name(c, 0.55, 1.2, "nowrap")}
            {hex(c, 0.5, 1.3)}
          </div>
        ))}
      </div>
    ))}
  </div>
);

export function shareCard(slug: SeasonSlug, ratio: Ratio) {
  const story = ratio === "story";
  return (
    <div style={ground(story ? `${1.5 * EM}px ${1.25 * EM}px` : `${1.25 * EM}px`)}>
      {kicker("My color season")}
      {seasonTitle(seasonName(slug), story ? 2.5 : 1.875)}
      {story ? list(shown(slug, ratio)) : grid(shown(slug, ratio))}
      {foot()}
    </div>
  );
}
