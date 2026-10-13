import { PALETTES, type SeasonSlug } from "@seasonly/analysis";
import Link from "next/link";

import { Icon, SwatchGrid, SwatchStrip } from "@/components/ds";
import { seasonName } from "@/lib/site/routes";

/**
 * A season's name linking to its page, an optional line, and its first highlight colors: the
 * strips of the landing, the seasons index and a season page's neighbours. Four colors by
 * default; `wide` shows all six from 1024 px, as the seasons index board does. `compact` is the
 * landing's: the colors are a chip strip, their names one tap away. The name is an `h3` (BL-25).
 *
 * {@link openspec/specs/site-content/spec.md#requirement-the-landing-shows-a-sample-result-and-how-the-photo-is-handled}
 * {@link openspec/specs/site-content/spec.md#requirement-a-season-page-shows-that-seasons-shared-palette-and-copy}
 */
export function SeasonLink({
  slug,
  line,
  wide = false,
  compact = false,
}: {
  slug: SeasonSlug;
  line?: string;
  wide?: boolean;
  compact?: boolean;
}) {
  const name = seasonName(slug);
  const { highlights } = PALETTES[slug];
  // The name is a heading on every page, so heading navigation reaches each season (BL-25).
  const heading = (
    <h3 className="h3">
      <Link
        href={`/seasons/${slug}`}
        className="sn-navlink flex justify-between text-(--ink) no-underline"
      >
        {name}
        <Icon name="arrow-right" size={18} />
      </Link>
    </h3>
  );
  if (compact)
    return (
      <div className="flex flex-col gap-(--space-2)">
        {heading}
        <SwatchStrip colors={highlights.slice(0, 4)} label={`${name} colors`} />
      </div>
    );
  return (
    <div className="flex flex-col gap-(--space-2)">
      {heading}
      {line && <p className="text-(--ink-muted)">{line}</p>}
      <SwatchGrid
        colors={wide ? highlights : highlights.slice(0, 4)}
        columns={4}
        label={`${name} colors`}
        className={wide ? "max-lg:[&>li:nth-child(n+5)]:hidden lg:grid-cols-3!" : undefined}
      />
    </div>
  );
}
