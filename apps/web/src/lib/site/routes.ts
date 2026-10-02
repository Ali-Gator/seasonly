/**
 * The public route map: every page route, its metadata and whether search engines may index it.
 * Page metadata, the sitemap and the alias redirects in `next.config.ts` all read it.
 *
 * @see openspec/specs/site-structure/spec.md
 */
import { SEASON_SLUGS as CORE_SEASON_SLUGS, type SeasonSlug } from "@seasonly/analysis";
import type { Metadata } from "next";

/** The canonical host. A constant: it never changes per environment. */
export const ORIGIN = "https://seasonly.me";

/** The one-line description of each season from the seasons index. */
const SUMMARIES: Record<SeasonSlug, string> = {
  "light-spring": "Warm and light. Fresh, delicate colors with a golden base.",
  "true-spring": "The warmest Spring. Clear, golden and sunny.",
  "bright-spring": "Clear and vivid, leaning warm. High contrast suits it.",
  "light-summer": "Cool and light. Soft pastels with a blue base.",
  "true-summer": "The coolest Summer. Rose, blue and soft grey.",
  "soft-summer": "Cool and muted. Smoky, dusty colors, never sharp.",
  "soft-autumn": "Warm and muted. Earthy colors with a little dust in them.",
  "true-autumn": "The warmest Autumn. Rich, spicy and golden.",
  "deep-autumn": "Deep and warm. Dark, rich earth tones.",
  "deep-winter": "Deep and cool. Dark, rich jewel tones.",
  "true-winter": "The coolest Winter. Pure, icy and high contrast.",
  "bright-winter": "Clear and vivid, leaning cool. Brilliant colors, high contrast.",
};

/** The 12 seasons in family order, from the analysis core. */
export const SEASON_SLUGS: readonly SeasonSlug[] = CORE_SEASON_SLUGS;

export type { SeasonSlug };

/** The 12 seasons with their summaries, in family order. */
export const SEASONS: readonly { slug: SeasonSlug; summary: string }[] = SEASON_SLUGS.map(
  (slug) => ({ slug, summary: SUMMARIES[slug] }),
);

/** Common alternative season names, each 308-redirected to its fixed slug. */
export const SEASON_ALIASES: Readonly<Record<string, SeasonSlug>> = {
  "warm-spring": "true-spring",
  "clear-spring": "bright-spring",
  "cool-summer": "true-summer",
  "warm-autumn": "true-autumn",
  "cool-winter": "true-winter",
  "clear-winter": "bright-winter",
};

/** "soft-autumn" → "Soft Autumn". */
export function seasonName(slug: SeasonSlug): string {
  return slug.replace(
    /(^|-)(\w)/g,
    (_, sep: string, c: string) => `${sep ? " " : ""}${c.toUpperCase()}`,
  );
}

export interface Route {
  /** The URL path; `/seasons/[season]` and `/r/[id]` are patterns. */
  path: string;
  /** In the season entry, `{season}` and `{summary}` are filled per slug. */
  title: string;
  description: string;
  /** Whether the route may ever be indexed. */
  indexable: boolean;
  /** Whether its content has shipped. Flipped by the change that delivers it. */
  ready: boolean;
}

const SEASON_PATTERN = "/seasons/[season]";
const REPORT_PATTERN = "/r/[id]";

export const ROUTES: readonly Route[] = [
  {
    path: "/",
    title: "Seasonly: find your colors from one selfie",
    description:
      "One daylight selfie and four quick questions. In under a minute you get your season and 30 colors that work with you.",
    indexable: true,
    ready: false,
  },
  {
    path: "/seasons",
    title: "The 12 seasons of color analysis · Seasonly",
    description:
      "Seasonal color analysis sorts coloring into four families, then splits each family in three. Three questions decide where you land.",
    indexable: true,
    ready: false,
  },
  {
    path: SEASON_PATTERN,
    title: "{season} color palette and colors to avoid · Seasonly",
    description: "{summary} The {season} palette, colors to avoid, best neutrals and metals.",
    indexable: true,
    ready: false,
  },
  {
    path: "/how-it-works",
    title: "How Seasonly finds your colors",
    description:
      "One daylight selfie and four quick questions. Here is what happens to each, and why.",
    indexable: true,
    ready: false,
  },
  {
    path: "/sample-report",
    title: "Sample color analysis report · Seasonly",
    description:
      "A full sample Soft Autumn report: the palette with hex codes, colors to avoid, neutrals, metals and a draping preview.",
    indexable: true,
    ready: false,
  },
  {
    path: "/color-analysis-gpt-alternative",
    title: "Color analysis GPT alternative · Seasonly",
    description:
      "The color analysis GPT is retiring. Seasonly finds your season from one selfie and four questions, with a photo check, a draping preview and a palette with hex codes.",
    indexable: true,
    ready: false,
  },
  {
    path: "/privacy",
    title: "Privacy policy · Seasonly",
    description: "How Seasonly handles your photo and your data.",
    indexable: true,
    ready: false,
  },
  {
    path: "/terms",
    title: "Terms of use · Seasonly",
    description: "The terms for using Seasonly.",
    indexable: true,
    ready: false,
  },
  {
    path: "/analyze",
    title: "Find your colors · Seasonly",
    description: "One daylight selfie and four quick questions.",
    indexable: false,
    ready: false,
  },
  {
    path: REPORT_PATTERN,
    title: "Your color report · Seasonly",
    description: "Your season and the colors that work with you.",
    indexable: false,
    ready: false,
  },
];

/** The route serving `path`, with the path and season text filled in; undefined if no route does. */
export function routeAt(path: string, routes: readonly Route[] = ROUTES): Route | undefined {
  const season = /^\/seasons\/([^/]+)$/.exec(path)?.[1];
  const entry = SEASONS.find((s) => s.slug === season);
  const pattern = entry ? SEASON_PATTERN : /^\/r\/[^/]+$/.test(path) ? REPORT_PATTERN : path;
  const route = routes.find((r) => r.path === pattern);
  if (!route) return undefined;
  const fill = (text: string) =>
    entry
      ? text.replaceAll("{season}", seasonName(entry.slug)).replaceAll("{summary}", entry.summary)
      : text;
  return { ...route, path, title: fill(route.title), description: fill(route.description) };
}

/** Every concrete page with its metadata: the season pattern expands to 12, reports to none. */
export function pages(routes: readonly Route[] = ROUTES): Route[] {
  return routes.flatMap((r) => {
    if (r.path === SEASON_PATTERN)
      return SEASON_SLUGS.flatMap((s) => routeAt(`/seasons/${s}`, routes) ?? []);
    return r.path.includes("[") ? [] : [r];
  });
}

const isIndexed = (r: Route) => r.indexable && r.ready;

const url = (path: string) => `${ORIGIN}${path === "/" ? "" : path}`;

/** Absolute URLs of every page that may be indexed now: the sitemap. */
export function indexedUrls(routes: readonly Route[] = ROUTES): string[] {
  return pages(routes)
    .filter(isIndexed)
    .map((r) => url(r.path));
}

/** Title, description, apex canonical and robots for the page at `path`. */
export function pageMetadata(path: string, routes: readonly Route[] = ROUTES): Metadata {
  const route = routeAt(path, routes);
  if (!route) throw new Error(`No route in the route map serves ${path}`);
  return {
    title: route.title,
    description: route.description,
    alternates: { canonical: url(path) },
    ...(isIndexed(route) ? {} : { robots: { index: false } }),
  };
}
