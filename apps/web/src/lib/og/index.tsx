import { readFileSync } from "node:fs";

import tokens from "@/styles/tokens.json";

/**
 * What the share card and the palette image share: the brand fonts as static instances
 * (`next/og` reads neither variable fonts nor WOFF2) and the token colors, so neither renderer
 * hard-codes a color.
 *
 * @see openspec/specs/share-card/spec.md
 * @see openspec/specs/palette-image/spec.md
 */
// Literal URLs: the bundler copies a font only when it can read its path statically.

export const OG_FONTS = [
  {
    name: "Bodoni Moda",
    data: readFileSync(new URL("./fonts/BodoniModa-Medium.ttf", import.meta.url)),
    weight: 500,
    style: "normal",
  },
  {
    name: "Instrument Sans",
    data: readFileSync(new URL("./fonts/InstrumentSans-Regular.ttf", import.meta.url)),
    weight: 400,
    style: "normal",
  },
  {
    name: "Instrument Sans",
    data: readFileSync(new URL("./fonts/InstrumentSans-SemiBold.ttf", import.meta.url)),
    weight: 600,
    style: "normal",
  },
] as const;

const token = (name: string) => {
  const value = tokens.color.tokens.find((t) => t.name === name)?.value;
  if (!value) throw new Error(`no color token ${name}`);
  return value;
};

export const OG_COLORS = {
  surface: token("surface"),
  ink: token("ink"),
  inkMuted: token("ink-muted"),
  line: token("line"),
  swatchEdge: token("swatch-edge"),
};

/**
 * The design system sizes ShareCard in em off `width / 270 × 16px`, so at 1080 px 1 em is 64 px
 * and a 1 px rule of the 270 px card is 4 px.
 */
export const EM = 64;
const PX = 1080 / 270;

/** `.sn-share__kicker`. Uppercase is a style, so the text keeps its own casing. */
export const kicker = (text: string) => (
  <div
    style={{
      fontSize: 0.6875 * EM,
      lineHeight: 1.4,
      fontWeight: 600,
      letterSpacing: 0.12 * 0.6875 * EM,
      textTransform: "uppercase",
      color: OG_COLORS.inkMuted,
    }}
  >
    {text}
  </div>
);

/** `.sn-share__season`, at the story size or the square card's. */
export const seasonTitle = (name: string, size: 2.5 | 1.875) => (
  <div
    style={{
      fontFamily: "Bodoni Moda",
      fontWeight: 500,
      fontSize: size * EM,
      lineHeight: 1,
      letterSpacing: -0.01 * size * EM,
      marginTop: 0.15 * size * EM,
      color: OG_COLORS.ink,
    }}
  >
    {name}
  </div>
);

/** `.sn-share__chip` edge. */
export const CHIP_EDGE = `inset 0 0 0 ${PX}px ${OG_COLORS.swatchEdge}`;

/** `.sn-share__foot`: the wordmark and the address over a rule. */
export function foot() {
  const size = 1.3 * EM;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginTop: 0.6 * size,
        paddingTop: 0.6 * size,
        borderTop: `${PX}px solid ${OG_COLORS.line}`,
        fontSize: size,
        lineHeight: 1.25,
        color: OG_COLORS.inkMuted,
      }}
    >
      <span
        style={{
          fontFamily: "Bodoni Moda",
          fontWeight: 500,
          fontSize: 0.95 * size,
          lineHeight: 1,
          letterSpacing: -0.02 * 0.95 * size,
          color: OG_COLORS.ink,
        }}
      >
        Seasonly
      </span>
      <span>seasonly.me</span>
    </div>
  );
}

/** The card's ground: `.sn-share` full-bleed, without the in-page corners and shadow. */
export const ground = (padding: string) =>
  ({
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: OG_COLORS.surface,
    color: OG_COLORS.ink,
    fontFamily: "Instrument Sans",
    padding,
    overflow: "hidden",
  }) as const;
