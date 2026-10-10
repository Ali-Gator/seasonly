import { PALETTES, RETAKE_TIPS } from "@seasonly/analysis";
import Link from "next/link";

import { Button, DrapingPair, Icon, Note, SwatchGrid } from "@/components/ds";
import { SAMPLE_FACE } from "@/lib/site-content/images";
import { softAutumnColors } from "@/lib/site-content/sample";
import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/color-analysis-gpt-alternative");

const SOURCE =
  "https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq";

const palette = PALETTES["soft-autumn"];

/** The board's 8 sample colors, read by name from the Soft Autumn palette. */
const SAMPLE = softAutumnColors([
  "Terracotta",
  "Camel",
  "Sage",
  "Deep Teal",
  "Dusty Rose",
  "Olive",
  "Soft Coral",
  "Mushroom",
]);

const SECTION = "flex flex-col gap-(--space-4) border-t border-(--line) pt-(--space-6)";

/**
 * The color analysis GPT alternative, from canvas board "GptAlternative". Every retirement fact
 * is OpenAI's, from its FAQ, checked October 10, 2026 (t9-site-content task 3.9).
 *
 * {@link openspec/specs/site-content/spec.md#requirement-the-gpt-alternative-page-states-only-sourced-facts}
 */
export default function Page() {
  return (
    <div className="flex max-w-[720px] flex-col gap-(--space-12)">
      <section className="flex flex-col gap-(--space-4)">
        <p className="overline">Color analysis GPT alternative</p>
        <h1 className="h1">The color analysis GPT is retiring. Your colors don&apos;t have to.</h1>
        <p className="lead text-(--ink-muted)">
          OpenAI retires custom GPTs on December 11, 2026, color analysis GPTs among them. Seasonly
          finds your season from one selfie and four questions, with a photo check, a draping
          preview and a palette with hex codes.
        </p>
        <Button href="/analyze" block className="lg:w-auto lg:self-start">
          <Icon name="camera" size={18} />
          Find my colors
        </Button>
        <p className="caption text-center text-(--ink-muted) lg:text-left">
          Free while we are in early access. No account needed.
        </p>
      </section>

      <section aria-labelledby="changes-title" className={SECTION}>
        <h2 className="h2" id="changes-title">
          What changes on December 11
        </h2>
        <p className="text-(--ink-muted)">
          OpenAI says custom GPTs and their pages become inaccessible on that date, so color
          analysis GPTs stop working along with every other custom GPT.
        </p>
        <p className="text-(--ink-muted)">
          Your past chats stay: OpenAI says existing conversations with custom GPTs remain
          accessible after retirement. The GPT itself does not carry over. Its creator can move it
          to a ChatGPT plugin, but using the GPT does not give you access to that plugin, and the
          GPT&apos;s chosen model and custom actions do not transfer.
        </p>
        <p className="caption text-(--ink-muted)">
          Source: <a href={SOURCE}>OpenAI, Custom GPT retirement and migration FAQ</a>, checked
          October 10, 2026.
        </p>
        <Note icon="info" title="Keep your result">
          If you have a season from the GPT, note it and the colors you liked before then.
        </Note>
      </section>

      <section aria-labelledby="same-title" className={SECTION}>
        <h2 className="h2" id="same-title">
          What works the same way
        </h2>
        <ul className="flex flex-col gap-(--space-3)">
          {[
            "You share one selfie.",
            "You get one of the 12 seasons.",
            "You get colors to wear and colors to avoid.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-(--space-3)">
              <Icon name="check" size={18} />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="adds-title"
        className="flex flex-col gap-(--space-8) border-t border-(--line) pt-(--space-6)"
      >
        <h2 className="h2" id="adds-title">
          What Seasonly adds
        </h2>

        <div className="flex flex-col gap-(--space-3)">
          <h3 className="h3">A photo check</h3>
          <p className="text-(--ink-muted)">
            Before your photo is read, your phone checks it for low light, tinted light, filters, a
            missing face and more than one face. A bad photo gets one retake tip instead of a season
            read from it.
          </p>
          <Note tone="danger" title={RETAKE_TIPS.tint.title}>
            {RETAKE_TIPS.tint.message}
          </Note>
          <Note icon="sun" title="Retake tip">
            {RETAKE_TIPS.tint.tip}
          </Note>
        </div>

        <div className="flex flex-col gap-(--space-3)">
          <h3 className="h3">A draping preview</h3>
          <p className="text-(--ink-muted)">
            Your face crop on your best and your worst color, side by side, so you can see the
            difference yourself.
          </p>
          <DrapingPair
            best={palette.draping.best}
            worst={palette.draping.worst}
            faceSrc={SAMPLE_FACE.src}
            faceAlt={SAMPLE_FACE.alt}
          />
        </div>

        <div className="flex flex-col gap-(--space-3)">
          <h3 className="h3">A palette with hex codes</h3>
          <p className="text-(--ink-muted)">
            Every color has a name and a hex code, so you can match it in a shop or an app.
          </p>
          <SwatchGrid colors={SAMPLE} columns={4} label="A sample Soft Autumn palette" />
          <Link href="/sample-report" className="label sn-navlink">
            See a full sample report
            <Icon name="arrow-right" size={18} />
          </Link>
        </div>

        <Note icon="clock" title="Your photo is deleted within 24 hours">
          Only a crop of your face is uploaded. We keep your result, not your photo.
        </Note>
      </section>

      <section className={SECTION}>
        <h2 className="h2">Find your season again</h2>
        <p className="text-(--ink-muted)">
          One daylight selfie and four quick questions. Free while we are in early access.
        </p>
        <Button href="/analyze" block className="lg:w-auto lg:self-start">
          <Icon name="camera" size={18} />
          Find my colors
        </Button>
      </section>
    </div>
  );
}
