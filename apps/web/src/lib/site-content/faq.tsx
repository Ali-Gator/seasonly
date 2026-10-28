/**
 * The expandable question list How it works and every season page share: a section, its h2, and
 * one `<details>` per question with the first one open.
 *
 * @see openspec/specs/site-content/spec.md
 */
import { PALETTES, SEASON_COPY, type SeasonSlug } from "@seasonly/analysis";
import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/ds";
import { seasonName, secondName } from "@/lib/site/routes";

export type FaqItem = [question: string, answer: ReactNode];

/** A text link with an arrow, under an answer or a section. */
export function MoreLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="label sn-navlink flex">
      {children}
      <Icon name="arrow-right" size={18} />
    </Link>
  );
}

export function Faq({ id, title, items }: { id: string; title: string; items: FaqItem[] }) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-(--space-4) border-t border-(--line) pt-(--space-6)"
    >
      <h2 className="h2" id={id}>
        {title}
      </h2>
      <div className="flex flex-col border-b border-(--line)">
        {items.map(([question, answer], i) => (
          <details key={question} className="border-t border-(--line)" open={i === 0}>
            <summary className="label cursor-pointer py-[14px]">{question}</summary>
            <div className="flex flex-col gap-(--space-3) pb-(--space-4) text-(--ink-muted)">
              {answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/** ["a", "b", "c"] → "a, b and c". */
const list = (names: readonly string[]) =>
  names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

/**
 * A season page's questions, every answer built from the shared season copy and palettes, so the
 * page and a report for that season never disagree.
 *
 * {@link openspec/specs/site-content/spec.md#requirement-a-season-page-answers-common-questions-from-the-shared-copy}
 */
export function seasonFaq(slug: SeasonSlug): FaqItem[] {
  const name = seasonName(slug);
  const second = secondName(slug);
  const copy = SEASON_COPY[slug];
  const palette = PALETTES[slug];
  const names = (swatches: readonly { name: string }[]) => list(swatches.map((s) => s.name));
  return [
    ...(second
      ? [
          [
            `Is ${name} the same as ${second}?`,
            `Yes. ${second} and ${name} are two names for the same season, with the same palette.`,
          ] satisfies FaqItem,
        ]
      : []),
    [
      `What colors should a ${name} avoid?`,
      `${names(palette.avoid.slice(0, 3))}. They compete with ${name} coloring, so keep them away from the face. Trousers, shoes and bags in them are fine.`,
    ],
    [`What hair color suits a ${name}?`, copy.hairTip],
    [`What makeup suits a ${name}?`, copy.makeupIntro],
    [
      `Which metals suit a ${name}?`,
      `${copy.metalsIntro} Wear ${names(palette.metals)}. Go easy on ${names(palette.metalsAvoid)}.`,
    ],
    [
      `How do I find out if I'm a ${name}?`,
      <>
        Take one daylight selfie and answer four quick questions. Seasonly reads your undertone,
        depth and contrast and names your season in under a minute.
        <MoreLink href="/analyze">Find your colors</MoreLink>
      </>,
    ],
  ];
}
