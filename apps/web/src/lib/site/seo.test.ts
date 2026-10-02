import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

import { indexedUrls, ROUTES, SEASON_ALIASES, SEASON_SLUGS } from "./routes";

const FORBIDDEN = /\/(analyze|r|api)(\/|$)/;

describe("sitemap", () => {
  /** {@link openspec/specs/site-structure/spec.md#scenario-sitemap-contents} */
  it("lists exactly the ready routes", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls).toEqual(indexedUrls());
    expect(urls.filter((u) => FORBIDDEN.test(u))).toEqual([]);
  });

  /** {@link openspec/specs/site-structure/spec.md#requirement-the-sitemap-lists-exactly-the-indexed-pages} */
  it("expands the season route to all 12 slugs once ready, and nothing else", () => {
    const urls = indexedUrls(ROUTES.map((r) => ({ ...r, ready: true })));
    for (const slug of SEASON_SLUGS) expect(urls).toContain(`https://seasonly.me/seasons/${slug}`);
    expect(urls.filter((u) => u.startsWith("https://seasonly.me/seasons/"))).toHaveLength(12);
    expect(urls.every((u) => u.startsWith("https://seasonly.me"))).toBe(true);
    expect(urls.filter((u) => FORBIDDEN.test(u) || u.includes("["))).toEqual([]);
    for (const alias of Object.keys(SEASON_ALIASES)) {
      expect(urls).not.toContain(`https://seasonly.me/seasons/${alias}`);
    }
    expect(new Set(urls).size).toBe(urls.length);
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
