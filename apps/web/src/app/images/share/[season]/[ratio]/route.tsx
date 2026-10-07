import { ImageResponse } from "next/og";

import { OG_FONTS } from "@/lib/og";
import { withErrorCapture } from "@/lib/observability/with-error-capture";
import { type Ratio, RATIOS, shareCard, SIZES } from "@/lib/share-card";
import { SEASON_SLUGS, type SeasonSlug } from "@/lib/site/routes";

const isSeason = (slug: string): slug is SeasonSlug =>
  (SEASON_SLUGS as readonly string[]).includes(slug);

/**
 * One PNG per season and ratio, rendered at build time; any other param answers 404.
 *
 * {@link openspec/specs/share-card/spec.md#requirement-each-season-has-a-story-card-and-a-post-card}
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SEASON_SLUGS.flatMap((season) => RATIOS.map((ratio) => ({ season, ratio })));
}

export const GET = withErrorCapture(
  async (_request: Request, { params }: { params: Promise<{ season: string; ratio: string }> }) => {
    const { season, ratio } = await params;
    // Prerendering already answers 404 for other params; dev and draft mode reach this handler.
    if (!isSeason(season) || !RATIOS.includes(ratio as Ratio))
      return new Response("Not found", { status: 404 });
    return new ImageResponse(shareCard(season, ratio as Ratio), {
      ...SIZES[ratio as Ratio],
      fonts: [...OG_FONTS],
    });
  },
);
