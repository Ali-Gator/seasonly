/**
 * One-off: makes the sample face's outline (t19-draping-cutout, design.md decision 7) with the
 * person segmenter the phone uses, in headless Chromium, as `evals/extract.ts` runs MediaPipe.
 * `face.webp` is already a crop, so it is only scaled to the crop's 512 px limit, then segmented;
 * the outline is black with the segmenter's confidence as alpha, as `photo.ts` makes it.
 *
 *   node scripts/sample-face-mask.ts
 *
 * Writes `apps/web/public/images/examples/face-mask.png`. Free: no paid call.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { chromium } from "@playwright/test";

import { PERSON_MODEL, WASM } from "../apps/web/src/lib/capture/mediapipe.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const FACE = path.join(ROOT, "apps/web/public/images/examples/face.webp");
const OUT = path.join(ROOT, "apps/web/public/images/examples/face-mask.png");
/** The crop's longer side, as `faces.ts` caps it. */
const CROP_SIDE = 512;
const ORIGIN = "https://mask.local";
const BUNDLE = path.join(
  path.dirname(
    createRequire(path.join(ROOT, "apps/web/package.json")).resolve("@mediapipe/tasks-vision"),
  ),
  "vision_bundle.mjs",
);

const PAGE = `<!doctype html><meta charset="utf-8"><script type="module">
import { FilesetResolver, ImageSegmenter } from "/vision_bundle.mjs";
const { WASM, PERSON_MODEL, CROP_SIDE } = ${JSON.stringify({ WASM, PERSON_MODEL, CROP_SIDE })};
const segmenter = await ImageSegmenter.createFromOptions(await FilesetResolver.forVisionTasks(WASM), {
  baseOptions: { modelAssetPath: PERSON_MODEL, delegate: "CPU" },
  runningMode: "IMAGE",
  outputCategoryMask: false,
  outputConfidenceMasks: true,
});
const bitmap = await createImageBitmap(await (await fetch("/face")).blob());
const scale = Math.min(1, CROP_SIDE / Math.max(bitmap.width, bitmap.height));
const crop = document.createElement("canvas");
crop.width = Math.round(bitmap.width * scale);
crop.height = Math.round(bitmap.height * scale);
crop.getContext("2d").drawImage(bitmap, 0, 0, crop.width, crop.height);
const segmented = segmenter.segment(crop);
const confidence = segmented.confidenceMasks[0].getAsFloat32Array().slice();
segmented.close();
const out = document.createElement("canvas");
out.width = crop.width;
out.height = crop.height;
const context = out.getContext("2d");
const image = context.createImageData(out.width, out.height);
for (let i = 0; i < confidence.length; i++) image.data[i * 4 + 3] = Math.round(confidence[i] * 255);
context.putImageData(image, 0, 0);
const blob = await new Promise((resolve) => out.toBlob(resolve, "image/png"));
window.mask = [...new Uint8Array(await blob.arrayBuffer())];
</script>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => console.error("page:", error.message));
  await page.route(`${ORIGIN}/**`, async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === "/") return route.fulfill({ contentType: "text/html", body: PAGE });
    if (pathname === "/vision_bundle.mjs")
      return route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(BUNDLE) });
    if (pathname === "/face") return route.fulfill({ body: fs.readFileSync(FACE) });
    return route.fulfill({ status: 404 });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => "mask" in window, null, { timeout: 120_000 });
  const bytes = await page.evaluate(() => (window as unknown as { mask: number[] }).mask);
  fs.writeFileSync(OUT, Uint8Array.from(bytes));
  console.log(`${path.relative(ROOT, OUT)}: ${bytes.length} bytes`);
} finally {
  await browser.close();
}
