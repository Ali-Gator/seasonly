/**
 * The sample report sends nothing: no API request and none of the funnel's custom events, while
 * PostHog's own page view still arrives, so the check is not passing on a silent PostHog.
 *
 * @see openspec/specs/site-content/spec.md
 */
import { expect, test } from "@playwright/test";

import { posingAsAPhone, recordPostHog } from "./posthog";

const CUSTOM = [
  "quiz_completed",
  "analysis_failed",
  "report_requested",
  "email_submitted",
  "share_tapped",
  "share_card_downloaded",
  "palette_saved",
  "premium_tapped",
];

test.use({ viewport: { width: 390, height: 844 } });
posingAsAPhone();

/** {@link openspec/specs/site-content/spec.md#scenario-nothing-is-sent} */
test("the sample report makes no API request and sends no funnel event", async ({ page }) => {
  const { events, errors } = await recordPostHog(page);
  const api: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) api.push(r.url());
  });

  await page.goto("/sample-report");
  await expect(page.getByText("This is a sample Soft Autumn report")).toBeVisible();
  for (let y = 0; y < 12; y++) await page.mouse.wheel(0, 900);
  await expect(page.getByText("Seasons describe colors, not people.")).toBeInViewport();

  // Leaving for the landing queues its page view after anything the sample page sent.
  await page.getByRole("link", { name: "Seasonly" }).first().click();
  const pageviews = () =>
    events.filter((e) => e.event === "$pageview").map((e) => String(e.properties.$pathname));
  await expect.poll(pageviews, { timeout: 20_000 }).toEqual(["/sample-report", "/"]);
  expect(events.map((e) => e.event).filter((e) => CUSTOM.includes(e))).toEqual([]);
  expect(api).toEqual([]);
  expect(errors).toEqual([]);
});

/** {@link openspec/specs/site-content/spec.md#scenario-the-sample-draping-pair} */
test("the sample face is cut out with its static outline at 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const api: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) api.push(r.url());
  });
  await page.goto("/sample-report");
  const face = page.locator(".sn-drape__face img").first();
  await face.scrollIntoViewIfNeeded();
  await expect(face).toBeVisible();
  const mask = await face.evaluate((img) => {
    const style = getComputedStyle(img);
    return style.maskImage || style.webkitMaskImage;
  });
  expect(mask).toContain("/images/examples/face-mask.png");
  expect(api).toEqual([]);
});
