import { AGREEMENT_COPY, RETAKE_TIPS, type RetakeReason } from "@seasonly/analysis";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button, Icon, Note } from "@/components/ds";
import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/how-it-works");

/** The order the board lists them in. */
const REJECTIONS: RetakeReason[] = ["dark", "tint", "filter", "no-face", "several-faces"];

const FAQ: [string, ReactNode][] = [
  [
    "Do I need an account?",
    "No. Seasonly is free while we are in early access, and no account is needed.",
  ],
  [
    "Why was my photo rejected?",
    "The photo check found something that would throw off your result: too little light, tinted light, a filter, no face in the frame, or more than one face. You get one tip to fix it, then retake.",
  ],
  [
    "What happens to my photo?",
    "Only a crop of your face is uploaded, and only after you agree. It is deleted within 24 hours. We keep your result, not your photo.",
  ],
  [
    "Can I wear colors that aren't in my palette?",
    "Yes. Seasons describe colors, not people. If a color you love isn't in your palette, wear it away from your face.",
  ],
  [
    "How is this different from a color analysis GPT?",
    <>
      Seasonly checks your photo before reading it, shows a draping preview, and gives you a palette
      with hex codes.
      <MoreLink href="/color-analysis-gpt-alternative">Color analysis GPT alternative</MoreLink>
    </>,
  ],
];

function MoreLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="label sn-navlink flex">
      {children}
      <Icon name="arrow-right" size={18} />
    </Link>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-(--space-4)">
      <span className="label grid size-8 flex-none place-items-center rounded-(--radius-pill) border border-(--ink)">
        {n}
      </span>
      <div className="flex min-w-0 flex-col gap-(--space-2)">
        <h3 className="h3">{title}</h3>
        {children}
      </div>
    </li>
  );
}

const SECTION = "flex flex-col gap-(--space-4) border-t border-(--line) pt-(--space-6)";

/**
 * How it works, from canvas board "HowItWorks": the photo check's five rejections from the
 * retake tips, and the disagree line from the shared agreement copy.
 *
 * {@link openspec/specs/site-content/spec.md#requirement-how-it-works-describes-the-real-checks}
 */
export default function Page() {
  return (
    <div className="flex flex-col gap-(--space-12) max-w-[720px]">
      <section className="flex flex-col gap-(--space-4)">
        <p className="overline">How it works</p>
        <h1 className="h1">How Seasonly finds your colors</h1>
        <p className="lead text-(--ink-muted)">
          One daylight selfie and four quick questions. Here is what happens to each, and why.
        </p>
        <Button href="/analyze" block className="lg:w-auto lg:self-start">
          <Icon name="camera" size={18} />
          Take a selfie
        </Button>
      </section>

      <section aria-labelledby="steps-title" className="flex flex-col gap-(--space-6)">
        <h2 className="h2" id="steps-title">
          Three steps
        </h2>
        <ol className="flex flex-col gap-(--space-8)">
          <Step n={1} title="Take a selfie in daylight">
            <p className="text-(--ink-muted)">
              Daylight shows your real undertone. Three things make the difference:
            </p>
            <ul className="flex list-disc flex-col gap-(--space-2) pl-(--space-5) text-(--ink-muted)">
              <li>
                <strong>Face a window.</strong> Natural daylight from the front. Lamps and screens
                tint your skin.
              </li>
              <li>
                <strong>Skip the makeup.</strong> Foundation and bronzer hide your undertone. Pull
                your hair back too.
              </li>
              <li>
                <strong>No filter.</strong> Filters and beauty mode shift skin tone. Use the plain
                camera.
              </li>
            </ul>
            <p className="caption text-(--ink-muted)">
              On a laptop, upload a selfie from your phone.
            </p>
          </Step>
          <Step n={2} title="Answer four questions">
            <p className="text-(--ink-muted)">
              Your veins, jewelry, sun and natural hair fill in what a photo can&apos;t show. One
              question per screen, one tap each.
            </p>
          </Step>
          <Step n={3} title="Get your colors">
            <p className="text-(--ink-muted)">
              Your season, a palette with names and hex codes, colors to avoid, your best neutrals
              and metals, makeup and hair ideas, and a draping preview of your face on your best and
              worst color.
            </p>
            <MoreLink href="/sample-report">See a sample report</MoreLink>
          </Step>
        </ol>
      </section>

      <section aria-labelledby="check-title" className={SECTION}>
        <h2 className="h2" id="check-title">
          The photo check
        </h2>
        <p className="text-(--ink-muted)">
          A bad photo gives a bad result. So your phone checks the photo first, before anything is
          uploaded. If it fails, you get one reason and one retake tip, instead of a result read
          from a bad photo.
        </p>
        <h3 className="h3">What it turns back</h3>
        <div className="sn-stack">
          {REJECTIONS.map((reason) => (
            <Note key={reason} tone="danger" title={RETAKE_TIPS[reason].title}>
              {RETAKE_TIPS[reason].message}
            </Note>
          ))}
        </div>
        <p className="text-(--ink-muted)">
          Each of these changes how your skin reads in the photo, so the season would be off.
        </p>
      </section>

      <section aria-labelledby="both-title" className={SECTION}>
        <h2 className="h2" id="both-title">
          Photo and quiz, together
        </h2>
        <p className="text-(--ink-muted)">
          The photo shows your skin, hair and eyes. The quiz adds what a camera can&apos;t: the
          color of your veins, the jewelry that flatters you, how you take the sun and your natural
          hair color. Your season comes from both.
        </p>
        <Note icon="check" title={AGREEMENT_COPY.agree.title}>
          Green veins and gold jewelry point warm. Soft brown hair and hazel eyes point muted.
        </Note>
        <p className="text-(--ink-muted)">{AGREEMENT_COPY.differ.body}</p>
      </section>

      <section aria-labelledby="privacy-title" className={SECTION}>
        <h2 className="h2" id="privacy-title">
          Your photo, then gone
        </h2>
        <Note icon="lock" title="Only a crop of your face is uploaded">
          The background and the rest of the photo stay on your phone. Nothing is uploaded until the
          photo passes the check and you agree.
        </Note>
        <Note icon="clock" title="Deleted within 24 hours">
          We keep your result, your season and your colors, not your photo.
        </Note>
        <MoreLink href="/privacy">Read the privacy policy</MoreLink>
      </section>

      <section aria-labelledby="faq-title" className={SECTION}>
        <h2 className="h2" id="faq-title">
          Questions
        </h2>
        <div className="flex flex-col border-b border-(--line)">
          {FAQ.map(([question, answer], i) => (
            <details key={question} className="border-t border-(--line)" open={i === 0}>
              <summary className="label cursor-pointer py-[14px]">{question}</summary>
              <div className="flex flex-col gap-(--space-3) pb-(--space-4) text-(--ink-muted)">
                {answer}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className={SECTION}>
        <h2 className="h2">Ready when you are</h2>
        <p className="text-(--ink-muted)">
          One daylight selfie and four quick questions. Free while we are in early access.
        </p>
        <Button href="/analyze" block className="lg:w-auto lg:self-start">
          <Icon name="camera" size={18} />
          Take a selfie
        </Button>
      </section>
    </div>
  );
}
