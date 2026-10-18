/**
 * The analysis flow on a phone viewport, with the real on-device check on a real photo. The
 * server is starved of keys (playwright.config.ts), so nothing is spent.
 *
 * @see openspec/specs/season-reveal/spec.md
 */
import path from "node:path";
import zlib from "node:zlib";

import { expect, type Page, test } from "@playwright/test";

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

  const answers = ["Green or olive", "Gold", "Tans easily, rarely burns", "Medium or light brown"];
  for (const [i, label] of answers.entries()) {
    await expect(page.getByText(`Question ${i + 1} of 4`)).toBeVisible();
    await page.getByText(label, { exact: true }).click();
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
  await expect(page.getByRole("heading", { name: "Let’s retake this one" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("No face found")).toBeVisible();
  await expect(page.getByText("Hold the phone at eye level")).toBeVisible();
  expect(analyze).toEqual([]);
});

/**
 * {@link openspec/specs/capture-flow/spec.md#scenario-back-inside-the-quiz}
 * {@link openspec/specs/capture-flow/spec.md#scenario-reload}
 * {@link openspec/specs/capture-flow/spec.md#scenario-a-good-photo}
 * {@link openspec/specs/capture-flow/spec.md#scenario-leaving-during-the-quiz}
 */
test("Back stays inside the flow, also after a reload", async ({ page }) => {
  test.setTimeout(90_000);
  const analyze: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/analyze")) analyze.push(r.url());
  });
  const upload = async () => {
    const input = page.getByLabel("Upload a photo");
    await expect(input).toBeEnabled();
    await input.setInputFiles(FACE);
  };
  await page.goto("/analyze");
  await upload();
  await expect(page.getByText("Question 1 of 4")).toBeVisible();
  expect(analyze).toEqual([]);
  // A tap moves on by itself.
  await page.getByText("Green or olive", { exact: true }).click();
  await expect(page.getByText("Question 2 of 4")).toBeVisible();
  await page.getByText("Gold", { exact: true }).click();
  await expect(page.getByText("Question 3 of 4")).toBeVisible();

  await page.goBack();
  await expect(page.getByText("Question 2 of 4")).toBeVisible();
  await expect(page.getByLabel("Gold")).toBeChecked();
  expect(new URL(page.url()).pathname).toBe("/analyze");

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Three things before your selfie" }),
  ).toBeVisible();
  await upload();
  await expect(page.getByText("Question 1 of 4")).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Three things before your selfie" }),
  ).toBeVisible();
  expect(analyze).toEqual([]);
  // The entries before the reload belong to the earlier visit: one more Back leaves the flow.
  await page.goBack();
  await expect(page).not.toHaveURL(/\/analyze/);
});

/**
 * {@link openspec/specs/capture-flow/spec.md#scenario-opening-on-the-camera}
 * {@link openspec/specs/capture-flow/spec.md#scenario-back-from-the-camera}
 * {@link openspec/specs/capture-flow/spec.md#scenario-reload-after-opening-on-the-camera}
 */
test("the landing's Take a selfie opens the camera, Back returns to the landing", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // Set when the guide's heading ever enters the page, so a guide painted for one frame fails.
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.body?.textContent?.includes("Three things before your selfie"))
        (window as { sawGuide?: boolean }).sawGuide = true;
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });
  await page.goto("/");
  const landing = await page.locator("h1").textContent();
  await page.getByRole("link", { name: "Take a selfie", exact: true }).click();
  // CI's browser has no camera, so the capture step shows its blocked caption.
  await expect(page.getByRole("heading", { name: "Take your selfie" })).toBeAttached();
  await expect(page).toHaveURL(/\/analyze$/);
  expect(await page.evaluate(() => (window as { sawGuide?: boolean }).sawGuide ?? false)).toBe(
    false,
  );
  await expect(page.getByText("Only a crop of your face is sent")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("h1")).toHaveText(landing ?? "");

  await page.getByRole("link", { name: "Take a selfie", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Take your selfie" })).toBeAttached();
  // The router keeps the stripped address: going on into the quiz brings no parameter back.
  const upload = page.getByLabel("Upload a photo instead");
  await expect(upload).toBeEnabled();
  await upload.setInputFiles(FACE);
  await expect(page.getByText("Question 1 of 4")).toBeVisible({ timeout: 30_000 });
  expect(new URL(page.url()).search).toBe("");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Three things before your selfie" }),
  ).toBeVisible();
});

/** {@link openspec/specs/capture-flow/spec.md#scenario-opening-on-the-camera} */
test("a fresh load of the camera link keeps Back inside the flow, with no reload", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/analyze?start=camera");
  await expect(page.getByRole("heading", { name: "Take your selfie" })).toBeAttached();
  await expect(page).toHaveURL(/\/analyze$/);
  // Gone after a reload, so a Back that reloads the page fails below.
  await page.evaluate(() => ((window as { loaded?: boolean }).loaded = true));
  const upload = page.getByLabel("Upload a photo instead");
  await expect(upload).toBeEnabled();
  await upload.setInputFiles(FACE);
  await expect(page.getByText("Question 1 of 4")).toBeVisible({ timeout: 30_000 });
  await page.getByText("Green or olive", { exact: true }).click();
  await expect(page.getByText("Question 2 of 4")).toBeVisible();
  // Onto an entry the flow pushed, which needs Next's keys.
  await page.goBack();
  await expect(page.getByText("Question 1 of 4")).toBeVisible();
  expect(await page.evaluate(() => (window as { loaded?: boolean }).loaded)).toBe(true);
});

/**
 * {@link openspec/specs/capture-flow/spec.md#requirement-the-photo-guide-and-capture-follow-the-canvas}
 * (scenario "The guide's example photos")
 */
test("the guide shows a loaded good photo and three bad ones on its tip card", async ({ page }) => {
  await page.goto("/analyze");
  const cards = page.locator(".sn-tip");
  await expect(cards).toHaveCount(1);
  for (const card of await cards.all()) {
    const photos = card.locator("img");
    await expect(photos).toHaveCount(4);
    for (const img of await photos.all()) {
      await expect(img).toHaveAttribute("alt", /\w/);
      await expect
        .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
        .toBeGreaterThan(0);
    }
  }
  await expect(page.locator(".sn-slot__label")).toHaveCount(0);
});

/** The multipart part names of a request body, each with the first bytes of its content. */
function parts(body: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const boundary = body.subarray(0, body.indexOf("\r\n")).toString();
  let at = 0;
  while ((at = body.indexOf(boundary, at)) !== -1) {
    const start = at + boundary.length + 2;
    const headerEnd = body.indexOf("\r\n\r\n", start);
    if (headerEnd === -1) break;
    const name = /name="([^"]+)"/.exec(body.subarray(start, headerEnd).toString())?.[1];
    const next = body.indexOf(boundary, headerEnd);
    if (name) out.set(name, body.subarray(headerEnd + 4, next - 2));
    at = next;
  }
  return out;
}

/** Uploads the fixture, answers the quiz and gives the analyze request's parts, answered empty. */
async function sentParts(page: Page): Promise<Map<string, Buffer>> {
  let body: Buffer | null = null;
  await page.route("**/api/analyze", (route) => {
    body = route.request().postDataBuffer();
    return route.fulfill({ status: 500, body: "" });
  });
  await page.goto("/analyze");
  const upload = page.getByLabel("Upload a photo");
  await expect(upload).toBeEnabled();
  await upload.setInputFiles(FACE);
  await expect(page.getByText("Question 1 of 4")).toBeVisible();
  for (const label of ["Green or olive", "Gold", "Tans easily, rarely burns"])
    await page.getByText(label, { exact: true }).click();
  await page.getByText("Medium or light brown", { exact: true }).click();
  await page.getByRole("button", { name: "See my result" }).click();
  await expect.poll(() => body !== null, { timeout: 20_000 }).toBe(true);
  return parts(body ?? Buffer.alloc(0));
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** {@link openspec/specs/capture-flow/spec.md#scenario-the-crops-outline} */
test("the analyze request carries the crop's PNG outline", async ({ page }) => {
  test.setTimeout(90_000);
  const sent = await sentParts(page);
  expect([...sent.keys()]).toEqual(["answers", "traits", "crop", "mask"]);
  const mask = sent.get("mask") ?? Buffer.alloc(0);
  expect(mask.subarray(0, 8)).toEqual(PNG_SIGNATURE);
  // Decoded in the page: the crop's size, opaque on the face in the middle, clear in a top corner.
  const read = await page.evaluate(async (base64) => {
    const png = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([png], { type: "image/png" }));
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d canvas");
    context.drawImage(bitmap, 0, 0);
    const alpha = (x: number, y: number) => context.getImageData(x, y, 1, 1).data[3] ?? -1;
    const { width, height } = bitmap;
    return { width, height, middle: alpha(width >> 1, height >> 1), corner: alpha(2, 2) };
  }, mask.toString("base64"));
  const crop = await page.evaluate(
    async (base64) => {
      const bitmap = await createImageBitmap(
        new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))]),
      );
      return { width: bitmap.width, height: bitmap.height };
    },
    (sent.get("crop") ?? Buffer.alloc(0)).toString("base64"),
  );
  expect({ width: read.width, height: read.height }).toEqual(crop);
  expect(read.middle).toBeGreaterThan(200);
  expect(read.corner).toBeLessThan(50);
});

/** {@link openspec/specs/capture-flow/spec.md#scenario-no-person-segmenter} */
test("a photo still passes without the person segmenter, and no outline is sent", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.route("**/selfie_segmenter*", (route) => route.abort());
  const sent = await sentParts(page);
  expect([...sent.keys()]).toEqual(["answers", "traits", "crop"]);
});
