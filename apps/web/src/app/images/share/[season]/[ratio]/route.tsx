import type { SeasonSlug } from "@seasonly/analysis";
import { ImageResponse } from "next/og";

import { OG_FONTS } from "@/lib/og";
import { withErrorCapture } from "@/lib/observability/with-error-capture";
import { type Ratio, RATIOS, shareCard, SIZES } from "@/lib/share-card";
import { SEASON_SLUGS } from "@/lib/site/routes";

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
    const { season, ratio } = (await params) as { season: SeasonSlug; ratio: Ratio };
    return new ImageResponse(shareCard(season, ratio), { ...SIZES[ratio], fonts: [...OG_FONTS] });
  },
);
