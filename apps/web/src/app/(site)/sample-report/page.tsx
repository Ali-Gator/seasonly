import { PALETTES } from "@seasonly/analysis";

import { Button, DrapingPair, Icon } from "@/components/ds";
import { ReportSections } from "@/lib/report/sections";
import { SAMPLE_FACE } from "@/lib/site-content/images";
import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/sample-report");

const { draping } = PALETTES["soft-autumn"];

/**
 * The sample Soft Autumn report, from canvas board "SampleReport": the report's own sections on
 * the sample face. Static: no share, save or Premium action, and nothing that sends an event.
 *
 * {@link openspec/specs/site-content/spec.md#requirement-the-sample-report-is-static-and-sends-nothing}
 */
export default function Page() {
  return (
    <>
      <section
        aria-labelledby="sample-title"
        className="sn-card flex flex-col gap-(--space-3) border-(--line-strong) lg:flex-row lg:items-center lg:justify-between lg:gap-(--space-6)"
      >
        <div className="flex flex-col gap-(--space-3)">
          <p className="overline">Sample report</p>
          <p className="h3" id="sample-title">
            This is a sample Soft Autumn report
          </p>
          <p className="text-(--ink-muted)">
            Yours is built from your own selfie and four questions. Free while we are in early
            access.
          </p>
        </div>
        <Button href="/analyze" block className="lg:w-auto">
          <Icon name="camera" size={18} />
          Find my colors
        </Button>
      </section>

      <div className="flex flex-col gap-(--space-12) lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-(--space-6) lg:gap-y-(--space-5)">
        <ReportSections
          season="soft-autumn"
          agreement="agree"
          overline="Sample season"
          agreementNote="Green veins and gold jewelry point warm. Your soft brown hair and hazel eyes point muted."
          draping={
            <DrapingPair
              best={draping.best}
              worst={draping.worst}
              faceSrc={SAMPLE_FACE.src}
              faceAlt={SAMPLE_FACE.alt}
              className="lg:max-w-[560px]"
            />
          }
        />
      </div>

      <section className="flex flex-col gap-(--space-4) border-t border-(--line) pt-(--space-6) lg:flex-row lg:items-center lg:justify-between lg:gap-(--space-6) lg:py-(--space-8)">
        <div className="flex flex-col gap-(--space-4) lg:gap-(--space-2)">
          <h2 className="h2">Find your own season</h2>
          <p className="text-(--ink-muted)">
            One daylight selfie and four quick questions. Free while we are in early access.
          </p>
        </div>
        <Button href="/analyze" block className="lg:w-auto">
          <Icon name="camera" size={18} />
          Find my colors
        </Button>
      </section>
      <p className="caption text-(--ink-muted)">
        Seasons describe colors, not people. If a color you love isn&apos;t here, wear it away from
        your face.
      </p>
    </>
  );
}
