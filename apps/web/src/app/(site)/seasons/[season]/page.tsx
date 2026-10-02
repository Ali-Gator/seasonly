import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { pageMetadata, SEASON_SLUGS, SEASONS, seasonName } from "@/lib/site/routes";

type Props = { params: Promise<{ season: string }> };

// Only the 12 fixed slugs exist; any other slug answers 404 before this page runs.
export const dynamicParams = false;

export function generateStaticParams() {
  return SEASON_SLUGS.map((season) => ({ season }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata(`/seasons/${(await params).season}`);
}

// Stub until the season content ships (T9): noindex and out of the sitemap.
export default async function Season({ params }: Props) {
  const { season: slug } = await params;
  const season = SEASONS.find((s) => s.slug === slug) ?? notFound();
  const name = seasonName(season.slug);
  return (
    <section className="flex flex-col gap-(--space-4)">
      <p className="overline">{name.split(" ")[1]} family</p>
      <h1 className="display">{name}</h1>
      <p className="lead text-(--ink-muted)">{season.summary}</p>
    </section>
  );
}
