import type { SeasonSlug } from "@seasonly/analysis";

/**
 * "soft-autumn" → "Soft Autumn". Its own module, with no app imports, so the route map and the
 * share card's alt text can both use it without importing each other.
 *
 * @see openspec/specs/site-structure/spec.md
 */
export function seasonName(slug: SeasonSlug): string {
  return slug.replace(
    /(^|-)(\w)/g,
    (_, sep: string, c: string) => `${sep ? " " : ""}${c.toUpperCase()}`,
  );
}
