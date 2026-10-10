import {
  type Agreement,
  AGREEMENT_COPY,
  PALETTES,
  SEASON_COPY,
  type SeasonSlug,
  type Swatch,
} from "@seasonly/analysis";
import type { ReactNode } from "react";

import { Note, ReportSection, SwatchGrid } from "@/components/ds";
import { seasonName } from "@/lib/site/routes";

/**
 * The report's season block and its sections 1 to 6, shared by a stored report and the sample
 * report. It renders the two children of the report's 12-column grid as a fragment, and nothing
 * that sends a request or an event: the draping pair comes in as a node.
 *
 * @see openspec/specs/report-page/spec.md
 */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-(--space-3)">
      <h3 className="h3">{title}</h3>
      {children}
    </div>
  );
}

/** A grid of 3 or 4 on a phone and `wide` columns from 1024 px. */
export function Colors({
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

/** The season's undertone, chroma and contrast, as a report and a season page show them. */
export function SeasonTraits({ season }: { season: SeasonSlug }) {
  const copy = SEASON_COPY[season];
  return (
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
  );
}

export interface ReportSectionsProps {
  season: SeasonSlug;
  agreement: Agreement;
  /** Above the season name: "Your season" on a report. */
  overline: string;
  /** Replaces the season's summary when set. */
  summary?: string | null;
  /** Replaces the agreement's body when set. */
  agreementNote?: string | null;
  /** Section 6's draping pair; not shown for a quiz-only report. */
  draping: ReactNode;
  /** Shown under the season name inside the h1, as the sample report names itself. */
  subtitle?: string;
}

export function ReportSections({
  season,
  agreement,
  overline: seasonOverline,
  summary,
  agreementNote,
  draping,
  subtitle,
}: ReportSectionsProps) {
  const name = seasonName(season);
  const copy = SEASON_COPY[season];
  const palette = PALETTES[season];
  const quizOnly = agreement === "quiz-only";
  const total = quizOnly ? 5 : 6;
  const overline = (n: number) => `Section ${n} of ${total}`;
  const note = AGREEMENT_COPY[agreement];

  return (
    <>
      <section className="flex flex-col gap-(--space-4) lg:col-span-4 lg:col-start-1 lg:row-start-1 lg:gap-(--space-5)">
        <p className="overline">{seasonOverline}</p>
        <h1 className="display">
          {name}
          {subtitle && (
            <>
              <span className="sn-visually-hidden">: </span>
              <span className="h3 mt-(--space-2) block">{subtitle}</span>
            </>
          )}
        </h1>
        <p className="quote text-(--ink-muted)">{copy.tagline}</p>
        <p>{summary || copy.summary}</p>
        <SeasonTraits season={season} />
        <Note icon={agreement === "agree" ? "check" : "info"} title={note.title}>
          {agreementNote || note.body}
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
        <ReportSection overline={overline(3)} title="Your best neutrals" intro={copy.neutralsIntro}>
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
            {draping}
          </ReportSection>
        )}
      </div>
    </>
  );
}
