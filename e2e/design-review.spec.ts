/**
 * t18-design-review: what each first phone screen must hold, at 375 × 812. A stored report needs
 * the database, which E2E does not have; the sample report renders the same report sections, so it
 * stands in for the report's palette-first order.
 *
 * @see openspec/specs/site-content/spec.md
 */
import path from "node:path";
import zlib from "node:zlib";

import { expect, type Page, test } from "@playwright/test";

const FACE = path.resolve(import.meta.dirname, "fixtures/face.jpg");

test.use({ viewport: { width: 375, height: 812 } });

// ponytail: a copy of analysis-flow.spec.ts's helper; a shared e2e module once a third spec needs it.
/** A solid grey 600 × 800 PNG: the check finds no face in it. */
function greyPng(): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(zlib.crc32(body), body.length + 4);
    return out;
  };
  const [w, h] = [600, 800];
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header.set([8, 0, 0, 0, 0], 8);
  const row = Buffer.alloc(w + 1, 128);
  row[0] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const GREY = { name: "grey.png", mimeType: "image/png", buffer: greyPng() };

/** The first swatch chip of the grid with this label, fully inside the window. */
async function firstSwatchInView(page: Page, label: string) {
  const chip = page.getByRole("list", { name: label }).locator(".sn-swatch__chip").first();
  await expect(chip).toBeInViewport({ ratio: 1 });
}

/** {@link openspec/specs/capture-flow/spec.md#scenario-the-guide-fits-one-phone-screen} */
test("shows both of the guide's actions without scrolling", async ({ page }) => {
  await page.goto("/analyze");
  await expect(page.getByRole("button", { name: "Take a selfie" })).toBeInViewport({ ratio: 1 });
  await expect(page.locator("label", { hasText: "Upload a photo" })).toBeInViewport({ ratio: 1 });
});

/** {@link openspec/specs/capture-flow/spec.md#scenario-the-way-out-is-in-view} */
test("shows Continue with the quiz only without scrolling after a second failure", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/analyze");
  const upload = page.getByLabel("Upload a photo");
  await expect(upload).toBeEnabled();
  await upload.setInputFiles(GREY);
  await expect(page.getByRole("heading", { name: "Let’s retake this one" })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByLabel("Upload a different photo").setInputFiles(GREY);
  await expect(page.getByRole("heading", { name: "Let’s try once more" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: "Continue with the quiz only" })).toBeInViewport({
    ratio: 1,
  });
});

/** {@link openspec/specs/site-content/spec.md#scenario-color-in-the-first-phone-screen} */
test("shows the landing's 12-chip strip in the first screen, above Take a selfie", async ({
  page,
}) => {
  await page.goto("/");
  const strip = page.getByRole("list", { name: "Soft Autumn sample colors" });
  await expect(strip).toBeInViewport({ ratio: 1 });
  const selfie = page.getByRole("link", { name: "Take a selfie" });
  const [stripBox, selfieBox] = [await strip.boundingBox(), await selfie.boundingBox()];
  expect(stripBox?.y ?? Infinity).toBeLessThan(selfieBox?.y ?? 0);
});

/** {@link openspec/specs/site-content/spec.md#scenario-the-palette-comes-first-on-a-phone} */
test("shows a season page's first swatch in the first screen", async ({ page }) => {
  await page.goto("/seasons/soft-autumn");
  await firstSwatchInView(page, "The Soft Autumn palette");
});

/**
 * {@link openspec/specs/site-content/spec.md#scenario-the-sample-on-a-phone}
 * {@link openspec/specs/report-page/spec.md#scenario-the-palette-comes-first-on-a-phone}
 */
test("shows the sample report's first swatch in the first screen", async ({ page }) => {
  await page.goto("/sample-report");
  await firstSwatchInView(page, "Your Soft Autumn palette");
});

/** {@link openspec/specs/season-reveal/spec.md#scenario-the-route-refuses-the-request} */
test("shows the blocked screen, not Try again, when the analyze route answers 403", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.route("**/api/analyze", (route) => route.fulfill({ status: 403, body: "" }));
  await page.goto("/analyze");
  const upload = page.getByLabel("Upload a photo");
  await expect(upload).toBeEnabled();
  await upload.setInputFiles(FACE);
  for (const label of ["Green or olive", "Gold", "Tans easily, rarely burns"]) {
    const question = page.locator("main h1");
    const before = await question.textContent();
    await page.getByText(label, { exact: true }).click();
    await expect(question).not.toHaveText(before ?? "");
  }
  await page.getByText("Medium or light brown", { exact: true }).click();
  await page.getByRole("button", { name: "See my result" }).click();
  await expect(page.getByRole("heading", { name: "We couldn’t check this browser" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy the link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
});
