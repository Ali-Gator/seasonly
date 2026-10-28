import { PALETTES, SEASON_COPY } from "@seasonly/analysis";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button, Icon, ReportSection, Slot } from "@/components/ds";
import { Colors, Group, LEFT, RIGHT, SeasonTraits } from "@/lib/report/sections";
import { Faq, seasonFaq } from "@/lib/site-content/faq";
import { SeasonLink } from "@/lib/site-content/season-link";
import { FAMOUS_NOTE, famousIntro, SEASON_CONTENT } from "@/lib/site-content/seasons";
import {
  familyName,
  pageMetadata,
  SEASON_SLUGS,
  SEASONS,
  searchName,
  seasonName,
  secondName,
} from "@/lib/site/routes";

type Props = { params: Promise<{ season: string }> };

// Only the 12 fixed slugs exist; any other slug answers 404 before this page runs.
export const dynamicParams = false;

export function generateStaticParams() {
  return SEASON_SLUGS.map((season) => ({ season }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata(`/seasons/${(await params).season}`);
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
 * copy are the report's own; the description, neighbours and famous people are site content. On a
 * phone the palette comes straight after the head; from 1024 px the head and the copy float left
 * and the sections right, so neither column waits for the other (t18-design-review decision 2).
 *
 * {@link openspec/specs/site-content/spec.md#requirement-a-season-page-shows-that-seasons-shared-palette-and-copy}
 * {@link openspec/specs/site-content/spec.md#requirement-famous-people-on-a-season-page-are-sourced-and-credited}
 * {@link openspec/specs/site-content/spec.md#requirement-a-season-page-names-its-second-name}
 */
export default async function Season({ params }: Props) {
  const { season: slug } = await params;
  const season = SEASONS.find((s) => s.slug === slug)?.slug ?? notFound();
  const name = seasonName(season);
  const second = secondName(season);
  const copy = SEASON_COPY[season];
  const palette = PALETTES[season];
  const { about, neighbours, famous } = SEASON_CONTENT[season];
  const plural = `${name}s`;

  return (
    <>
      <div className="flex flex-col gap-(--space-12) lg:flow-root">
        <section
          className={`flex flex-col gap-(--space-4) lg:mb-(--space-5) lg:gap-(--space-5) ${LEFT}`}
        >
          <nav aria-label="Breadcrumb">
            <Link href="/seasons" className="caption sn-navlink text-(--ink-muted)">
              The 12 seasons
            </Link>
          </nav>
          <p className="overline">{familyName(season)} family</p>
          <h1 className="display">{searchName(season)}</h1>
          <p className="quote text-(--ink-muted)">{copy.tagline}</p>
        </section>

        <div className={`lg:mb-(--space-12) ${RIGHT}`}>
          <ReportSection
            overline="Palette"
            title={`The ${name} palette`}
            intro="Wear these near the face: tops, scarves, frames. Any two of them go together."
          >
            <Colors colors={palette.best} columns={4} wide={6} label={`The ${name} palette`} />
          </ReportSection>
        </div>

        <div className={`flex flex-col gap-(--space-4) lg:gap-(--space-5) ${LEFT}`}>
          <p>
            {second && <>Also called {second}. </>}
            {copy.summary}
          </p>
          {about.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <SeasonTraits season={season} />
          <FindOut name={name} />
        </div>

        <div className={`flex flex-col gap-(--space-12) ${RIGHT}`}>
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
                <Colors colors={palette.metals} columns={4} label="Best metals" />
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
                  {/* The caption names the photo, so its alt is empty: a screen reader reads the name once.
                      A figcaption must be the figure's first or last child, so the credit sits after it. */}
                  <figure className="m-0 flex flex-col gap-(--space-1)">
                    <Slot src={f.image} className="aspect-3/4" loading="lazy" />
                    <figcaption className="label">{f.name}</figcaption>
                  </figure>
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

      <Faq id="faq-title" title={`Questions about ${name}`} items={seasonFaq(season)} />

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
