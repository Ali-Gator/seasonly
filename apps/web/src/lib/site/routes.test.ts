import fs from "node:fs";
import path from "node:path";

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

  /** {@link openspec/specs/site-structure/spec.md#requirement-alternative-season-names-redirect-to-the-fixed-slug} */
  it("maps the six alternative names to fixed slugs", () => {
    expect(SEASON_ALIASES).toEqual({
      "warm-spring": "true-spring",
      "clear-spring": "bright-spring",
      "cool-summer": "true-summer",
      "warm-autumn": "true-autumn",
      "cool-winter": "true-winter",
      "clear-winter": "bright-winter",
    });
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

  it("throws for a path outside the map", () => {
    expect(() => pageMetadata("/pricing")).toThrow(/pricing/);
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-a-stub-page} */
  it("marks a stub noindex and leaves it out of the sitemap", () => {
    expect(routeAt("/terms")?.ready).toBe(false);
    expect(pageMetadata("/terms").robots).toEqual({ index: false });
    expect(indexedUrls()).not.toContain("https://seasonly.me/terms");
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-a-page-marked-ready} */
  it("drops noindex and lists a route once it is marked ready", () => {
    const routes = ROUTES.map((r) => (r.path === "/terms" ? { ...r, ready: true } : r));
    expect(pageMetadata("/terms", routes).robots).toBeUndefined();
    expect(indexedUrls(routes)).toContain("https://seasonly.me/terms");
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
