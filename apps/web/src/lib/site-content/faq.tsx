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

import { seasonYellows } from "./seasons";

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

export function Faq({
  id,
  title,
  items,
  split = false,
}: {
  id: string;
  title: string;
  items: FaqItem[];
  /** From 1024 px, the title in a column beside the questions. */
  split?: boolean;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`flex flex-col gap-(--space-4) border-t border-(--line) pt-(--space-6)${split ? " lg:grid lg:grid-cols-12 lg:gap-x-(--space-6) lg:pt-(--space-8)" : ""}`}
    >
      <h2 className={split ? "h2 lg:col-span-4" : "h2"} id={id}>
        {title}
      </h2>
      <div
        className={`flex flex-col border-b border-(--line)${split ? " lg:col-span-7 lg:col-start-5" : ""}`}
      >
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

/** Swatch names as prose: ["Yellow Gold", "Copper"] → "yellow gold and copper". */
const list = (swatches: readonly { name: string }[]) => {
  const names = swatches.map((s) => s.name.toLowerCase());
  return names.length < 2
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
};

const capitalized = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Rec. 709 luma of a `#RRGGBB` color, enough to order a palette from light to dark. */
const luma = (hex: string) => {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Yes when the season's neutrals hold Black, else its darkest neutral as the swap. */
function blackAnswer(slug: SeasonSlug, name: string) {
  const neutrals = PALETTES[slug].neutrals;
  if (neutrals.some((n) => n.name === "Black"))
    return `Yes. Black is one of the ${name} neutrals, so it works near the face too.`;
  const darkest = neutrals.reduce((a, b) => (luma(b.hex) < luma(a.hex) ? b : a));
  return `Not near the face. Black is not in the ${name} palette. ${darkest.name}, its darkest neutral, does the same job. Black trousers, shoes and bags are fine.`;
}

/** The season's yellows from its palette, and the one to skip when its avoid list has one. */
function yellowAnswer(slug: SeasonSlug, name: string) {
  const { wear, avoid } = seasonYellows(slug);
  const lead =
    wear.length === 0
      ? `None near the face. The ${name} palette has no yellow.`
      : wear.length === 1
        ? `${capitalized(list(wear))}. It is the only yellow in the ${name} palette.`
        : `${capitalized(list(wear))}. They are the yellows in the ${name} palette.`;
  return avoid
    ? `${lead} Skip ${avoid.name.toLowerCase()}, one of the ${name} colors to avoid.`
    : lead;
}

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
      `${capitalized(list(palette.avoid.slice(0, 3)))}. They compete with ${name} coloring, so keep them away from the face. Trousers, shoes and bags in them are fine.`,
    ],
    [`Can a ${name} wear black?`, blackAnswer(slug, name)],
    [`Which yellow suits a ${name}?`, yellowAnswer(slug, name)],
    [`What hair color suits a ${name}?`, copy.hairTip],
    [`What makeup suits a ${name}?`, copy.makeupIntro],
    [
      `Which metals suit a ${name}?`,
      `${copy.metalsIntro} Wear ${list(palette.metals)}. Go easy on ${list(palette.metalsAvoid)}.`,
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
