import { type SeasonSlug, seasonFamily } from "@seasonly/analysis";

import { Button, Icon } from "@/components/ds";
import { Faq, type FaqItem } from "@/lib/site-content/faq";
import { FAMILIES, SeasonLink } from "@/lib/site-content/season-link";
import { pageMetadata, SEASON_SLUGS } from "@/lib/site/routes";

import { QuizPage } from "./quiz-page";

export const metadata = pageMetadata("/color-analysis-quiz");

const TELLS = [
  [
    "Your veins",
    "Veins that look green or olive often go with a warm undertone, and blue or purple with a cool one. A mix of both often means neutral.",
  ],
  [
    "Your jewelry",
    "Gold that leaves your skin looking even and warm points warm. Silver that leaves it looking clear and bright points cool.",
  ],
  [
    "Your skin in the sun",
    "Skin that burns and rarely tans tends to be cooler and lighter. Skin that tans easily tends to be warmer and deeper.",
  ],
  [
    "Your natural hair",
    "Blonde points light, and black or dark brown points deep. Red or auburn points warm. If you have dyed it for years, choose “Hard to tell”.",
  ],
] as const;

const FAQ: FaqItem[] = [
  [
    "What season am I?",
    "Answer the four questions at the top of this page and you get your season family: Spring, Summer, Autumn or Winter, with 6 colors to wear. For your exact season out of 12, add a selfie. Your answers carry over.",
  ],
  [
    "How accurate is a color analysis quiz?",
    "A quiz reads what you notice about your coloring, not your coloring itself. That is why your result names a family and not one of the 12 seasons. A daylight selfie gets you closer.",
  ],
  [
    "What if my answers don't point to one season?",
    "Some answers cancel out, like green veins with silver jewelry. You will see that instead of a guess. Check your wrist and jewelry in daylight and answer again, or let a selfie read your colors.",
  ],
  [
    "Is my result saved?",
    "No. Your result is worked out in your browser, and no report is saved. Add a selfie to get a full report.",
  ],
  [
    "Is it free?",
    "Yes. The quiz is free with no account. The selfie analysis is free while we are in early access.",
  ],
];

const SECTION =
  "flex flex-col gap-(--space-4) border-t border-(--line) pt-(--space-6) lg:grid lg:grid-cols-12 lg:gap-x-(--space-6) lg:pt-(--space-8)";

const inFamily = (family: string): SeasonSlug[] =>
  SEASON_SLUGS.filter((s) => seasonFamily(s) === family);

/**
 * The quiz page, from canvas boards "23", "23b" and "23c": the h1 and lead around the quiz, which
 * is the only client code, and the content for search below it.
 *
 * {@link openspec/specs/quiz-page/spec.md#requirement-the-quiz-page-asks-the-four-questions-in-its-first-screen}
 * {@link openspec/specs/quiz-page/spec.md#requirement-the-quiz-page-carries-real-content-for-search}
 */
export default function Page() {
  return (
    <>
      <section className="flex flex-col gap-(--space-6) lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-(--space-6)">
        <div className="flex flex-col gap-(--space-4) lg:col-span-5">
          <h1 className="h1">Color analysis quiz: what season am I?</h1>
          <p className="lead text-(--ink-muted)">
            Four questions give your season family and 6 colors. No photo, no sign-up.
          </p>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <QuizPage />
        </div>
      </section>

      <section aria-labelledby="tells-title" className={SECTION}>
        <h2 className="h2 lg:col-span-4" id="tells-title">
          What each question tells
        </h2>
        <div className="flex flex-col gap-(--space-4) lg:col-span-8 lg:col-start-5 lg:gap-(--space-6)">
          <p className="text-(--ink-muted)">
            Your season family comes down to two things: warm or cool, and light or deep. Each
            question points at one of them, or both.
          </p>
          <div className="flex flex-col gap-(--space-4) lg:grid lg:grid-cols-2 lg:gap-(--space-6)">
            {TELLS.map(([title, body]) => (
              <div key={title} className="flex flex-col gap-(--space-2)">
                <h3 className="h3">{title}</h3>
                <p className="text-(--ink-muted)">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="selfie-title" className={SECTION}>
        <h2 className="h2 lg:col-span-4" id="selfie-title">
          Why a selfie is more exact
        </h2>
        <div className="flex flex-col gap-(--space-4) lg:col-span-7 lg:col-start-5 lg:items-start">
          <p className="text-(--ink-muted)">
            The quiz gives one of four families. A selfie gives one of 12 seasons and all 30 of your
            colors, because the photo reads your skin, hair and eyes directly.
          </p>
          <p className="text-(--ink-muted)">
            Three seasons only come from a photo: Soft Autumn, Soft Summer and Bright Spring. Four
            answers can&apos;t reach them.
          </p>
          <p className="text-(--ink-muted)">
            Your answers come with you, so you won&apos;t be asked again. Your phone checks the
            photo first, and only a crop of your face is uploaded. We delete our copy within 24
            hours. Google may keep one up to 90 days for abuse checks.
          </p>
          <Button href="/analyze" block className="lg:w-auto">
            <Icon name="camera" size={18} />
            Find my colors
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="families-title"
        className="flex flex-col gap-(--space-8) border-t border-(--line) pt-(--space-6) lg:pt-(--space-8)"
      >
        <div className="flex flex-col gap-(--space-2)">
          <h2 className="h2" id="families-title">
            The four season families
          </h2>
          <p className="text-(--ink-muted)">
            Each family splits into three seasons, 12 in all. See the colors of each one.
          </p>
        </div>
        <div className="flex flex-col gap-(--space-8) lg:grid lg:grid-cols-4 lg:gap-(--space-6)">
          {FAMILIES.map(([family, title, line]) => (
            <div key={family} className="flex flex-col gap-(--space-4)">
              <div className="flex flex-col gap-(--space-1)">
                <p className="overline">{title}</p>
                <p className="text-(--ink-muted)">{line}</p>
              </div>
              <ul className="flex flex-col gap-(--space-4)">
                {inFamily(family).map((slug) => (
                  <li key={slug}>
                    <SeasonLink slug={slug} compact />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Faq id="faq-title" title="Questions" items={FAQ} split />
    </>
  );
}
