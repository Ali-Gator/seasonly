/**
 * From the reveal to the report, on a phone viewport. CI has no database or email provider, so
 * the analyze and email routes are answered by `page.route`, and the report id is one the page
 * refuses before reading the database: the step lands on its 404.
 *
 * @see openspec/specs/email-capture/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

const FACE = path.resolve(import.meta.dirname, "fixtures/face.jpg");
const GOLDEN = path.resolve(import.meta.dirname, "fixtures/share-soft-autumn-story.png");
/** Malformed on purpose: /r/<it> answers 404 without a database request. */
const ID = "e2e-report";

test.use({ viewport: { width: 390, height: 844 } });

/** Guide, upload, consent and quiz, with the analyze route answered here. Gives its call count. */
async function toReveal(page: Page, reportId: string | null) {
  const calls = { analyze: 0 };
  await page.route("**/api/analyze", (route) => {
    calls.analyze++;
    return route.fulfill({
      json: {
        kind: "result",
        reportId,
        season: "soft-autumn",
        agreement: "agree",
        confidence: 0.6,
        photo: "ok",
        text: "personal",
      },
    });
  });
  await page.goto("/analyze");
  const upload = page.getByLabel("Upload a photo");
  await expect(upload).toBeEnabled();
  await upload.setInputFiles(FACE);
  await page.getByRole("button", { name: "Agree and upload" }).click();
  const answers = ["Green or olive", "Gold", "Tans easily, rarely burns", "Medium or light brown"];
  for (const [i, label] of answers.entries()) {
    await expect(page.getByText(`Question ${i + 1} of 4`)).toBeVisible();
    await page.getByText(label, { exact: true }).click();
    if (i < 3) await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page.getByRole("button", { name: "See my result" }).click();
  await expect(page.getByText("Your season family")).toBeVisible();
  return calls;
}

/**
 * {@link openspec/specs/email-capture/spec.md#scenario-a-photo-result}
 * {@link openspec/specs/email-capture/spec.md#scenario-back-from-the-email-step}
 * {@link openspec/specs/email-capture/spec.md#scenario-a-typo}
 * {@link openspec/specs/email-capture/spec.md#scenario-a-valid-address}
 */
test("takes an address from the reveal and opens the report", async ({ page }) => {
  test.setTimeout(90_000);
  const sent: unknown[] = [];
  await page.route("**/api/reports/*/email", (route) => {
    sent.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true } });
  });
  await toReveal(page, ID);

  await page.getByRole("button", { name: "Get my full report" }).click();
  await expect(page.getByRole("heading", { name: "Get your full report" })).toBeVisible();
  await expect(page.getByText("Autumn · your full report")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/analyze");

  await page.goBack();
  await expect(page.getByRole("button", { name: "Get my full report" })).toBeVisible();
  await page.getByRole("button", { name: "Get my full report" }).click();

  const field = page.getByLabel("Where should we send your report?");
  await field.fill("maya.reyes@gmail");
  await page.getByRole("button", { name: "Send my report" }).click();
  await expect(page.getByText("Enter an email like you@example.com")).toBeVisible();
  expect(sent).toEqual([]);

  await field.fill(" Maya.Reyes@Gmail.com ");
  await page.getByRole("button", { name: "Send my report" }).click();
  await page.waitForURL(`**/r/${ID}`);
  expect(sent).toEqual([{ email: "maya.reyes@gmail.com" }]);
  await expect(page.getByRole("heading", { name: "This page doesn't exist" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
});

/**
 * {@link openspec/specs/season-reveal/spec.md#scenario-the-save-failed}
 * {@link openspec/specs/season-reveal/spec.md#scenario-trying-again}
 */
test("offers Try again on a result that was not saved", async ({ page }) => {
  test.setTimeout(90_000);
  const calls = await toReveal(page, null);
  await expect(page.getByText("We couldn't save your report")).toBeVisible();
  await expect(page.getByRole("button", { name: "Get my full report" })).toHaveCount(0);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Your season family")).toBeVisible();
  expect(calls.analyze).toBe(2);
});

/** {@link openspec/specs/report-page/spec.md#scenario-the-database-is-down} */
test("answers a report it cannot read with 500 and the reload page", async ({ page }) => {
  const res = await page.goto("/r/AAAAAAAAAAAAAAAAAAAAAA");
  expect(res?.status()).toBe(500);
  await expect(page.getByRole("heading", { name: "We couldn't open your report" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload" })).toBeVisible();
});

/**
 * BL-03: the built server's card is the golden Vitest renders, so the bundle has every font.
 *
 * {@link openspec/specs/share-card/spec.md#scenario-soft-autumns-story-card}
 */
test("serves the share card the unit test renders", async ({ request }) => {
  const res = await request.get("/images/share/soft-autumn/story");
  expect(res.status()).toBe(200);
  expect(Buffer.from(await res.body()).equals(fs.readFileSync(GOLDEN))).toBe(true);
});
