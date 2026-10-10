import { type Family, PALETTES, SEASON_SLUGS, seasonFamily } from "@seasonly/analysis";
import Link from "next/link";

import { Button, Icon, Note, PhotoTipCard, SwatchGrid } from "@/components/ds";
import { TIP_PHOTOS } from "@/lib/site-content/images";
import { SeasonLink } from "@/lib/site-content/season-link";
import { pageMetadata } from "@/lib/site/routes";

export const metadata = pageMetadata("/");

/** The board's 12 sample colors, read by name from the Soft Autumn palette. */
const SAMPLE = [
  "Soft Coral",
  "Terracotta",
  "Rust",
  "Dusty Rose",
  "Rosewood",
  "Honey",
  "Camel",
  "Khaki",
  "Olive",
  "Sage",
  "Deep Teal",
  "Mushroom",
].map((name) => {
  const { best, neutrals } = PALETTES["soft-autumn"];
  const color = [...best, ...neutrals].find((c) => c.name === name);
  if (!color) throw new Error(`No Soft Autumn color named ${name}`);
  return color;
});

const STEPS = [
  [
    "Take a selfie in daylight",
    "Face a window, skip the makeup and the filter. Daylight shows your real undertone.",
  ],
  [
    "Answer four questions",
    "Your veins, jewelry, sun and natural hair fill in what a photo can't show.",
  ],
  [
    "Get your colors",
    "Your season, a palette with names and hex codes, colors to avoid, and makeup and hair ideas.",
  ],
] as const;

const FAMILIES: Family[] = ["spring", "summer", "autumn", "winter"];
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The landing, from canvas boards "Main" (375) and "Landing-1280": one DOM, rearranged from
 * 1024 px.
 *
 * {@link openspec/specs/site-content/spec.md#requirement-the-landing-shows-a-sample-result-and-how-the-photo-is-handled}
 */
export default function Page() {
  return (
    <>
      <section className="flex flex-col gap-(--space-12) lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-(--space-6)">
        <div className="flex flex-col gap-(--space-4) lg:col-span-5">
          <p className="overline">Seasonal color analysis</p>
          <h1 className="h1">Find your colors from one selfie.</h1>
          <p className="lead text-(--ink-muted)">
            One daylight selfie and four quick questions. In under a minute you get your season and
            30 colors that work with you.
          </p>
          <div className="sn-stack mt-(--space-4) lg:flex-row">
            <Button href="/analyze" block className="lg:w-auto">
              <Icon name="camera" size={18} />
              Take a selfie
            </Button>
            <Button href="/analyze" variant="secondary" block className="lg:w-auto">
              <Icon name="upload" size={18} />
              Upload a photo
            </Button>
          </div>
          <p className="caption text-center text-(--ink-muted) lg:text-left">
            Free while we are in early access. No account needed.
            <span className="hidden lg:inline"> On a laptop, upload a selfie from your phone.</span>
          </p>
        </div>
        <div className="flex flex-col gap-(--space-4) lg:col-span-6 lg:col-start-7">
          <div className="flex items-baseline justify-between">
            <p className="overline">Sample result</p>
            <p className="caption hidden text-(--ink-muted) lg:block">12 of 30 colors</p>
          </div>
          <h2 className="h2">This is a Soft Autumn</h2>
          <p className="text-(--ink-muted) lg:hidden">
            Warm, muted colors with a golden base. Your result looks like this, with 30 colors, each
            named, with its hex code.
          </p>
          <SwatchGrid
            colors={SAMPLE}
            columns={4}
            label="A sample Soft Autumn palette"
            className="lg:grid-cols-6!"
          />
        </div>
      </section>

      <section
        id="how"
        className="flex flex-col gap-(--space-6) lg:gap-(--space-8) lg:border-t lg:border-(--line) lg:pt-(--space-12)"
      >
        <h2 className="h2">How it works</h2>
        <ol className="flex flex-col gap-(--space-5) lg:grid lg:grid-cols-3 lg:gap-(--space-6)">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-(--space-4) lg:flex-col lg:gap-(--space-3)">
              <span className="label grid size-8 flex-none place-items-center rounded-(--radius-pill) border border-(--ink)">
                {i + 1}
              </span>
              <div className="flex flex-col gap-(--space-1)">
                <h3 className="h3">{title}</h3>
                <p className="text-(--ink-muted)">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="privacy"
        className="flex flex-col gap-(--space-4) lg:grid lg:grid-cols-12 lg:gap-x-(--space-6) lg:border-t lg:border-(--line) lg:pt-(--space-12)"
      >
        {/* Below 1024 px the tip card sits between the lead and the deletion note, as on Main. */}
        <div className="flex flex-col gap-(--space-4) max-lg:contents lg:col-span-5">
          <h2 className="h2">A good photo, then gone</h2>
          <p className="text-(--ink-muted)">
            A bad photo gives a bad result, so we check yours before we read it, and tell you how to
            fix it.
          </p>
          <Note
            icon="clock"
            title="Your photo is deleted within 24 hours"
            className="max-lg:order-1"
          >
            Only a crop of your face is uploaded. We keep your result, not your photo.
          </Note>
          <Note icon="sun" title="Daylight, no makeup, no filter" className="hidden lg:flex">
            Three things that change how your skin reads. Get them right and the result gets
            sharper.
          </Note>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <PhotoTipCard
            title="Face a window"
            body="Even daylight from the front shows your skin as it is. Lamps tint it yellow."
            good={{ caption: "Window light, facing it", ...TIP_PHOTOS.light.good }}
            bad={{ caption: "Lamp light from above", ...TIP_PHOTOS.light.bad }}
          />
        </div>
      </section>

      <section
        aria-labelledby="explore-title"
        className="flex flex-col gap-(--space-8) lg:border-t lg:border-(--line) lg:pt-(--space-12)"
      >
        <div className="flex flex-col gap-(--space-2) lg:flex-row lg:items-baseline lg:justify-between">
          <div className="flex flex-col gap-(--space-2)">
            <h2 className="h2" id="explore-title">
              Explore the 12 seasons
            </h2>
            <p className="text-(--ink-muted)">
              Four families, three seasons each. Open one to see its colors.
            </p>
          </div>
          <AllSeasons className="hidden lg:inline-flex" />
        </div>
        {FAMILIES.map((family) => (
          <div key={family} className="flex flex-col gap-(--space-3)">
            <p className="overline">{capitalize(family)}</p>
            <div className="flex flex-col gap-(--space-3) lg:grid lg:grid-cols-3 lg:gap-(--space-6)">
              {SEASON_SLUGS.filter((s) => seasonFamily(s) === family).map((slug) => (
                <SeasonLink key={slug} slug={slug} />
              ))}
            </div>
          </div>
        ))}
        <AllSeasons className="lg:hidden" />
      </section>

      <section className="flex flex-col gap-(--space-4) border-t border-(--line) pt-(--space-6) lg:flex-row lg:items-center lg:justify-between lg:py-(--space-8)">
        <h2 className="h2">Ready when you are</h2>
        <Button href="/analyze" variant="secondary" block className="lg:w-auto">
          Start with a selfie
        </Button>
      </section>
    </>
  );
}

function AllSeasons({ className }: { className: string }) {
  return (
    <Link href="/seasons" className={`label sn-navlink ${className}`}>
      All 12 seasons
      <Icon name="arrow-right" size={18} />
    </Link>
  );
}
