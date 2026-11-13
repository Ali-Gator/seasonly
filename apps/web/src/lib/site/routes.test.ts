import fs from "node:fs";
import path from "node:path";

import { PALETTES } from "@seasonly/analysis";
import { describe, expect, it } from "vitest";

import {
  indexedUrls,
  ORIGIN,
  pageMetadata,
  pages,
  routeAt,
  ROUTES,
  SEASON_ALIASES,
  SEASON_SLUGS,
  searchName,
  seasonName,
  secondName,
  siteJsonLd,
  type Route,
} from "./routes";

const APP = path.resolve(import.meta.dirname, "../../app");

/** The path each `page.tsx` serves: `(group)` segments dropped, `[season]` and `[id]` kept as patterns. */
function pageFilePaths(dir = APP): { file: string; path: string }[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return pageFilePaths(full);
    if (!/^page\.(tsx|ts|jsx|js|mdx)$/.test(e.name)) return [];
    const segments = path
      .relative(APP, dir)
      .split(path.sep)
      .filter((s) => s && !/^\(.+\)$/.test(s));
    return [{ file: path.relative(APP, full), path: `/${segments.join("/")}` }];
  });
}

const allReady = (routes: readonly Route[]) => routes.map((r) => ({ ...r, ready: true }));

describe("route map", () => {
  /** {@link openspec/specs/site-structure/spec.md#scenario-the-quiz-page-answers} */
  it("holds the quiz page, indexable and ready, with its title and a description", () => {
    expect(routeAt("/color-analysis-quiz")).toMatchObject({
      title: "Color analysis quiz: what season am I? · Seasonly",
      indexable: true,
      ready: true,
    });
    expect(routeAt("/color-analysis-quiz")?.description).toMatch(/\w/);
  });

  /** {@link openspec/specs/site-structure/spec.md#requirement-the-12-season-slugs-are-fixed} */
  it("has exactly the 12 season slugs", () => {
    expect(SEASON_SLUGS).toEqual([
      "light-spring",
      "true-spring",
      "bright-spring",
      "light-summer",
      "true-summer",
      "soft-summer",
      "soft-autumn",
      "true-autumn",
      "deep-autumn",
      "deep-winter",
      "true-winter",
      "bright-winter",
    ]);
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-an-unknown-or-wrongly-cased-slug} */
  it("maps no unknown or wrongly cased slug", () => {
    expect(routeAt("/seasons/soft-autumn")?.path).toBe("/seasons/soft-autumn");
    expect(routeAt("/seasons/autumn")).toBeUndefined();
    expect(routeAt("/seasons/Soft-Autumn")).toBeUndefined();
    expect(routeAt("/pricing")).toBeUndefined();
  });

  /**
   * {@link openspec/specs/site-structure/spec.md#requirement-alternative-season-names-redirect-to-the-fixed-slug}
   * {@link openspec/specs/site-structure/spec.md#scenario-a-dark-name}
   */
  it("maps the eight alternative names to fixed slugs", () => {
    expect(SEASON_ALIASES).toEqual({
      "warm-spring": "true-spring",
      "clear-spring": "bright-spring",
      "cool-summer": "true-summer",
      "warm-autumn": "true-autumn",
      "dark-autumn": "deep-autumn",
      "dark-winter": "deep-winter",
      "cool-winter": "true-winter",
      "clear-winter": "bright-winter",
    });
  });

  /** {@link openspec/specs/site-structure/spec.md#requirement-alternative-season-names-redirect-to-the-fixed-slug} */
  it("gives every second name exactly one redirect, and no redirect without one", () => {
    // Each alias is its slug with the first word swapped for the second name's.
    const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
    for (const [alias, slug] of Object.entries(SEASON_ALIASES)) {
      const [word = "", family = ""] = alias.split("-");
      expect(slug.endsWith(`-${family}`), alias).toBe(true);
      expect(secondName(slug), alias).toBe(`${title(word)} ${title(family)}`);
    }
    const named = SEASON_SLUGS.filter((slug) => secondName(slug));
    expect(Object.values(SEASON_ALIASES).sort()).toEqual([...named].sort());
    expect(named).toHaveLength(8);
  });

  /** {@link openspec/specs/site-structure/spec.md#requirement-the-public-routes-are-fixed} */
  it("holds exactly the public routes", () => {
    expect(ROUTES.map((r) => r.path).sort()).toEqual(
      [
        "/",
        "/seasons",
        "/seasons/[season]",
        "/how-it-works",
        "/sample-report",
        "/color-analysis-gpt-alternative",
        "/color-analysis-quiz",
        "/privacy",
        "/terms",
        "/analyze",
        "/r/[id]",
      ].sort(),
    );
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-every-page-file-is-a-mapped-route} */
  it("maps every page file, and every route has one", () => {
    const files = pageFilePaths();
    const mapped = new Set(ROUTES.map((r) => r.path));
    expect(files.filter((f) => !mapped.has(f.path)).map((f) => f.file)).toEqual([]);
    const served = new Set(files.map((f) => f.path));
    expect(ROUTES.filter((r) => !served.has(r.path)).map((r) => r.path)).toEqual([]);
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-two-indexable-pages-with-the-same-title} */
  it("gives every indexable page its own title", () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const p of pages().filter((p) => p.indexable)) {
      const other = seen.get(p.title);
      if (other) clashes.push(`${other} and ${p.path}: "${p.title}"`);
      seen.set(p.title, p.path);
    }
    expect(clashes).toEqual([]);
    expect(pages().filter((p) => p.path.startsWith("/seasons/"))).toHaveLength(12);
  });

  /** {@link openspec/specs/site-structure/spec.md#requirement-every-page-states-one-canonical-url-on-the-apex-host} */
  it("gives every page a title and a description", () => {
    for (const p of [...pages(), routeAt("/r/k7m2qx")]) {
      expect(p?.title, p?.path).toBeTruthy();
      expect(p?.description, p?.path).toBeTruthy();
      expect(p?.path, p?.path).not.toMatch(/\[/);
    }
  });
});

describe("pageMetadata", () => {
  /** {@link openspec/specs/site-structure/spec.md#scenario-a-page-served-from-another-host} */
  it("names the apex canonical whatever the host", () => {
    expect(ORIGIN).toBe("https://seasonly.me");
    expect(pageMetadata("/seasons/soft-autumn").alternates?.canonical).toBe(
      "https://seasonly.me/seasons/soft-autumn",
    );
    expect(pageMetadata("/how-it-works").alternates?.canonical).toBe(
      "https://seasonly.me/how-it-works",
    );
  });

  it("builds title and description from the route", () => {
    const meta = pageMetadata("/seasons/soft-autumn");
    expect(meta.title).toMatch(/Soft Autumn/);
    expect(meta.description).toBe(routeAt("/seasons/soft-autumn")?.description);
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-a-season-with-a-second-name} */
  it("names a season's second name in its title and description", () => {
    const meta = pageMetadata("/seasons/deep-autumn");
    expect(meta.title).toBe("Deep (Dark) Autumn color palette and colors to avoid · Seasonly");
    expect(meta.description).toContain("Deep (Dark) Autumn");
    expect(searchName("bright-winter")).toBe("Bright (Clear) Winter");
    expect(secondName("true-summer")).toBe("Cool Summer");
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-a-season-without-one} */
  it("keeps one name for a season without a second one", () => {
    expect(pageMetadata("/seasons/soft-autumn").title).toBe(
      "Soft Autumn color palette and colors to avoid · Seasonly",
    );
    for (const slug of ["light-spring", "light-summer", "soft-summer", "soft-autumn"] as const) {
      expect(secondName(slug), slug).toBeUndefined();
      expect(searchName(slug), slug).toBe(seasonName(slug));
    }
  });

  it("throws for a path outside the map", () => {
    expect(() => pageMetadata("/pricing")).toThrow(/pricing/);
  });

  /** The real route map with `/how-it-works` marked ready or not: no real stub is left. */
  const withHowItWorks = (ready: boolean) =>
    ROUTES.map((r) => (r.path === "/how-it-works" ? { ...r, ready } : r));

  /** {@link openspec/specs/site-structure/spec.md#scenario-a-stub-page} */
  it("marks a stub noindex and leaves it out of the sitemap", () => {
    const routes = withHowItWorks(false);
    expect(routeAt("/how-it-works", routes)?.ready).toBe(false);
    expect(pageMetadata("/how-it-works", routes).robots).toEqual({ index: false });
    expect(indexedUrls(routes)).not.toContain("https://seasonly.me/how-it-works");
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-a-page-marked-ready} */
  it("drops noindex and lists a route once it is marked ready", () => {
    const routes = withHowItWorks(true);
    expect(pageMetadata("/how-it-works", routes).robots).toBeUndefined();
    expect(indexedUrls(routes)).toContain("https://seasonly.me/how-it-works");
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-the-flow-page} */
  it("never indexes the flow, even when ready", () => {
    expect(pageMetadata("/analyze", allReady(ROUTES)).robots).toEqual({ index: false });
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-a-report-page} */
  it("never indexes a report, even when ready", () => {
    expect(pageMetadata("/r/k7m2qx", allReady(ROUTES)).robots).toEqual({ index: false });
    expect(indexedUrls(allReady(ROUTES)).filter((u) => /\/(r|analyze)\b/.test(u))).toEqual([]);
  });
});

describe("link previews", () => {
  const TRUE_SUMMER_ALT =
    "My color season: True Summer. " +
    `${PALETTES["true-summer"].highlights
      .slice(0, 6)
      .map((c) => c.name)
      .join(", ")}.`;

  /** {@link openspec/specs/site-structure/spec.md#scenario-a-season-pages-preview-text} */
  it("gives a season page its title, description, canonical and site name", () => {
    const meta = pageMetadata("/seasons/true-summer");
    const title = "True (Cool) Summer color palette and colors to avoid · Seasonly";
    expect(meta.openGraph).toMatchObject({
      title,
      description: meta.description,
      url: "https://seasonly.me/seasons/true-summer",
      siteName: "Seasonly",
      type: "website",
    });
    expect(meta.twitter).toMatchObject({ card: "summary", title, description: meta.description });
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-a-season-pages-preview-image} */
  it("shows a season page's own post card, sized and described", () => {
    const meta = pageMetadata("/seasons/true-summer");
    const image = {
      url: "https://seasonly.me/images/share/true-summer/post",
      width: 1080,
      height: 1080,
      alt: TRUE_SUMMER_ALT,
    };
    expect(meta.openGraph?.images).toEqual([image]);
    expect(meta.twitter?.images).toEqual([image]);
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-every-indexed-page} */
  it.each(indexedUrls())("%s has a preview with its canonical URL and an image", (address) => {
    const meta = pageMetadata(address.slice(ORIGIN.length) || "/");
    const og = meta.openGraph as Record<string, unknown> & { images: { url: string }[] };
    expect(og.title).toBe(meta.title);
    expect(og.description).toBe(meta.description);
    expect(og.url).toBe(meta.alternates?.canonical);
    expect(og.url).toBe(address);
    expect(og.images[0]?.url).toMatch(/^https:\/\/seasonly\.me\/images\/share\/[a-z-]+\/post$/);
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-a-report} */
  it.each(["/r/abc123", "/analyze"])("%s has no preview tags", (path) => {
    const meta = pageMetadata(path);
    expect(meta.openGraph).toBeUndefined();
    expect(meta.twitter).toBeUndefined();
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-another-pages-preview-image} */
  it.each(["/", "/seasons", "/how-it-works"])("%s shows Soft Autumn's post card", (path) => {
    const og = pageMetadata(path).openGraph as { images: { url: string }[] };
    expect(og.images[0]?.url).toBe("https://seasonly.me/images/share/soft-autumn/post");
  });

  /** {@link openspec/specs/site-structure/spec.md#requirement-the-home-page-names-the-site-for-search-engines} */
  it("names the site in one WebSite block", () => {
    expect(siteJsonLd()).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Seasonly",
      url: "https://seasonly.me",
    });
  });
});
