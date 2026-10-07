import type { SeasonSlug } from "@seasonly/analysis";
import { ImageResponse } from "next/og";

import { withErrorCapture } from "@/lib/observability/with-error-capture";
import { OG_FONTS } from "@/lib/og";
import { paletteImage, SIZE } from "@/lib/palette-image";
import { SEASON_SLUGS } from "@/lib/site/routes";

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
    const { season } = (await params) as { season: SeasonSlug };
    return new ImageResponse(paletteImage(season), { ...SIZE, fonts: [...OG_FONTS] });
  },
);
