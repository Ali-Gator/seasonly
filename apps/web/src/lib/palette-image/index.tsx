import { PALETTES, type SeasonSlug, type Swatch } from "@seasonly/analysis";
import type { ReactNode } from "react";

import { CHIP_EDGE, EM, foot, ground, kicker, OG_COLORS, seasonTitle } from "@/lib/og";
import { seasonName } from "@/lib/site/routes";

/**
 * The palette image, translated from board "11b Palette image" (the design system's PaletteCard,
 * `.sn-palette*`) at 1080 × 1920: 24 colors, then 6 neutrals, two per row. Plain elements only,
 * so the tests read the tree without rendering.
 *
 * @see openspec/specs/palette-image/spec.md
 */
export const SIZE = { width: 1080, height: 1920 };

const cell = (c: Swatch) => (
  <div
    key={c.hex + c.name}
    style={{ display: "flex", flex: "1 1 0", minWidth: 0, alignItems: "center", gap: 0.3 * EM }}
  >
    <div
      style={{
        width: 2 * EM,
        height: 1.1 * EM,
        flex: "none",
        borderRadius: 0.2 * EM,
        background: c.hex,
        boxShadow: CHIP_EDGE,
      }}
    />
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <span style={{ fontSize: 0.5 * EM, lineHeight: 1.15, fontWeight: 600, whiteSpace: "nowrap" }}>
        {c.name}
      </span>
      <span
        style={{
          fontSize: 0.45 * EM,
          lineHeight: 1.2,
          color: OG_COLORS.inkMuted,
          letterSpacing: 0.02 * 0.45 * EM,
        }}
      >
        {c.hex.toUpperCase()}
      </span>
    </div>
  </div>
);

/** `.sn-palette__rows`: two colors per row, spread over the group's height. */
const rows = (list: readonly Swatch[]) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      justifyContent: "space-between",
      gap: 0.1 * EM,
    }}
  >
    {Array.from({ length: Math.ceil(list.length / 2) }, (_, r) => (
      <div key={r} style={{ display: "flex", gap: 0.5 * EM }}>
        {list.slice(r * 2, r * 2 + 2).map(cell)}
      </div>
    ))}
  </div>
);

const group = (grow: number, children: ReactNode) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 0.25 * EM,
      minHeight: 0,
      flexGrow: grow,
      flexShrink: 1,
      flexBasis: "auto",
    }}
  >
    {children}
  </div>
);

export function paletteImage(slug: SeasonSlug) {
  const { best, neutrals } = PALETTES[slug];
  return (
    <div style={ground(`${1.25 * EM}px`)}>
      {kicker("My colors")}
      {seasonTitle(seasonName(slug), 1.875)}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          gap: 0.75 * EM,
          marginTop: 0.875 * EM,
        }}
      >
        {group(12, rows(best))}
        {group(3, [kicker("Neutrals"), rows(neutrals)])}
      </div>
      {foot()}
    </div>
  );
}
