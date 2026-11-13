import { PALETTES, type SeasonSlug } from "@seasonly/analysis";

import { seasonName } from "../site/season-name";

/**
 * The cards' ratios, colors and alt text, with no renderer or font, so pages can import them.
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
export const shown = (slug: SeasonSlug, ratio: Ratio) =>
  PALETTES[slug].highlights.slice(0, ratio === "story" ? 5 : 6);

/** {@link openspec/specs/share-card/spec.md#requirement-a-cards-alt-text-names-the-season-and-its-colors} */
export const shareCardAlt = (slug: SeasonSlug, ratio: Ratio) =>
  `My color season: ${seasonName(slug)}. ${shown(slug, ratio)
    .map((c) => c.name)
    .join(", ")}.`;
