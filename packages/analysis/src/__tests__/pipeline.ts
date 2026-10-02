/**
 * One synthetic face sampled and classified. The determinism tests run it in-process and in
 * child Node processes, so it imports nothing but the core.
 */
import { classify, REGIONS, samplePhoto } from "../index.ts";
import { face478, paint, ringsOf, type RGB } from "./synthetic-face.ts";

export function analyzeFixtureFace() {
  const lm = face478();
  const skin: RGB = [214, 168, 134];
  const eyes: RGB = [92, 78, 50];
  const band = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 0.08 },
    { x: 0, y: 0.08 },
  ];
  const { pixels, hairMask } = paint(
    240,
    240,
    [128, 128, 128],
    [
      ...[REGIONS.forehead, REGIONS.rightCheek, REGIONS.leftCheek].map((r) => ({
        rings: ringsOf(r, lm),
        color: skin,
      })),
      { rings: ringsOf(REGIONS.lips, lm), color: [170, 96, 88] },
      { rings: ringsOf(REGIONS.rightIris, lm), color: eyes },
      { rings: ringsOf(REGIONS.leftIris, lm), color: eyes },
      { rings: [band], color: [96, 70, 48], hair: true },
    ],
  );
  const sample = samplePhoto({ pixels, width: 240, height: 240, landmarks: lm, hairMask });
  const result = classify({ photo: sample.traits, answers: { veins: "green", sun: "tan" } });
  return { sample, result };
}
