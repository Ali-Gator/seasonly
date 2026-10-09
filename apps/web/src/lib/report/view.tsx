import { AGREEMENT_COPY, PALETTES, SEASON_COPY, type Swatch } from "@seasonly/analysis";
import type { ReactNode } from "react";

import { Note, ReportSection, SwatchGrid } from "@/components/ds";
import { Wordmark } from "@/components/site-chrome";
import { PremiumCard } from "@/lib/interest/premium-card";
import { shareCardAlt } from "@/lib/share-card/alt";
import { seasonName } from "@/lib/site/routes";

import { SaveButton, ShareButton } from "./actions";
import { ReportDraping } from "./draping";
import type { StoredReport } from "./read";

/**
 * The full report of canvas artboards "10 Full report · 375" and "· 1280": one DOM in phone
 * reading order, which a 12-column grid rearranges from 1024 px (design.md decision 7).
 *
 * @see openspec/specs/report-page/spec.md
 */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-(--space-3)">
      <h3 className="h3">{title}</h3>
      {children}
    </div>
  );
}

/** A grid of 3 or 4 on a phone and `wide` columns from 1024 px. */
function Colors({
  colors,
  label,
  columns,
  wide = columns,
}: {
  colors: readonly Swatch[];
  label: string;
  columns: number;
  wide?: number;
}) {
  return (
    <SwatchGrid
      colors={colors}
      columns={columns}
      label={label}
      className={wide === 6 ? "lg:grid-cols-6!" : wide === 2 ? "lg:grid-cols-2!" : undefined}
    />
  );
}

/**
 * {@link openspec/specs/report-page/spec.md#requirement-a-stored-report-renders-the-canvas-report}
 * {@link openspec/specs/report-page/spec.md#requirement-the-report-has-a-wide-layout}
 */
export function ReportView({ id, report }: { id: string; report: StoredReport }) {
  const { season, agreement } = report;
  const name = seasonName(season);
  const copy = SEASON_COPY[season];
  const palette = PALETTES[season];
  const quizOnly = agreement === "quiz-only";
  const personal = report.textSource === "personal";
  const total = quizOnly ? 5 : 6;
  const overline = (n: number) => `Section ${n} of ${total}`;
  const alts = { story: shareCardAlt(season, "story"), post: shareCardAlt(season, "post") };
  const note = AGREEMENT_COPY[agreement];

  return (
    <div className="sn-screen flex flex-col gap-(--space-12) lg:max-w-(--size-page) lg:px-(--space-6) lg:py-(--space-8)">
      <header className="flex min-h-(--size-tap) items-center justify-between">
        <Wordmark size="text-[1.4em] lg:text-[1.75em]" />
        <ShareButton
          slug={season}
          season={name}
          alts={alts}
          label="Share"
          variant="ghost"
          block={false}
          className="lg:hidden"
          place="header"
        />
        <p className="caption hidden text-(--ink-muted) lg:block">seasonly.me/r/{id}</p>
      </header>

      <main className="flex flex-col gap-(--space-12) lg:grid lg:grid-cols-12 lg:grid-rows-[auto_auto_auto_auto_1fr] lg:items-start lg:gap-x-(--space-6) lg:gap-y-(--space-5)">
        <section className="flex flex-col gap-(--space-4) lg:col-span-4 lg:col-start-1 lg:row-start-1 lg:gap-(--space-5)">
          <p className="overline">Your season</p>
          <h1 className="display">{name}</h1>
          <p className="quote text-(--ink-muted)">{copy.tagline}</p>
          <p>{personal && report.summary ? report.summary : copy.summary}</p>
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
          <Note icon={agreement === "agree" ? "check" : "info"} title={note.title}>
            {personal && report.agreementNote ? report.agreementNote : note.body}
          </Note>
        </section>

        <div className="flex flex-col gap-(--space-12) lg:col-span-7 lg:col-start-6 lg:row-span-5 lg:row-start-1">
          <ReportSection
            overline={overline(1)}
            title="Your palette"
            intro="Wear these near your face: tops, scarves, frames. Any two of them go together."
          >
            <Colors colors={palette.best} columns={4} wide={6} label={`Your ${name} palette`} />
          </ReportSection>
          <ReportSection
            overline={overline(2)}
            title="Colors to avoid"
            intro="These compete with your coloring. Keep them away from your face: trousers, shoes, bags."
          >
            <Colors colors={palette.avoid} columns={3} wide={6} label="Colors to avoid" />
          </ReportSection>
          <ReportSection
            overline={overline(3)}
            title="Your best neutrals"
            intro={copy.neutralsIntro}
          >
            <Colors colors={palette.neutrals} columns={3} wide={6} label="Your best neutrals" />
          </ReportSection>
          <ReportSection overline={overline(4)} title="Your metals" intro={copy.metalsIntro}>
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
          <ReportSection overline={overline(5)} title="Makeup and hair" intro={copy.makeupIntro}>
            <div className="flex flex-col gap-(--space-6) lg:grid lg:grid-cols-2">
              <Group title="Lips">
                <Colors colors={palette.lips} columns={3} label="Lip colors" />
              </Group>
              <Group title="Blush">
                <Colors colors={palette.blush} columns={3} label="Blush colors" />
              </Group>
              <Group title="Eyes">
                <Colors colors={palette.eyes} columns={3} label="Eye colors" />
              </Group>
              <Group title="Hair">
                <p className="text-(--ink-muted)">{copy.hairTip}</p>
                <Colors colors={palette.hair} columns={3} label="Hair colors" />
              </Group>
            </div>
          </ReportSection>
          {!quizOnly && (
            <ReportSection
              overline={overline(6)}
              title="Draping preview"
              intro={`The same face crop on your best and your worst color. ${copy.drapingLine}`}
            >
              <ReportDraping id={id} best={palette.draping.best} worst={palette.draping.worst} />
            </ReportSection>
          )}
        </div>

        <div className="lg:col-span-4 lg:col-start-1 lg:row-start-3">
          <PremiumCard
            reportId={id}
            interested={report.interested}
            // The address is in the page only once interest exists (design.md decision 3).
            email={report.interested ? report.email : null}
          />
        </div>

        <div className="sn-stack lg:col-span-4 lg:col-start-1 lg:row-start-2">
          <ShareButton slug={season} season={name} alts={alts} />
          <SaveButton slug={season} />
        </div>

        <footer className="caption flex flex-col gap-(--space-2) border-t border-(--line) pt-(--space-6) text-(--ink-muted) lg:col-span-4 lg:col-start-1 lg:row-start-4 lg:border-t-0 lg:pt-0">
          {!quizOnly && <p>Your photo is deleted within 24 hours of your analysis.</p>}
          <p>This report stays at seasonly.me/r/{id}.</p>
          <p>
            Seasons describe colors, not people. If a color you love isn&apos;t here, wear it away
            from your face.
          </p>
        </footer>
      </main>
    </div>
  );
}
