import { PALETTES, SEASON_COPY, type Swatch } from "@seasonly/analysis";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Button, Icon, ReportSection, SwatchGrid } from "@/components/ds";
import { SeasonLink } from "@/lib/site-content/season-link";
import { FAMOUS_NOTE, famousIntro, SEASON_CONTENT } from "@/lib/site-content/seasons";
import { familyName, pageMetadata, SEASON_SLUGS, SEASONS, seasonName } from "@/lib/site/routes";

type Props = { params: Promise<{ season: string }> };

// Only the 12 fixed slugs exist; any other slug answers 404 before this page runs.
export const dynamicParams = false;

export function generateStaticParams() {
  return SEASON_SLUGS.map((season) => ({ season }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata(`/seasons/${(await params).season}`);
}

/** A grid of `columns` on a phone and `wide` from 1024 px. */
function Colors({
  colors,
  label,
  columns,
  wide,
}: {
  colors: readonly Swatch[];
  label: string;
  columns: number;
  wide: 2 | 4 | 6;
}) {
  const lg = { 2: "lg:grid-cols-2!", 4: "lg:grid-cols-4!", 6: "lg:grid-cols-6!" }[wide];
  return <SwatchGrid colors={colors} columns={columns} label={label} className={lg} />;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-(--space-3)">
      <h3 className="h3">{title}</h3>
      {children}
    </div>
  );
}

function FindOut({ name, className }: { name: string; className?: string }) {
  return (
    <Button href="/analyze" block className={className}>
      <Icon name="camera" size={18} />
      Find out if you&apos;re a {name}
    </Button>
  );
}

/**
 * A season page, from canvas boards "Season" (375) and "Season-1280": the colors and the season
 * copy are the report's own; the description, neighbours and famous people are site content.
 *
 * {@link openspec/specs/site-content/spec.md#requirement-a-season-page-shows-that-seasons-shared-palette-and-copy}
 * {@link openspec/specs/site-content/spec.md#requirement-famous-people-on-a-season-page-are-sourced-and-credited}
 */
export default async function Season({ params }: Props) {
  const { season: slug } = await params;
  const season = SEASONS.find((s) => s.slug === slug)?.slug ?? notFound();
  const name = seasonName(season);
  const copy = SEASON_COPY[season];
  const palette = PALETTES[season];
  const { about, neighbours, famous } = SEASON_CONTENT[season];
  const plural = `${name}s`;

  return (
    <>
      <div className="flex flex-col gap-(--space-12) lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-(--space-6)">
        <section className="flex flex-col gap-(--space-4) lg:col-span-4 lg:gap-(--space-5)">
          <nav aria-label="Breadcrumb">
            <Link href="/seasons" className="caption sn-navlink text-(--ink-muted)">
              The 12 seasons
            </Link>
          </nav>
          <p className="overline">{familyName(season)} family</p>
          <h1 className="display">{name}</h1>
          <p className="quote text-(--ink-muted)">{copy.tagline}</p>
          <p>{copy.summary}</p>
          {about.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <dl className="sn-card m-0 grid grid-cols-[auto_1fr] gap-x-(--space-4) gap-y-(--space-3)">
            {(
              [
                ["Undertone", copy.undertone],
                ["Chroma", copy.chroma],
                ["Contrast", copy.contrast],
              ] as const
            ).map(([term, value]) => (
              <div key={term} className="contents">
                <dt className="label">{term}</dt>
                <dd className="m-0 text-(--ink-muted)">{value}</dd>
              </div>
            ))}
          </dl>
          <FindOut name={name} />
        </section>

        <div className="flex flex-col gap-(--space-12) lg:col-span-7 lg:col-start-6">
          <ReportSection
            overline="Palette"
            title={`The ${name} palette`}
            intro="Wear these near the face: tops, scarves, frames. Any two of them go together."
          >
            <Colors colors={palette.best} columns={4} wide={6} label={`The ${name} palette`} />
          </ReportSection>
          <ReportSection
            overline="Avoid"
            title="Colors to avoid"
            intro={`These compete with ${name} coloring. Keep them away from the face: trousers, shoes, bags.`}
          >
            <Colors colors={palette.avoid} columns={3} wide={6} label="Colors to avoid" />
          </ReportSection>
          <ReportSection overline="Neutrals" title="Best neutrals" intro={copy.neutralsIntro}>
            <Colors colors={palette.neutrals} columns={3} wide={6} label="Best neutrals" />
          </ReportSection>
          <ReportSection overline="Metals" title="Best metals" intro={copy.metalsIntro}>
            <div className="flex flex-col gap-(--space-6) lg:grid lg:grid-cols-[2fr_1fr]">
              <Group title="Wear">
                <Colors colors={palette.metals} columns={4} wide={4} label="Best metals" />
              </Group>
              <Group title="Go easy on">
                <Colors
                  colors={palette.metalsAvoid}
                  columns={4}
                  wide={2}
                  label="Metals to go easy on"
                />
              </Group>
            </div>
          </ReportSection>
          <ReportSection
            overline={`Famous ${plural}`}
            title={`Famous ${plural}`}
            intro={famousIntro(plural)}
          >
            <ul className="grid grid-cols-3 gap-(--space-3)">
              {famous.map((f) => (
                <li key={f.name} className="flex flex-col gap-(--space-1)">
                  <div className="sn-slot aspect-3/4">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-sized WebP */}
                    <img src={f.image} alt={f.alt} loading="lazy" />
                  </div>
                  <span className="label">{f.name}</span>
                  <span className="caption text-(--ink-muted)">
                    Photo: <a href={f.credit.commonsUrl}>{f.credit.author}</a>,{" "}
                    <a href={f.credit.licenseUrl}>{f.credit.license}</a>, cropped
                  </span>
                </li>
              ))}
            </ul>
            <p className="caption text-(--ink-muted)">
              {FAMOUS_NOTE.before}
              <a href={famous[0]?.source.url}>{FAMOUS_NOTE.studio}</a>
              {FAMOUS_NOTE.after}
            </p>
          </ReportSection>
        </div>
      </div>

      <section
        aria-labelledby="nb-title"
        className="flex flex-col gap-(--space-5) border-t border-(--line) pt-(--space-6)"
      >
        <div className="flex flex-col gap-(--space-2)">
          <h2 className="h2" id="nb-title">
            Neighbouring seasons
          </h2>
          <p className="text-(--ink-muted)">Close to {name}, and easy to mix up with it.</p>
        </div>
        <ul className="flex flex-col gap-(--space-8) lg:grid lg:grid-cols-3 lg:gap-(--space-6)">
          {neighbours.map((n) => (
            <li key={n.slug}>
              <SeasonLink slug={n.slug} line={n.why} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-(--space-4) border-t border-(--line) pt-(--space-6) lg:flex-row lg:items-center lg:justify-between lg:gap-(--space-6) lg:py-(--space-8)">
        <div className="flex flex-col gap-(--space-4) lg:gap-(--space-2)">
          <h2 className="h2">Is this you?</h2>
          <p className="text-(--ink-muted)">
            One daylight selfie and four quick questions tell you your season.
          </p>
        </div>
        <FindOut name={name} className="lg:w-auto" />
      </section>
    </>
  );
}
