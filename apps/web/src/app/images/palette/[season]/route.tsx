import { ImageResponse } from "next/og";

import { withErrorCapture } from "@/lib/observability/with-error-capture";
import { OG_FONTS } from "@/lib/og";
import { paletteImage, SIZE } from "@/lib/palette-image";
import { SEASON_SLUGS, type SeasonSlug } from "@/lib/site/routes";

const isSeason = (slug: string): slug is SeasonSlug =>
  (SEASON_SLUGS as readonly string[]).includes(slug);

/**
 * One PNG per season, rendered at build time; any other slug answers 404.
 *
 * {@link openspec/specs/palette-image/spec.md#requirement-each-season-has-a-palette-image}
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SEASON_SLUGS.map((season) => ({ season }));
}

export const GET = withErrorCapture(
  async (_request: Request, { params }: { params: Promise<{ season: string }> }) => {
    const { season } = await params;
    // Prerendering already answers 404 for other slugs; dev and draft mode reach this handler.
    if (!isSeason(season)) return new Response("Not found", { status: 404 });
    return new ImageResponse(paletteImage(season), { ...SIZE, fonts: [...OG_FONTS] });
  },
);
