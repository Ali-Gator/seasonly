## 1. Tracker

- [ ] 1.1 Add a Tracker Log line naming `t4-photo-check`. T4 is already In progress and stays so until `t4-report-text` archives. Done when the Log shows the line.

## 2. Tests first

- [ ] 2.1 Write `packages/analysis/src/photo-check/photo-check.test.ts`, citing `openspec/specs/photo-check/spec.md`. Build the synthetic photos from the `__tests__/` fixture as design.md decision 7 describes. Cover:
  - a good photo passes with all three measurements present; dark and tinted together reports `dark`;
  - no landmarks, a face under the minimum width, and a face partly out of frame each report `no-face`;
  - every passing photo in the file samples to non-null traits;
  - a darkened light-skin face is `dark`; a deep-skin face (MST 10) in good light passes;
  - warm and cool casts are `tint`;
  - collapsed eye openings: no problem and no eye white; grayscale with collapsed eyes is `filter`;
  - grayscale and magenta skin are `filter`; all 10 Monk Skin Tone colors pass. Copy the hex values from the MST source (skintone.google) and cite it in a comment;
  - the eye-opening rings on the canonical layout: each contains its iris center and lies between the brows and the cheeks, so a mis-copied index list fails;
  - a short buffer with no landmarks and 100 landmarks throw errors naming the length and the count;
  - one photo checked twice gives equal results; the buffer and landmarks are untouched.

  Done when the tests fail for the missing module.

- [ ] 2.2 In the same file, test the retake tips, citing "Each problem has its own retake tip":
  - the four bad photos report four different problems with four distinct tips;
  - each tip's title, message, tip and icon equal the strings copied from the canvas files `project/BadNoFace.dc.html`, `BadDark`, `BadTint` and `BadFilter` (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3).

  Done when the tests fail for the missing module.

## 3. Code

- [ ] 3.1 Add `packages/analysis/src/photo-check/tips.ts` with `RETAKE_TIPS` copied from the canvas (design.md, decision 6). Done when the 2.2 copy test passes.
- [ ] 3.2 Add `packages/analysis/src/photo-check/index.ts` following design.md decisions 2–5:
  - `checkPhoto` and its types;
  - the eye-opening rings, copied from `FACEMESH_RIGHT_EYE` and `FACEMESH_LEFT_EYE` at the commit `sampling/regions.ts` cites, with a citation comment;
  - the six provisional constants in one block.

  It reuses `samplePhoto`, `regionPixels`, `srgbToLab`, `robustCenter` and `MIN_REGION_PIXELS` from `../sampling/`. Done when every 2.1 test passes.

- [ ] 3.3 Re-export `./photo-check/index.ts` from `packages/analysis/src/index.ts`. Done when the architecture-boundaries tests, including "loads in plain node", pass.
- [ ] 3.4 Run `pnpm fix` then `pnpm test`. Done when both are green.
