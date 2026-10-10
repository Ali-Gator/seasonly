import { type Family, SEASON_SLUGS, seasonFamily } from "@seasonly/analysis";

import { Button, Icon } from "@/components/ds";
import { SeasonLink } from "@/lib/site-content/season-link";
import { pageMetadata, SEASONS } from "@/lib/site/routes";

export const metadata = pageMetadata("/seasons");

const FAMILIES: [Family, string, string][] = [
  ["spring", "Spring", "Warm and clear, with a golden glow. Light to medium depth."],
  ["summer", "Summer", "Cool and soft, with a rosy or blue base. Light to medium depth."],
  ["autumn", "Autumn", "Warm and muted, with a golden or earthy base. Medium to deep."],
  ["winter", "Winter", "Cool and clear, with high contrast. From icy to deep."],
];

const QUESTIONS = [
  ["Warm or cool", "Undertone. Golden for Spring and Autumn, rosy or blue for Summer and Winter."],
  ["Light or deep", "Depth. How light or dark your hair, skin and eyes are together."],
  ["Soft or bright", "Chroma. Muted and dusty, or clear and vivid."],
] as const;

/**
 * The seasons index, from canvas boards "Seasons" (375) and "Seasons-1280": four colors per
 * season on a phone, all six highlights from 1024 px.
 *
 * @see openspec/specs/site-content/spec.md
 */
export default function Page() {
  return (
    <>
      <section className="flex flex-col gap-(--space-4) lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-(--space-6)">
        <div className="flex flex-col gap-(--space-4) max-lg:contents lg:col-span-5">
          <p className="overline">The 12 seasons</p>
          <h1 className="h1">Twelve seasons, four families</h1>
          <p className="lead text-(--ink-muted)">
            Seasonal color analysis sorts coloring into four families, then splits each family in
            three. Three questions decide where you land.
          </p>
          <p className="text-(--ink-muted) max-lg:order-1">
            Each season is named for the quality that leads it: a Light Spring is above all light, a
            Soft Autumn above all soft, a True Winter purely cool.
          </p>
        </div>
        <dl className="sn-card m-0 grid grid-cols-[auto_1fr] gap-x-(--space-4) gap-y-(--space-3) lg:col-span-6 lg:col-start-7">
          {QUESTIONS.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="label">{term}</dt>
              <dd className="m-0 text-(--ink-muted)">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {FAMILIES.map(([family, title, line]) => (
        <section
          key={family}
          aria-labelledby={`fam-${family}`}
          className="flex flex-col gap-(--space-5) border-t border-(--line) pt-(--space-6) lg:gap-(--space-6) lg:pt-(--space-8)"
        >
          <div className="flex flex-col gap-(--space-1)">
            <h2 className="h2" id={`fam-${family}`}>
              {title}
            </h2>
            <p className="text-(--ink-muted)">{line}</p>
          </div>
          <ul className="flex flex-col gap-(--space-8) lg:grid lg:grid-cols-3 lg:gap-(--space-6)">
            {SEASON_SLUGS.filter((s) => seasonFamily(s) === family).map((slug) => (
              <li key={slug}>
                <SeasonLink slug={slug} line={SEASONS.find((s) => s.slug === slug)?.summary} wide />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="flex flex-col gap-(--space-4) border-t border-(--line) pt-(--space-6) lg:flex-row lg:items-center lg:justify-between lg:gap-(--space-6) lg:py-(--space-8)">
        <div className="flex flex-col gap-(--space-4) lg:gap-(--space-2)">
          <h2 className="h2">Which one are you?</h2>
          <p className="text-(--ink-muted)">
            One daylight selfie and four quick questions. Free while we are in early access.
          </p>
        </div>
        <Button href="/analyze" block className="lg:w-auto">
          <Icon name="camera" size={18} />
          Find my colors
        </Button>
      </section>
    </>
  );
}
