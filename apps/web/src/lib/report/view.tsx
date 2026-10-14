import { PALETTES } from "@seasonly/analysis";

import { Wordmark } from "@/components/site-chrome";
import { PremiumCard } from "@/lib/interest/premium-card";
import { shareCardAlt } from "@/lib/share-card/alt";
import { seasonName } from "@/lib/site/routes";

import { SaveButton, ShareButton } from "./actions";
import { ReportDraping } from "./draping";
import type { StoredReport } from "./read";
import { LEFT_LAST, ReportSections } from "./sections";

/**
 * The full report of canvas artboards "10 Full report · 375" and "· 1280": one DOM in phone
 * reading order, palette first; from 1024 px the copy floats left of the sections and the last
 * left block (Premium, actions, footer) stays in flow with `clear: left`, so it follows the
 * agreement note (t5-analysis-flow decision 7, t18-design-review decision 2, BL-55).
 *
 * {@link openspec/specs/report-page/spec.md#requirement-a-stored-report-renders-the-canvas-report}
 * {@link openspec/specs/report-page/spec.md#requirement-the-report-has-a-wide-layout}
 */
export function ReportView({ id, report }: { id: string; report: StoredReport }) {
  const { season, agreement } = report;
  const name = seasonName(season);
  const palette = PALETTES[season];
  const quizOnly = agreement === "quiz-only";
  const personal = report.textSource === "personal";
  const alts = { story: shareCardAlt(season, "story"), post: shareCardAlt(season, "post") };

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

      <main className="flex flex-col gap-(--space-12) lg:flow-root">
        <ReportSections
          season={season}
          agreement={agreement}
          overline="Your season"
          summary={personal ? report.summary : undefined}
          agreementNote={personal ? report.agreementNote : undefined}
          draping={
            <ReportDraping id={id} best={palette.draping.best} worst={palette.draping.worst} />
          }
        />

        {/* One left block from 1024 px, in flow with clear: left so it follows the agreement note;
            the actions move above the Premium card. */}
        <div className={`flex flex-col gap-(--space-12) lg:gap-(--space-5) ${LEFT_LAST}`}>
          <div>
            <PremiumCard
              reportId={id}
              interested={report.interested}
              // The address is in the page only once interest exists (design.md decision 3).
              email={report.interested ? report.email : null}
            />
          </div>

          <div className="sn-stack lg:order-first">
            <ShareButton slug={season} season={name} alts={alts} />
            <SaveButton slug={season} />
          </div>

          <footer className="caption flex flex-col gap-(--space-2) border-t border-(--line) pt-(--space-6) text-(--ink-muted) lg:border-t-0 lg:pt-0">
            {!quizOnly && (
              <p>
                We delete our copy of your face crop within 24 hours of your analysis. Google may
                keep one up to 90 days for abuse checks.
              </p>
            )}
            <p>This report stays at seasonly.me/r/{id}.</p>
            <p>
              Seasons describe colors, not people. If a color you love isn&apos;t here, wear it away
              from your face.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
