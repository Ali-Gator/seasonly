import type { SeasonSlug } from "@seasonly/analysis";

/**
 * Where a season's palette image is served, its size and the name it saves under: one place for
 * the image route, a report's "Save my palette" and a season page's save link.
 *
 * @see openspec/specs/palette-image/spec.md
 */
export const SIZE = { width: 1080, height: 1920 };

export const paletteUrl = (slug: SeasonSlug) => `/images/palette/${slug}`;

export const paletteFile = (slug: SeasonSlug) => `seasonly-${slug}-palette.png`;
