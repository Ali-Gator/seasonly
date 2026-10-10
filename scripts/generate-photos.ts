/**
 * One-off: generates the example photos (t9-site-content, design.md decision 4) through the AI
 * Gateway. One fictional base portrait, then each "bad" twin as an edit of that same image, so a
 * tip's good and bad photos show one face. A paid run: never in CI, only after the user's yes.
 *
 *   node --env-file=apps/web/.env.local scripts/generate-photos.ts <out dir> [base|lamp|makeup|filter|all] [model]
 *
 * Writes `<name>.png` to the out dir and prints each call's Gateway cost. `all` reuses an
 * existing `base.png`, so a retried edit never regenerates the base.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

type File = { uint8Array: Uint8Array; mediaType: string };
type Result = { files: File[]; providerMetadata?: { gateway?: { cost?: string } } };
const { generateText } = createRequire(new URL("../apps/web/package.json", import.meta.url))(
  "ai",
) as { generateText: (options: object) => Promise<Result> };

const BASE = `Photorealistic smartphone selfie of a fictional woman in her late 20s with an ordinary,
non-celebrity look. Warm-neutral medium-light skin with natural texture and a few freckles, hazel
eyes, soft light-brown hair pulled straight back off her face. No makeup, no jewellery, no glasses.
Plain white crew-neck t-shirt. She faces a window: soft, even daylight falls on her face from the
front. Plain light grey wall behind her. Straight on, at eye level, relaxed neutral expression, head
and shoulders, face centred in a vertical 3:4 frame, sharp focus. Unretouched, not a model shoot.`;

const KEEP = `Edit this photo. Keep the same woman: the same face, features, skin, eyes, hair, pose,
framing, background and t-shirt. Change only this:`;

const EDITS = {
  lamp: `the light. It is evening indoors and the only light is one warm yellow ceiling lamp
directly above her. Her skin and hair take an orange-yellow cast, with hard shadows under her brows,
nose and chin. The wall behind her is dim.`,
  makeup: `her makeup. She now wears full-coverage foundation a shade too dark and warm for her,
heavy bronzer and contour blended over her cheeks, temples and jaw, and a soft rosy blush, so her
own skin tone no longer shows. Natural, well-blended makeup, no patches. The daylight stays the
same.`,
  filter: `the processing. The photo now looks run through a strong beauty-filter app, obviously
so: airbrushed, poreless, doll-like plastic skin with every freckle gone, a strong pink-peach colour
cast on her skin, a whitened and brightened complexion, glossy pink lips, noticeably enlarged eyes,
a slimmer V-shaped jaw and a dreamy soft glow over the whole picture.`,
} as const;

const [outDir = "", which = "all", model = "google/gemini-2.5-flash-image"] = process.argv.slice(2);
if (!outDir) throw new Error("usage: generate-photos.ts <out dir> [step] [model]");
fs.mkdirSync(outDir, { recursive: true });
const basePath = path.join(outDir, "base.png");
const options = { google: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "3:4" } } };

async function save(name: string, result: Result) {
  const image = result.files.find((f) => f.mediaType.startsWith("image/"));
  if (!image) throw new Error(`${name}: the model returned no image`);
  fs.writeFileSync(path.join(outDir, `${name}.png`), image.uint8Array);
  console.log(
    `${name}: ${image.mediaType}, cost $${result.providerMetadata?.gateway?.cost ?? "?"}`,
  );
}

if (which === "base" || (which === "all" && !fs.existsSync(basePath))) {
  await save("base", await generateText({ model, prompt: BASE, providerOptions: options }));
}
for (const [name, change] of Object.entries(EDITS)) {
  if (which !== "all" && which !== name) continue;
  const content = [
    { type: "file", data: fs.readFileSync(basePath), mediaType: "image/png" },
    { type: "text", text: `${KEEP} ${change}` },
  ];
  await save(
    name,
    await generateText({ model, messages: [{ role: "user", content }], providerOptions: options }),
  );
}
