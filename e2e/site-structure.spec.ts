import { expect, test, type Locator, type Page } from "@playwright/test";

import { SEASON_ALIASES, SEASON_SLUGS } from "../apps/web/src/lib/site/routes";

const STATIC = [
  "/",
  "/seasons",
  ...SEASON_SLUGS.map((s) => `/seasons/${s}`),
  "/how-it-works",
  "/sample-report",
  "/color-analysis-gpt-alternative",
  "/privacy",
  "/terms",
  "/analyze",
];

const canonical = (page: Page) => page.locator('link[rel="canonical"]').getAttribute("href");

async function robotsMeta(page: Page): Promise<string> {
  const metas = await page.locator('meta[name="robots"]').all();
  return (await Promise.all(metas.map((m) => m.getAttribute("content")))).join(",");
}

test.describe("public routes", () => {
  /** {@link openspec/specs/site-structure/spec.md#scenario-each-public-route-answers} */
  for (const path of STATIC) {
    test(`${path} answers 200 with the apex canonical`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      expect(await canonical(page)).toBe(`https://seasonly.me${path === "/" ? "" : path}`);
    });
  }

  /** {@link openspec/specs/site-structure/spec.md#scenario-a-known-slug} */
  test("a season page names its season", async ({ page }) => {
    await page.goto("/seasons/soft-autumn");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Soft Autumn");
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-a-page-requested-with-a-query} */
  test("a query string is dropped from the canonical", async ({ page }) => {
    await page.goto("/how-it-works?utm_source=tiktok");
    expect(await canonical(page)).toBe("https://seasonly.me/how-it-works");
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-the-flow-page} */
  test("the flow page carries noindex", async ({ page }) => {
    await page.goto("/analyze");
    expect(await robotsMeta(page)).toContain("noindex");
  });

  // design.md decision 6: the flow header is the wordmark alone, with no nav and no footer.
  test("the flow shows only the wordmark header", async ({ page }) => {
    await page.goto("/analyze");
    await expect(page.locator("header a")).toHaveCount(1);
    await expect(page.locator('header a[href="/"]')).toHaveCount(1);
    // The step progress is a nav landmark of its own; no site nav or footer.
    await expect(page.locator('nav:not([aria-label="Progress"]), footer')).toHaveCount(0);
  });
});

test.describe("not found", () => {
  /** {@link openspec/specs/site-structure/spec.md#scenario-an-unknown-path} */
  /** {@link openspec/specs/site-structure/spec.md#scenario-an-unknown-or-wrongly-cased-slug} */
  /** {@link openspec/specs/site-structure/spec.md#scenario-a-report-id-with-no-report} */
  for (const path of ["/pricing", "/seasons/autumn", "/seasons/Soft-Autumn", "/r/unknown"]) {
    test(`${path} answers 404 with noindex and one site header`, async ({ page }) => {
      test.skip(
        path === "/seasons/Soft-Autumn" && process.platform === "darwin",
        "site-structure Edge Case: a case-insensitive disk (macOS) serves the prerendered page",
      );
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      expect(await robotsMeta(page)).toContain("noindex");
      await expect(page.locator("header")).toHaveCount(1);
      await expect(page.locator("main")).toHaveCount(1);
    });
  }
});

/** {@link openspec/specs/site-structure/spec.md#scenario-an-alternative-name} */
for (const [alias, slug] of Object.entries(SEASON_ALIASES)) {
  test(`/seasons/${alias} redirects 308 to /seasons/${slug}`, async ({ request }) => {
    const response = await request.get(`/seasons/${alias}`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toBe(`/seasons/${slug}`);
  });
}

test.describe("robots.txt and sitemap.xml", () => {
  /** {@link openspec/specs/site-structure/spec.md#scenario-robotstxt-contents} */
  test("robots.txt allows the site, blocks the API and names the sitemap", async ({ request }) => {
    const text = await (await request.get("/robots.txt")).text();
    expect(text).toMatch(/^Allow: \/$/m);
    expect(text).toMatch(/^Disallow: \/api\/$/m);
    expect(text).toMatch(/^Sitemap: https:\/\/seasonly\.me\/sitemap\.xml$/m);
    expect(text).not.toMatch(/Disallow: \/(r|analyze)/);
  });

  /** {@link openspec/specs/site-structure/spec.md#scenario-sitemap-contents} */
  test("sitemap.xml lists no flow, report or API URL", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toMatch(/seasonly\.me\/(analyze|r\/|api\/)/);
  });
});

test.describe("design tokens", () => {
  /** {@link openspec/specs/design-tokens/spec.md#scenario-a-page-loads} */
  for (const path of ["/", "/seasons/soft-autumn", "/analyze"]) {
    test(`${path} self-hosts its fonts and paints paper on ink`, async ({ page }) => {
      const google: string[] = [];
      page.on("request", (r) => {
        if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) google.push(r.url());
      });
      await page.goto(path, { waitUntil: "networkidle" });
      expect(google).toEqual([]);
      await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 247, 247)");
      await expect(page.locator("body")).toHaveCSS("color", "rgb(26, 26, 26)");
      // The next/font families resolve first; an undefined --font-bodoni would void the whole stack.
      await expect(page.locator("body")).toHaveCSS("font-family", /Instrument Sans/);
      await expect(page.locator("h1")).toHaveCSS("font-family", /Bodoni Moda/);
    });
  }

  /** {@link openspec/specs/design-tokens/spec.md#scenario-a-kicker-on-a-page} */
  test("a kicker draws no line above its text", async ({ page }) => {
    await page.goto("/");
    const kicker = page.locator(".overline", { hasText: "Seasonal color analysis" });
    await expect(kicker).toHaveCSS("text-decoration-line", "none");
  });
});

test.describe("swatch grids on narrow phones", () => {
  /** The number of column tracks a grid lays out in. */
  const columns = (grid: Locator) =>
    grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);

  async function open(page: Page, path: string, width: number, height: number) {
    await page.setViewportSize({ width, height });
    await page.goto(path, { waitUntil: "networkidle" });
    // Names are measured in the page's own font, not the fallback.
    await page.evaluate(() => document.fonts.ready);
  }

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-4-column-grid-on-a-narrow-phone} */
  test("a 4-column grid lays out in 3 at 360 px and every name fits its cell", async ({ page }) => {
    await open(page, "/seasons/light-spring", 360, 800);
    const grid = page.getByRole("list", { name: "The Light Spring palette" });
    const names = grid.locator(".sn-swatch__name");
    await expect(names).toHaveCount(24);
    await expect(names.filter({ hasText: /^Watermelon$/ })).toHaveCount(1);
    expect.soft(await columns(grid)).toBe(3);
    const overflowing = await names.evaluateAll((els) =>
      els.filter((el) => el.scrollWidth > el.clientWidth).map((el) => el.textContent),
    );
    expect(overflowing).toEqual([]);
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-4-column-grid-at-375-px} */
  test("a 4-column grid keeps 4 columns at 375 px", async ({ page }) => {
    await open(page, "/seasons/light-spring", 375, 812);
    expect(await columns(page.getByRole("list", { name: "The Light Spring palette" }))).toBe(4);
  });

  /** {@link openspec/specs/ui-components/spec.md#scenario-a-season-preview-on-a-narrow-phone} */
  test("every season preview keeps 4 columns at 360 px", async ({ page }) => {
    await open(page, "/seasons", 360, 800);
    const previews = await page.getByRole("list", { name: / colors$/ }).all();
    expect(previews.length).toBeGreaterThan(0);
    for (const preview of previews) expect(await columns(preview)).toBe(4);
  });
});
