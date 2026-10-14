/**
 * The six core pages, rendered to static markup without the site header and footer, against the
 * analysis core and the approved site content.
 *
 * @see openspec/specs/site-content/spec.md
 */
import {
  AGREEMENT_COPY,
  PALETTES,
  RETAKE_TIPS,
  SEASON_COPY,
  SEASON_SLUGS,
  type SeasonSlug,
  type Swatch,
} from "@seasonly/analysis";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import GptAlternative from "@/app/(site)/color-analysis-gpt-alternative/page";
import HowItWorks from "@/app/(site)/how-it-works/page";
import Landing from "@/app/(site)/page";
import SampleReport from "@/app/(site)/sample-report/page";
import Season from "@/app/(site)/seasons/[season]/page";
import Seasons from "@/app/(site)/seasons/page";
import { seasonName } from "@/lib/site/routes";

import { SAMPLE_FACE, TIP_PHOTOS } from "./images";
import { FAMOUS_NOTE, SEASON_CONTENT } from "./seasons";

/** The page's visible text: tags dropped, entities decoded, whitespace collapsed and no space before punctuation. */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .replace(/ ([,.;:])/g, "$1");

const words = (html: string) =>
  text(html)
    .split(" ")
    .filter((w) => /[\p{L}\p{N}]/u.test(w));

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The swatches of the grid labeled `label`, as the page shows them. */
function grid(html: string, label: string): Swatch[] {
  const list = new RegExp(`<ul[^>]*aria-label="${escape(label)}"[^>]*>(.*?)</ul>`).exec(html)?.[1];
  if (list === undefined) throw new Error(`No swatch grid labeled "${label}"`);
  return [...list.matchAll(/sn-swatch__name">([^<]*)<.*?sn-swatch__hex">([^<]*)</g)].map(
    ([, name, hex]) => ({ name: text(name ?? "").trim(), hex: hex ?? "" }),
  );
}

/** The chips of the strip labeled `label`: each one's hidden name and its fill. */
function strip(html: string, label: string): Swatch[] {
  const list = new RegExp(`<ul[^>]*aria-label="${escape(label)}"[^>]*>(.*?)</ul>`).exec(html)?.[1];
  if (list === undefined) throw new Error(`No swatch strip labeled "${label}"`);
  return [
    ...list.matchAll(
      /style="background:([^"]*)"[^>]*><\/span><span class="sn-visually-hidden">([^<]*)</g,
    ),
  ].map(([, hex, name]) => ({ name: text(name ?? "").trim(), hex: hex ?? "" }));
}

const imgs = (html: string) =>
  [...html.matchAll(/<img ([^>]*)>/g)].map(([, attrs]) => ({
    src: /src="([^"]*)"/.exec(attrs ?? "")?.[1],
    alt: /alt="([^"]*)"/.exec(attrs ?? "")?.[1],
  }));

/** Each `figure`: its markup and its `figcaption`'s visible text ("" when it has none). */
const figures = (html: string) =>
  [...html.matchAll(/<figure[^>]*>(.*?)<\/figure>/g)].map(([, inner = ""]) => ({
    inner,
    caption: text(/<figcaption[^>]*>(.*?)<\/figcaption>/.exec(inner)?.[1] ?? "").trim(),
  }));

/** The page with every `alt=""` image inside a captioned `figure` removed: its caption names it. */
const uncaptioned = (html: string) =>
  html.replace(/<figure[^>]*>(.*?)<\/figure>/g, (fig: string) =>
    figures(fig)[0]?.caption ? fig.replace(/<img [^>]*alt=""[^>]*>/g, "") : fig,
  );

const html = (el: ReactElement) => renderToStaticMarkup(el);
const seasonPage = async (season: SeasonSlug) =>
  html(await Season({ params: Promise.resolve({ season }) }));

const PAGES: [string, () => Promise<string>][] = [
  ["/", async () => html(<Landing />)],
  ["/seasons", async () => html(<Seasons />)],
  ...SEASON_SLUGS.map((s): [string, () => Promise<string>] => [
    `/seasons/${s}`,
    () => seasonPage(s),
  ]),
  ["/how-it-works", async () => html(<HowItWorks />)],
  ["/sample-report", async () => html(<SampleReport />)],
  ["/color-analysis-gpt-alternative", async () => html(<GptAlternative />)],
];

describe("every core page", () => {
  /** {@link openspec/specs/site-content/spec.md#scenario-no-placeholder-on-a-core-page} */
  it.each(PAGES)("%s has no placeholder and no empty photo slot", async (_, render) => {
    const out = await render();
    expect(text(out)).not.toMatch(/\[[A-Z][A-Z0-9 :'’,.-]+\]/);
    expect(text(out)).not.toMatch(/[{}]/);
    expect(out).not.toContain("sn-slot__label");
    for (const img of imgs(uncaptioned(out))) expect(img.alt, img.src).toBeTruthy();
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-a-core-page-clears-the-word-floor} */
  it.each(PAGES)("%s holds at least 250 words", async (_, render) => {
    expect(words(await render()).length).toBeGreaterThanOrEqual(250);
  });

  const NOTE_PAGES = PAGES.filter(([p]) =>
    ["/", "/how-it-works", "/color-analysis-gpt-alternative"].includes(p),
  );

  /** {@link openspec/specs/site-content/spec.md#scenario-the-24-hour-notes} */
  it("checks the 24-hour note on all three pages", () => {
    expect(NOTE_PAGES).toHaveLength(3);
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-the-24-hour-notes} */
  it.each(NOTE_PAGES)("%s says it keeps the report, not the photo", async (_, render) => {
    const out = text(await render());
    expect(out).toContain("We keep your report, not your photo.");
    expect(out).not.toContain("We keep your result");
  });
});

describe("/", () => {
  const out = html(<Landing />);
  const pool = [...PALETTES["soft-autumn"].best, ...PALETTES["soft-autumn"].neutrals];

  /** {@link openspec/specs/site-content/spec.md#requirement-the-landing-shows-a-sample-result-and-how-the-photo-is-handled} */
  it("has the hero, the three steps, the light tip and the deletion note", () => {
    expect(out).toMatch(/<a [^>]*href="\/analyze"[^>]*>.*?Take a selfie<\/a>/);
    expect(out).toMatch(/<a [^>]*href="\/analyze"[^>]*>.*?Upload a photo<\/a>/);
    expect(out).not.toMatch(/>Find my colors</);
    expect(text(out)).toContain("Free while we are in early access. No account needed.");
    for (const step of ["Take a selfie in daylight", "Answer four questions", "Get your colors"])
      expect(text(out)).toContain(step);
    expect(imgs(out)).toEqual([TIP_PHOTOS.light.good, TIP_PHOTOS.light.bad]);
    expect(text(out)).toContain("Your photo is deleted within 24 hours");
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-the-sample-result} */
  it("shows the board's 12 Soft Autumn colors, each one of the 30", () => {
    expect(text(out)).toContain("This is a Soft Autumn");
    const sample = grid(out, "A sample Soft Autumn palette");
    expect(sample.map((s) => s.name)).toEqual([
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
    ]);
    for (const s of sample) expect(pool).toContainEqual(s);
    expect(out).toContain('href="/sample-report"');
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-every-season-linked} */
  it("links all 12 seasons, each with its first four highlights", () => {
    for (const slug of SEASON_SLUGS) {
      expect(out).toContain(`href="/seasons/${slug}"`);
      expect(strip(out, `${seasonName(slug)} colors`)).toEqual(
        PALETTES[slug].highlights.slice(0, 4),
      );
    }
  });
});

describe("/seasons/<slug>", () => {
  /** {@link openspec/specs/site-content/spec.md#scenario-the-palette-matches-the-report} */
  it.each(SEASON_SLUGS)("%s shows its shared palette and copy, in order", async (slug) => {
    const out = await seasonPage(slug);
    const palette = PALETTES[slug];
    const name = seasonName(slug);
    expect(grid(out, `The ${name} palette`)).toEqual(palette.best);
    expect(grid(out, "Colors to avoid")).toEqual(palette.avoid);
    expect(grid(out, "Best neutrals")).toEqual(palette.neutrals);
    expect(grid(out, "Best metals")).toEqual(palette.metals);
    expect(grid(out, "Metals to go easy on")).toEqual(palette.metalsAvoid);
    const copy = SEASON_COPY[slug];
    for (const line of [copy.tagline, copy.summary, copy.undertone, copy.chroma, copy.contrast])
      expect(text(out)).toContain(line);
    expect(out.match(/<h1/g)).toHaveLength(1);
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-each-season-has-its-own-description} */
  it("gives each season its own description of at least 120 words", async () => {
    const abouts = SEASON_SLUGS.map((s) => SEASON_CONTENT[s].about.join(" "));
    for (const [i, about] of abouts.entries())
      expect(about.split(/\s+/).length, SEASON_SLUGS[i]).toBeGreaterThanOrEqual(120);
    expect(new Set(abouts).size).toBe(12);
    for (const slug of SEASON_SLUGS) {
      const page = text(await seasonPage(slug));
      for (const p of SEASON_CONTENT[slug].about) expect(page).toContain(p);
    }
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-neighbouring-seasons} */
  it.each(SEASON_SLUGS)("%s links three neighbours with a line and four colors", async (slug) => {
    const out = await seasonPage(slug);
    const { neighbours } = SEASON_CONTENT[slug];
    expect(new Set(neighbours.map((n) => n.slug)).size).toBe(3);
    for (const n of neighbours) {
      expect(n.slug).not.toBe(slug);
      expect(out).toContain(`href="/seasons/${n.slug}"`);
      expect(text(out)).toContain(n.why);
      expect(grid(out, `${seasonName(n.slug)} colors`)).toEqual(
        PALETTES[n.slug].highlights.slice(0, 4),
      );
    }
    const cta = new RegExp(
      `<a [^>]*href="/analyze"[^>]*>.*?Find out if you're a ${seasonName(slug)}</a>`,
      "g",
    );
    expect(out.replace(/&#x27;/g, "'").match(cta)).toHaveLength(2);
  });

  /**
   * {@link openspec/specs/site-content/spec.md#scenario-a-credited-photo}
   * {@link openspec/specs/site-content/spec.md#scenario-the-name-is-read-once}
   */
  it.each(SEASON_SLUGS)("%s credits three famous people's photos and sources", async (slug) => {
    const out = await seasonPage(slug);
    const { famous } = SEASON_CONTENT[slug];
    expect(famous).toHaveLength(3);
    // The page links the studio once, under all three: every figure must share that source.
    expect(new Set(famous.map((f) => f.source.url)).size).toBe(1);
    for (const f of famous) {
      expect(f.image).toMatch(new RegExp(`^/images/famous/${slug}/[a-z-]+\\.webp$`));
      expect(imgs(out)).toContainEqual({ src: f.image, alt: "" });
      expect(figures(out).find((g) => g.inner.includes(`src="${f.image}"`))?.caption).toContain(
        f.name,
      );
      expect(text(out)).toContain(f.name);
      expect(f.credit.commonsUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(f.credit.license).toMatch(/^CC (0|BY|BY-SA) [\d.]+$|^CC0/);
      expect(out).toContain(`href="${f.credit.commonsUrl.replace(/&/g, "&amp;")}"`);
      expect(out).toContain(`href="${f.credit.licenseUrl}"`);
      expect(text(out)).toContain(`${f.credit.author}, ${f.credit.license}, cropped`);
      expect(out).toContain(`href="${f.source.url}"`);
    }
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-no-endorsement-implied} */
  it("says the famous people are readings of public photos and endorse nothing", async () => {
    const page = text(await seasonPage("soft-autumn"));
    expect(page).toContain(`${FAMOUS_NOTE.before}${FAMOUS_NOTE.studio}${FAMOUS_NOTE.after}`);
    expect(page).toContain("No one shown here endorses Seasonly.");
  });
});

describe("/how-it-works", () => {
  const out = html(<HowItWorks />);

  /** {@link openspec/specs/site-content/spec.md#scenario-all-five-rejections} */
  it("names all five reasons a photo is turned back", () => {
    const titles = Object.values(RETAKE_TIPS).map((t) => t.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Too dark",
        "Tinted light",
        "Filter detected",
        "No face found",
        "More than one face",
      ]),
    );
    for (const title of titles) expect(text(out)).toContain(title);
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-photo-and-quiz-disagree} */
  it("says the photo counts for more, promises no right answer, and links on", () => {
    expect(text(out)).toContain(AGREEMENT_COPY.differ.body);
    expect(text(out)).not.toMatch(/never (a )?wrong|always (right|correct)|guarantee/i);
    for (const href of ["/sample-report", "/privacy", "/color-analysis-gpt-alternative"])
      expect(out).toContain(`href="${href}"`);
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-when-the-crop-is-uploaded} */
  it("says the crop is uploaded after the check and the quiz, with no agreement step", () => {
    expect(text(out)).toContain(
      "Only a crop of your face is uploaded, after the photo passes the check and you finish the quiz.",
    );
    expect(text(out)).toContain(
      "Nothing is uploaded until the photo passes the check and you finish the quiz.",
    );
    expect(text(out)).not.toMatch(/you agree/i);
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-the-faq-names-googles-copy} */
  it("names Google's copy in the photo FAQ", () => {
    expect(text(out)).toContain(
      "We delete our copy within 24 hours. Google may keep one up to 90 days for abuse checks.",
    );
    expect(text(out)).not.toContain("It is deleted within 24 hours");
  });
});

describe("/sample-report", () => {
  const out = html(<SampleReport />);

  /** {@link openspec/specs/site-content/spec.md#scenario-a-sample-not-a-report} */
  it("is marked a sample, shows six sections and the sample face, and offers no action", () => {
    expect(text(out)).toContain("This is a sample Soft Autumn report");
    expect(out.indexOf("This is a sample Soft Autumn report")).toBeLessThan(out.indexOf("<h1"));
    expect(text(out)).toContain("Section 6 of 6");
    expect(text(/<h1[^>]*>(.*?)<\/h1>/.exec(out)?.[1] ?? "")).toMatch(
      /sample color analysis report/i,
    );
    expect(out).toContain('href="/seasons/soft-autumn"');
    expect(imgs(out)).toEqual([SAMPLE_FACE, SAMPLE_FACE]);
    expect(text(out)).not.toMatch(/\b(Share|Save|Premium)\b/);
    expect(out).not.toContain("/api/");
    expect(out.lastIndexOf('href="/analyze"')).toBeGreaterThan(out.indexOf("Section 6 of 6"));
  });
});

describe("/color-analysis-gpt-alternative", () => {
  const out = html(<GptAlternative />);

  /** {@link openspec/specs/site-content/spec.md#scenario-the-retirement-facts} */
  it("states the date and what does not carry over, linking OpenAI's FAQ", () => {
    expect(text(out)).toContain("December 11, 2026");
    expect(text(out)).toMatch(/does not carry over/);
    expect(text(out)).toMatch(/custom actions do not transfer/);
    expect(out).toContain(
      'href="https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq"',
    );
    expect(imgs(out)).toEqual([SAMPLE_FACE, SAMPLE_FACE]);
  });
});

describe("example photos", () => {
  /** {@link openspec/specs/site-content/spec.md#scenario-alt-text-on-every-example} */
  it("each have alt text", () => {
    const photos = [...Object.values(TIP_PHOTOS).flatMap((t) => [t.good, t.bad]), SAMPLE_FACE];
    for (const p of photos) {
      expect(p.src).toMatch(/^\/images\/examples\/[a-z]+\.webp$/);
      expect(p.alt.trim().length, p.src).toBeGreaterThan(10);
    }
  });
});

describe("/ after the design review", () => {
  const out = html(<Landing />);

  /** {@link openspec/specs/site-content/spec.md#scenario-color-in-the-first-phone-screen} */
  it("shows a 12-chip strip with its caption and link between the headline and the actions, hidden from 1024 px", () => {
    const figure = /<figure class="([^"]*)">(.*?)<\/figure>/.exec(out);
    expect(figure?.[1]).toContain("lg:hidden");
    const inner = figure?.[2] ?? "";
    expect(inner.match(/class="sn-swatch-strip__chip"/g)).toHaveLength(12);
    expect(text(inner)).toContain("A Soft Autumn result: 12 of 30 colors.");
    expect(inner).toContain('href="/sample-report"');
    expect(inner).not.toContain("sn-swatch__hex");
    const at = out.indexOf("<figure");
    expect(out.indexOf("Find your colors from one selfie.")).toBeLessThan(at);
    expect(at).toBeLessThan(out.indexOf("Take a selfie"));
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-every-season-linked} */
  it("gives each season an h3 linking to its page and a chip strip with hidden names and no hex", () => {
    for (const slug of SEASON_SLUGS) {
      const name = seasonName(slug);
      expect(out).toMatch(
        new RegExp(`<h3 class="h3[^"]*"><a [^>]*href="/seasons/${slug}"[^>]*>${escape(name)}`),
      );
      const strip = new RegExp(
        `<ul class="sn-swatch-strip"[^>]*aria-label="${escape(name)} colors"[^>]*>(.*?)</ul>`,
      ).exec(out)?.[1];
      const names = [...(strip ?? "").matchAll(/sn-visually-hidden">([^<]*)</g)].map((m) => m[1]);
      expect(names, slug).toEqual(PALETTES[slug].highlights.slice(0, 4).map((c) => c.name));
      expect(strip).not.toContain("sn-swatch__hex");
    }
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-a-desktop-window} */
  it("swaps the hero's fills from 1024 px, so upload is primary on a desktop", () => {
    const hero = out.slice(0, out.indexOf("This is a Soft Autumn"));
    const selfie = /<a [^>]*class="([^"]*)"[^>]*>(?:(?!<\/a>).)*Take a selfie<\/a>/.exec(hero)?.[1];
    const upload = /<a [^>]*class="([^"]*)"[^>]*>(?:(?!<\/a>).)*Upload a photo<\/a>/.exec(
      hero,
    )?.[1];
    expect(selfie).toContain("sn-btn--primary");
    expect(selfie).toContain("sn-btn--lg-swap");
    expect(upload).toContain("sn-btn--secondary");
    expect(upload).toContain("sn-btn--lg-swap");
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-the-closing-action} */
  it("ends on Start with a selfie as the primary action", () => {
    const actions = [...out.matchAll(/<a [^>]*class="([^"]*sn-btn[^"]*)"[^>]*>(.*?)<\/a>/g)];
    const last = actions.at(-1);
    expect(text(last?.[2] ?? "").trim()).toBe("Start with a selfie");
    expect(last?.[1]).toContain("sn-btn--primary");
  });
});

describe("palette first on a phone", () => {
  /** {@link openspec/specs/site-content/spec.md#scenario-the-palette-comes-first-on-a-phone} */
  it("puts a season page's palette after the tagline and before the summary and description", async () => {
    const out = await seasonPage("soft-autumn");
    const copy = SEASON_COPY["soft-autumn"];
    const palette = out.indexOf('aria-label="The Soft Autumn palette"');
    expect(out.indexOf(copy.tagline)).toBeLessThan(palette);
    expect(palette).toBeLessThan(out.indexOf(copy.summary));
    const about = SEASON_CONTENT["soft-autumn"].about[0] ?? "";
    expect(palette).toBeLessThan(out.indexOf(about.slice(0, 20)));
    expect(palette).toBeLessThan(out.indexOf("Undertone"));
  });

  /** {@link openspec/specs/site-content/spec.md#scenario-the-sample-on-a-phone} */
  it("puts the sample's palette after its tagline, below a banner whose action is secondary", () => {
    const out = html(<SampleReport />);
    const banner = out.slice(0, out.indexOf("<h1"));
    const action = /<a [^>]*class="([^"]*)"[^>]*>(?:(?!<\/a>).)*Find my colors<\/a>/.exec(banner);
    expect(action?.[1]).toContain("sn-btn--secondary");
    expect(banner).not.toContain("sn-btn--primary");
    const palette = out.indexOf('aria-label="Your Soft Autumn palette"');
    expect(out.indexOf("Warm, soft and earthy.")).toBeLessThan(palette);
    expect(palette).toBeLessThan(out.indexOf(SEASON_COPY["soft-autumn"].summary));
  });
});
