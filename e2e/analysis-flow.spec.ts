/**
 * The analysis flow on a phone viewport, with the real on-device check on a real photo. The
 * server is starved of keys (playwright.config.ts), so nothing is spent.
 *
 * @see openspec/specs/season-reveal/spec.md
 */
import path from "node:path";
import zlib from "node:zlib";

import { expect, test } from "@playwright/test";

const FACE = path.resolve(import.meta.dirname, "fixtures/face.jpg");
const FAMILIES = /^(Spring|Summer|Autumn|Winter)$/;

test.use({ viewport: { width: 390, height: 844 } });

/** A solid grey 600 × 800 PNG, so no second fixture is committed. */
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
  header.set([8, 0, 0, 0, 0], 8); // 8-bit grayscale
  const row = Buffer.alloc(w + 1, 128);
  row[0] = 0; // no filter
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * {@link openspec/specs/season-reveal/spec.md#scenario-the-e2e-path}
 * {@link openspec/specs/season-reveal/spec.md#scenario-the-e2e-run-spends-nothing}
 */
test("goes from the landing to the reveal in under 30 s, spending nothing", async ({ page }) => {
  test.setTimeout(90_000);
  const started = Date.now();
  await page.goto("/");
  await page.getByRole("link", { name: "Find my colors" }).click();
  await expect(
    page.getByRole("heading", { name: "Three things before your selfie" }),
  ).toBeVisible();
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
  const analyzed = page.waitForResponse(
    (r) => r.url().endsWith("/api/analyze") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "See my result" }).click();

  // The tripwire: a personal text or a stored report means a key leaked into the run.
  const response = await analyzed;
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { kind: string; text?: string; reportId?: unknown };
  expect(body.kind).toBe("result");
  expect(body.text).not.toBe("personal");
  expect(body.reportId).toBeNull();

  await expect(page.getByText("Your season family")).toBeVisible();
  await expect(page.locator("h1")).toHaveText(FAMILIES);
  expect(Date.now() - started).toBeLessThan(30_000);
});

/** {@link openspec/specs/capture-flow/spec.md#scenario-a-photo-with-no-face} */
test("asks for a retake of a photo with no face, sending nothing", async ({ page }) => {
  const analyze: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/analyze")) analyze.push(r.url());
  });
  await page.goto("/analyze");
  const upload = page.getByLabel("Upload a photo");
  await expect(upload).toBeEnabled();
  await upload.setInputFiles({ name: "grey.png", mimeType: "image/png", buffer: greyPng() });
  await expect(page.getByRole("heading", { name: "Let's retake this one" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("No face found")).toBeVisible();
  await expect(page.getByText("Hold the phone at eye level")).toBeVisible();
  expect(analyze).toEqual([]);
});
