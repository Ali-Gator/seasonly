import { PALETTES, type Swatch } from "@seasonly/analysis";

/**
 * Soft Autumn colors picked by name for a page's sample palette, so a renamed color fails the
 * build instead of drifting from the shared palette.
 *
 * {@link openspec/specs/site-content/spec.md#requirement-the-landing-shows-a-sample-result-and-how-the-photo-is-handled}
 */
export function softAutumnColors(names: readonly string[]): Swatch[] {
  const { best, neutrals } = PALETTES["soft-autumn"];
  return names.map((name) => {
    const color = [...best, ...neutrals].find((c) => c.name === name);
    if (!color) throw new Error(`No Soft Autumn color named ${name}`);
    return color;
  });
}
