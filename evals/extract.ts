/**
 * The eval's browser stage: MediaPipe in headless Chromium, as the web app runs it. The page
 * imports the installed `vision_bundle.mjs`, and loads the wasm and models from the app's own
 * URLs; each photo is decoded with EXIF orientation and scaled to the app's limit, then up to two
 * faces are detected and the hair segmented. Only this page script repeats the app's browser glue.
 *
 * {@link openspec/specs/analysis-eval/spec.md#requirement-each-photo-goes-through-the-web-apps-own-steps}
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { type Browser, chromium, type Page } from "@playwright/test";

import { cropBox, type Landmarks, landmarkBox } from "../apps/web/src/lib/capture/faces.ts";
import {
  FACE_MODEL,
  HAIR_MODEL,
  MEDIAPIPE_VERSION,
  WASM,
} from "../apps/web/src/lib/capture/mediapipe.ts";
import { MAX_SIDE } from "../apps/web/src/lib/capture/photo.ts";
import { sha256 } from "./fetch.ts";
import type { Extraction, Extractor } from "./pipeline.ts";

/** A made-up origin, served by `page.route`, so the page can import an ES module. */
const ORIGIN = "https://eval.local";

const BUNDLE = path.join(
  path.dirname(
    createRequire(path.join(import.meta.dirname, "../apps/web/package.json")).resolve(
      "@mediapipe/tasks-vision",
    ),
  ),
  "vision_bundle.mjs",
);

// The app's loadVision (mediapipe.ts) and checkImage (photo.ts) steps, as a page script.
const PAGE = `<!doctype html><meta charset="utf-8"><script type="module">
import { FaceLandmarker, FilesetResolver, ImageSegmenter } from "/vision_bundle.mjs";
const { WASM, FACE_MODEL, HAIR_MODEL, MAX_SIDE } = ${JSON.stringify({ WASM, FACE_MODEL, HAIR_MODEL, MAX_SIDE })};
const fileset = await FilesetResolver.forVisionTasks(WASM);
const [landmarker, segmenter] = await Promise.all([
  FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: FACE_MODEL, delegate: "CPU" },
    runningMode: "IMAGE",
    numFaces: 2,
  }),
  ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: HAIR_MODEL, delegate: "CPU" },
    runningMode: "IMAGE",
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  }),
]);
const base64 = (bytes) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.slice(reader.result.indexOf(",") + 1));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(new Blob([bytes]));
});
let canvas;
window.extract = async (url) => {
  const bitmap = await createImageBitmap(await (await fetch(url)).blob());
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const faces = landmarker.detect(canvas).faceLandmarks.map((f) => f.map(({ x, y }) => ({ x, y })));
  let hairMask = null;
  if (faces.length) {
    const segmented = segmenter.segment(canvas);
    const mask = segmented.categoryMask;
    if (mask?.width === width && mask.height === height) hairMask = await base64(mask.getAsUint8Array().slice());
    segmented.close();
  }
  const pixels = await base64(context.getImageData(0, 0, width, height).data);
  return { width, height, faces, pixels, hairMask };
};
window.crop = async (box) => {
  const out = document.createElement("canvas");
  out.width = box.outWidth;
  out.height = box.outHeight;
  out.getContext("2d").drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, box.outWidth, box.outHeight);
  const blob = await new Promise((resolve) => out.toBlob(resolve, "image/jpeg", 0.85));
  return base64(new Uint8Array(await blob.arrayBuffer()));
};
window.ready = true;
</script>`;

/**
 * Names this extractor in the cache key: the MediaPipe version, then a hash of this file and the
 * app's scaling and model constants, so a change to any of them re-extracts every photo.
 */
export const EXTRACTOR_VERSION = `${MEDIAPIPE_VERSION}-${sha256(
  new TextEncoder().encode(
    fs.readFileSync(import.meta.filename, "utf8") +
      JSON.stringify({ WASM, FACE_MODEL, HAIR_MODEL, MAX_SIDE }),
  ),
).slice(0, 12)}`;

interface PageExtraction {
  width: number;
  height: number;
  faces: Landmarks[];
  pixels: string;
  hairMask: string | null;
}

async function openPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  page.on("pageerror", (error) => console.error("eval page:", error.message));
  await page.route(`${ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: PAGE });
    if (url.pathname === "/vision_bundle.mjs")
      return route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(BUNDLE) });
    if (url.pathname === "/photo")
      return route.fulfill({ body: fs.readFileSync(url.searchParams.get("path") ?? "") });
    return route.fulfill({ status: 404 });
  });
  await page.goto(`${ORIGIN}/`);
  // The models download on the first page; later runs are cached by the photo hash instead.
  await page.waitForFunction(() => "ready" in window, null, { timeout: 180_000 });
  return page;
}

/** An extractor that starts Chromium on its first photo. `close` is a no-op if it never did. */
export function createExtractor(): { extract: Extractor; close: () => Promise<void> } {
  let browser: Browser | undefined;
  let page: Promise<Page> | undefined;
  const extract: Extractor = async (file) => {
    page ??= chromium.launch().then((b) => openPage((browser = b)));
    const p = await page;
    const raw = await p.evaluate(
      (url) =>
        (window as unknown as { extract: (u: string) => Promise<PageExtraction> }).extract(url),
      `${ORIGIN}/photo?path=${encodeURIComponent(file)}`,
    );
    const extraction: Extraction = {
      width: raw.width,
      height: raw.height,
      faces: raw.faces,
      pixels: new Uint8ClampedArray(Buffer.from(raw.pixels, "base64")),
      hairMask: raw.hairMask === null ? null : new Uint8Array(Buffer.from(raw.hairMask, "base64")),
    };
    // The largest face, as pickFace chooses it, cropped as checkImage crops it.
    const largest = [...raw.faces]
      .map((lm) => landmarkBox(lm, raw.width, raw.height))
      .sort((a, b) => b.width - a.width)[0];
    if (!largest) return { ...extraction, crop: null };
    const box = cropBox(largest, raw.width, raw.height);
    const crop = await p.evaluate(
      (b) => (window as unknown as { crop: (box: unknown) => Promise<string> }).crop(b),
      box,
    );
    return { ...extraction, crop: new Uint8Array(Buffer.from(crop, "base64")) };
  };
  return { extract, close: async () => void (await browser?.close()) };
}
