/**
 * The 12 seasons, in family order. The site's route map and the eval manifest import this list.
 *
 * @see openspec/specs/season-palettes/spec.md
 */
export const SEASON_SLUGS = [
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
] as const;

export type SeasonSlug = (typeof SEASON_SLUGS)[number];

export type Family = "spring" | "summer" | "autumn" | "winter";

/** "soft-autumn" → "autumn": every slug is `<modifier>-<family>`. */
export const seasonFamily = (slug: SeasonSlug): Family =>
  slug.slice(slug.indexOf("-") + 1) as Family;
