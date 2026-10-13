/**
 * One-off: generates the example photos (t9-site-content, design.md decision 4) through the AI
 * Gateway. One fictional base portrait, then each "bad" twin as an edit of that same image, so a
 * tip's good and bad photos show one face. A paid run: never in CI, only after the user's yes.
 *
 *   node --env-file=apps/web/.env.local scripts/generate-photos.ts <out dir> [base|lamp|makeup|filter|all|quiz] [model]
 *
 * Writes `<name>.png` to the out dir and prints each call's Gateway cost. `all` reuses an
 * existing `base.png`, so a retried edit never regenerates the base.
 *
 * `quiz` (t18-design-review, design.md decision 8) makes the quiz's example photos: one base wrist,
 * edited into three vein colours and three kinds of jewellery, and the base face from
 * `apps/web/public/images/examples/base.webp`, edited into three more natural hair colours (the
 * base's own light brown is the fourth). It reuses an existing `wrist.png` the same way.
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

const WRIST = `Photorealistic close-up smartphone photo of the inner wrist and lower forearm of a
fictional woman with warm-neutral medium-light skin, natural texture and a few freckles. Palm up,
resting on a plain light grey surface, wrist centred in a square frame. Soft, even daylight from a
window. No jewellery, no watch, no tattoos, no nail polish in view. The veins under the skin are
faintly visible. Sharp focus, unretouched.`;

const QUIZ_KEEP = `Edit this photo. Keep everything else the same: the same person, skin, freckles,
pose, framing, light and background. Change only this:`;

const QUIZ_EDITS = {
  "veins-green": [
    "wrist",
    "the veins on her inner wrist. A few natural veins now show faintly through the skin with a green to olive tint, soft and realistic, as veins look in daylight, never drawn lines.",
  ],
  "veins-blue": [
    "wrist",
    "the veins on her inner wrist. A few natural veins now show faintly through the skin with a blue to purple tint, soft and realistic, as veins look in daylight, never drawn lines.",
  ],
  "veins-mix": [
    "wrist",
    "the veins on her inner wrist. Two or three natural veins now show softly through the skin just below the wrist crease: one has a clear green tint and one a clear blue tint. Soft and realistic, as veins look in daylight, never drawn lines.",
  ],
  "jewelry-gold": [
    "wrist",
    "her jewellery. She now wears one thin polished yellow-gold chain bracelet on this wrist.",
  ],
  "jewelry-silver": [
    "wrist",
    "her jewellery. She now wears one thin polished silver chain bracelet on this wrist.",
  ],
  "jewelry-both": [
    "wrist",
    "her jewellery. She now wears two thin chain bracelets on this wrist, one yellow gold and one silver.",
  ],
  "hair-dark": [
    "face",
    "her hair colour. Her natural hair is now very dark brown, nearly black, undyed.",
  ],
  "hair-blonde": ["face", "her hair colour. Her natural hair is now golden blonde, undyed."],
  "hair-red": ["face", "her hair colour. Her natural hair is now auburn red, undyed."],
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

if (which === "quiz") {
  const wristPath = path.join(outDir, "wrist.png");
  const square = { google: { ...options.google, imageConfig: { aspectRatio: "1:1" } } };
  if (!fs.existsSync(wristPath)) {
    await save("wrist", await generateText({ model, prompt: WRIST, providerOptions: square }));
  }
  const sources = {
    wrist: { data: fs.readFileSync(wristPath), mediaType: "image/png", options: square },
    face: {
      data: fs.readFileSync(
        new URL("../apps/web/public/images/examples/base.webp", import.meta.url),
      ),
      mediaType: "image/webp",
      options,
    },
  };
  for (const [name, [from, change]] of Object.entries(QUIZ_EDITS)) {
    if (fs.existsSync(path.join(outDir, `${name}.png`))) continue;
    const source = sources[from];
    const content = [
      { type: "file", data: source.data, mediaType: source.mediaType },
      { type: "text", text: `${QUIZ_KEEP} ${change}` },
    ];
    await save(
      name,
      await generateText({
        model,
        messages: [{ role: "user", content }],
        providerOptions: source.options,
      }),
    );
  }
  process.exit(0);
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
