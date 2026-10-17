/**
 * Launch plan step 5: the fictional models for the launch videos and the Product Hunt gallery.
 *
 *   node --env-file=apps/web/.env.local scripts/marketing/faces.ts generate   (paid, about $0.03 a face)
 *   node scripts/marketing/faces.ts analyze                                   (free)
 *
 * `generate` writes `marketing/out/faces/<id>.png` through the AI Gateway, skipping faces that
 * exist. `analyze` runs each through the app's own steps as `evals/pipeline.ts` does (MediaPipe in
 * headless Chromium, the face choice, the photo check, the classifier with no quiz answers), then
 * the person segmenter on the crop as `scripts/sample-face-mask.ts` does, and writes
 * `<id>.crop.jpg`, `<id>.mask.png` and `faces.json`. So a season a video shows is the core's own
 * result for that face, never one picked by hand.
 */
import fs from "node:fs";
import { createRequire, registerHooks } from "node:module";
import path from "node:path";

import { chromium } from "@playwright/test";

// The app imports its own files without an extension, as its bundler allows; plain Node needs one.
registerHooks({
  resolve: (specifier, context, next) => {
    try {
      return next(specifier, context);
    } catch (error) {
      if (!specifier.startsWith(".")) throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});
const { pickFace } = await import("../../apps/web/src/lib/capture/faces.ts");
const { PERSON_MODEL, WASM } = await import("../../apps/web/src/lib/capture/mediapipe.ts");
const { createExtractor } = await import("../../evals/extract.ts");
const { checkPhoto, classify, PALETTES } = await import("../../packages/analysis/src/index.ts");

const ROOT = path.resolve(import.meta.dirname, "../..");
const FACES_DIR = path.join(ROOT, "marketing/out/faces");

// Each face as the photo guide asks for one: daylight from the front, no makeup, hair off the face.
const SHOT = `Plain white crew-neck t-shirt. No makeup, no jewellery, no glasses. She faces a window:
soft, even daylight falls on her face from the front. Plain light grey wall behind her. Straight
on, at eye level, relaxed neutral expression, head and shoulders, face centred in a vertical 3:4
frame, sharp focus. Unretouched smartphone selfie, not a model shoot, ordinary non-celebrity look.`;

const PEOPLE = {
  maya: "a fictional woman in her early 30s with deep brown skin, dark brown eyes and short natural black coily hair",
  elin: "a fictional woman in her mid 20s with fair cool-pink skin, light blue eyes and ash-blonde hair tied back",
  sofia:
    "a fictional woman in her early 40s with olive medium skin, brown eyes and dark brown hair tied back",
  hana: "a fictional East Asian woman in her late 20s with light neutral skin, dark brown eyes and straight black hair tied back",
  niamh:
    "a fictional woman in her early 30s with fair warm skin, many freckles, green eyes and copper-red hair tied back",
  priya:
    "a fictional South Asian woman in her mid 30s with medium-deep warm skin, dark eyes and black hair tied back",
  grace:
    "a fictional woman in her mid 50s with light-medium skin, grey-blue eyes and natural silver-grey hair in a short bob",
  lucia:
    "a fictional Latina woman in her mid 20s with medium golden skin, brown eyes and dark brown wavy hair tied back",
} as const;

interface Face {
  id: string;
  file: string;
  /** Null when the photo check turned the photo away. */
  problem: string | null;
  season: string | null;
  confidence: number | null;
  draping: { best: { name: string; hex: string }; worst: { name: string; hex: string } } | null;
}

async function generate() {
  type Result = { files: { uint8Array: Uint8Array; mediaType: string }[] } & {
    providerMetadata?: { gateway?: { cost?: string } };
  };
  const { generateText } = createRequire(path.join(ROOT, "apps/web/package.json"))("ai") as {
    generateText: (options: object) => Promise<Result>;
  };
  const providerOptions = {
    google: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "3:4" } },
  };
  let total = 0;
  for (const [id, who] of Object.entries(PEOPLE)) {
    const out = path.join(FACES_DIR, `${id}.png`);
    if (fs.existsSync(out)) continue;
    const result = await generateText({
      model: "google/gemini-2.5-flash-image",
      prompt: `Photorealistic smartphone selfie of ${who}, natural skin texture. ${SHOT}`,
      providerOptions,
    });
    const image = result.files.find((f) => f.mediaType.startsWith("image/"));
    if (!image) throw new Error(`${id}: the model returned no image`);
    fs.writeFileSync(out, image.uint8Array);
    const cost = Number(result.providerMetadata?.gateway?.cost ?? 0);
    total += cost;
    console.log(`${id}: cost $${cost.toFixed(4)}`);
  }
  console.log(`total $${total.toFixed(4)}`);
}

const BUNDLE = path.join(
  path.dirname(
    createRequire(path.join(ROOT, "apps/web/package.json")).resolve("@mediapipe/tasks-vision"),
  ),
  "vision_bundle.mjs",
);
const ORIGIN = "https://mask.local";
// sample-face-mask.ts's page, run on each crop: black with the segmenter's confidence as alpha.
const MASK_PAGE = `<!doctype html><meta charset="utf-8"><script type="module">
import { FilesetResolver, ImageSegmenter } from "/vision_bundle.mjs";
const segmenter = await ImageSegmenter.createFromOptions(await FilesetResolver.forVisionTasks(${JSON.stringify(WASM)}), {
  baseOptions: { modelAssetPath: ${JSON.stringify(PERSON_MODEL)}, delegate: "CPU" },
  runningMode: "IMAGE", outputCategoryMask: false, outputConfidenceMasks: true,
});
window.mask = async (url) => {
  const bitmap = await createImageBitmap(await (await fetch(url)).blob());
  const crop = document.createElement("canvas");
  crop.width = bitmap.width; crop.height = bitmap.height;
  crop.getContext("2d").drawImage(bitmap, 0, 0);
  const segmented = segmenter.segment(crop);
  const confidence = segmented.confidenceMasks[0].getAsFloat32Array().slice();
  segmented.close();
  const context = crop.getContext("2d");
  const image = context.createImageData(crop.width, crop.height);
  for (let i = 0; i < confidence.length; i++) image.data[i * 4 + 3] = Math.round(confidence[i] * 255);
  context.putImageData(image, 0, 0);
  const blob = await new Promise((resolve) => crop.toBlob(resolve, "image/png"));
  return [...new Uint8Array(await blob.arrayBuffer())];
};
window.ready = true;
</script>`;

async function analyze() {
  const ids = fs
    .readdirSync(FACES_DIR)
    .filter((f) => /^[a-z-]+\.(png|webp)$/.test(f))
    .map((f) => ({ id: f.replace(/\.\w+$/, ""), file: f }));
  const { extract, close } = createExtractor();
  const faces: Face[] = [];
  try {
    for (const { id, file } of ids) {
      const { crop, ...e } = await extract(path.join(FACES_DIR, file));
      const { severalFaces, landmarks } = pickFace(e.faces, e.width, e.height);
      const checked = checkPhoto({
        pixels: e.pixels,
        width: e.width,
        height: e.height,
        landmarks,
        hairMask: landmarks ? (e.hairMask ?? undefined) : undefined,
      });
      const problem = severalFaces
        ? "several-faces"
        : (checked.problem ?? (landmarks ? null : "no-face"));
      const result = problem ? null : classify({ photo: checked.traits, answers: {} });
      const season = result?.season ?? null;
      if (crop) fs.writeFileSync(path.join(FACES_DIR, `${id}.crop.jpg`), crop);
      faces.push({
        id,
        file,
        problem,
        season,
        confidence: result && result.season ? result.confidence : null,
        draping: season ? PALETTES[season].draping : null,
      });
      console.log(`${id}: ${problem ?? season}`);
    }
  } finally {
    await close();
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route(`${ORIGIN}/**`, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: MASK_PAGE });
      if (url.pathname === "/vision_bundle.mjs")
        return route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(BUNDLE) });
      if (url.pathname === "/crop")
        return route.fulfill({ body: fs.readFileSync(url.searchParams.get("path") ?? "") });
      return route.fulfill({ status: 404 });
    });
    await page.goto(`${ORIGIN}/`);
    await page.waitForFunction(() => "ready" in window, null, { timeout: 120_000 });
    for (const { id } of faces) {
      const crop = path.join(FACES_DIR, `${id}.crop.jpg`);
      if (!fs.existsSync(crop)) continue;
      const bytes = await page.evaluate(
        (url) => (window as unknown as { mask: (u: string) => Promise<number[]> }).mask(url),
        `${ORIGIN}/crop?path=${encodeURIComponent(crop)}`,
      );
      fs.writeFileSync(path.join(FACES_DIR, `${id}.mask.png`), Uint8Array.from(bytes));
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(FACES_DIR, "faces.json"), `${JSON.stringify(faces, null, 2)}\n`);
}

fs.mkdirSync(FACES_DIR, { recursive: true });
const step = process.argv[2];
if (step === "generate") await generate();
else if (step === "analyze") await analyze();
else throw new Error("usage: faces.ts generate|analyze");
