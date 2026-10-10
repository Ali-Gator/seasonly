import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

import { indexedUrls, ROUTES, SEASON_SLUGS } from "./routes";

const FORBIDDEN = /\/(analyze|r|api)(\/|$)/;

describe("sitemap", () => {
  /** {@link openspec/specs/site-structure/spec.md#scenario-sitemap-contents} */
  it("lists exactly the ready routes", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toEqual(indexedUrls());
    expect(urls.filter((u) => FORBIDDEN.test(u))).toEqual([]);
  });

  /** {@link openspec/specs/site-structure/spec.md#requirement-the-sitemap-lists-exactly-the-indexed-pages} */
  it("lists exactly these URLs once every route is ready", () => {
    expect(indexedUrls(ROUTES.map((r) => ({ ...r, ready: true })))).toEqual([
      "https://seasonly.me",
      "https://seasonly.me/seasons",
      ...SEASON_SLUGS.map((s) => `https://seasonly.me/seasons/${s}`),
      "https://seasonly.me/how-it-works",
      "https://seasonly.me/sample-report",
      "https://seasonly.me/color-analysis-gpt-alternative",
      "https://seasonly.me/privacy",
      "https://seasonly.me/terms",
    ]);
  });
});

describe("core routes", () => {
  /** {@link openspec/specs/site-content/spec.md#scenario-the-core-routes-are-ready} */
  it("are ready, so the sitemap lists the 19 URLs", () => {
    expect(indexedUrls()).toEqual([
      "https://seasonly.me",
      "https://seasonly.me/seasons",
      ...SEASON_SLUGS.map((s) => `https://seasonly.me/seasons/${s}`),
      "https://seasonly.me/how-it-works",
      "https://seasonly.me/sample-report",
      "https://seasonly.me/color-analysis-gpt-alternative",
      "https://seasonly.me/privacy",
      "https://seasonly.me/terms",
    ]);
  });
});

describe("robots", () => {
  /** {@link openspec/specs/site-structure/spec.md#scenario-robotstxt-contents} */
  it("allows the site, blocks the API and names the apex sitemap", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: "/api/" },
      sitemap: "https://seasonly.me/sitemap.xml",
    });
  });
});

describe("report page", () => {
  /** {@link openspec/specs/site-structure/spec.md#scenario-a-report-page} */
  it("gives a report any id without throwing, and noindex", async () => {
    const { generateMetadata } = await import("@/app/(report)/r/[id]/page");
    for (const id of ["k7m2qx", "a/b", " "]) {
      const meta = await generateMetadata({ params: Promise.resolve({ id }) });
      expect(meta.robots, id).toEqual({ index: false });
      expect(String(meta.alternates?.canonical), id).not.toMatch(/\/r\/.*[/ ]/);
    }
  });
});
