## 1. Tracker

- [x] 1.1 Set Tracker row T4 to In progress and add a Log line naming `t4-analysis-core`. T4 stays In progress after this change, because `t4-photo-check` and `t4-report-text` are also T4. Done when the Tracker tab shows both.

## 2. Palette drafts (no code)

- [x] 2.1 Draft the palettes of the 11 seasons other than Soft Autumn (design.md, decision 10). Use Soft Autumn's section sizes: 24 best, 6 avoid, 6 neutrals, 4 metals to wear and 2 to go easy on, 3 swatches each for lips, blush, eyes and hair, and a draping pair. Publish all 12, with Soft Autumn as the reference, as one private swatch page (Artifact) with names and hex. Done when the page is published and its link is in chat.
- [x] 2.2 User: approve the drafted palettes, or ask for changes and repeat 2.1. **Gate:** task 4.3 does not start before this one is checked.

## 3. Tests first

- [x] 3.1 Add `zod` to `packages/analysis/package.json` and run `pnpm install`. Done when `pnpm test:unit` still passes, including the architecture-boundaries "depends on nothing but zod" test.
- [x] 3.2 Write `packages/analysis/src/palettes/palettes.test.ts`, citing `openspec/specs/season-palettes/spec.md`. Cover:
  - the 12 ids in family order and `seasonFamily`;
  - for every season, section counts, uppercase `#RRGGBB` hex, unique names per section, draping pair membership, and no hex in both avoid and best/neutrals;
  - Soft Autumn equal to the canvas report data, copied from `project/Report.dc.html`.

  Done when the tests fail for the missing module.

- [x] 3.3 Write `scripts/__tests__/season-list.test.ts`, citing the season-palettes scenarios "The web route map" and "The eval manifest". It asserts that `routes.ts`'s `SEASON_SLUGS` equals the core's in order, and that `manifestProblems` rejects a `warm-autumn` label. It is a new file, so no existing test is edited. Done when it fails against the current code.
- [x] 3.4 Add the synthetic-face fixture under `packages/analysis/src/__tests__/`:
  - 468 landmarks from MediaPipe's canonical face model UV coordinates, copied from its `canonical_face_model.obj` into a `.ts` literal (the core's tsconfig and lint scope cover this folder, so no `fs` and no JSON import), plus 10 iris points synthesized around each eye's center;
  - a painter that takes polygons as a parameter (it cannot import `sampling/regions.ts`, which 4.2 adds) and fills each with a given flat color on an RGBA buffer, with an optional hair mask.

  It must run in plain Node with no imports beyond the core. Done when a smoke test paints a face and reads back the painted pixels.

- [x] 3.5 Write `packages/analysis/src/sampling/sampling.test.ts`, citing `openspec/specs/color-sampling/spec.md`. Cover:
  - painted regions read back within ΔE 2;
  - no hair mask means no hair; 468 versus 478 landmarks;
  - region geometry on the canonical layout, so a mis-copied index list fails: no two regions overlap, and they run top to bottom as forehead, eyes, cheeks, lips;
  - 10% highlights and 10% shadows move the color by less than ΔE 1;
  - monotonic temperature, value and clarity; traits in range with 3 decimals, including black, white and primaries;
  - a tiny face gives no traits;
  - the three refusal cases and clipping at the frame edge;
  - input untouched.

  Done when the tests fail for the missing module.

- [x] 3.6 Write `packages/analysis/src/classifier/classifier.test.ts`, citing `openspec/specs/season-classifier/spec.md`. Cover:
  - each reference point returns its season; Soft Autumn traits;
  - confidence of 1 on a point, 0 at the soft-autumn/soft-summer midpoint, and rising toward one side;
  - borderline versus clear photo with warm answers; all-`unsure` answers equal no answers;
  - the quiz-only Summer case at no more than 0.6; no result with no photo and all-`unsure` or all-neutral answers; confidence always has two decimals;
  - schema rejects `veins: "purple"` naming the field, and accepts a lone jewelry answer;
  - `differ`, `agree` for a near-neutral photo, and `photo-only`;
  - the result carries the combined traits.

  Done when the tests fail for the missing module.

- [x] 3.7 Write the determinism tests in `classifier.test.ts`, citing the scenarios "One photo analyzed twice" and "One photo analyzed in separate processes". Sample and classify one fixture face twice in-process. Then do it in two child `node` processes, as the architecture-boundaries runtime test spawns them, and compare the JSON. Done when they fail for the missing module.

## 4. Code

- [x] 4.1 Add `packages/analysis/src/palettes/seasons.ts`: `SEASON_SLUGS`, `SeasonSlug`, `Family`, `seasonFamily`. Point `apps/web/src/lib/site/routes.ts` at them, keeping its exported names and its summaries as `Record<SeasonSlug, string>` (design.md, decision 2). Point `evals/manifest.ts` at them by relative path. Switch `apps/web/src/components/site-chrome.tsx` from its `slug.endsWith(`-${family}`)` grouping to `seasonFamily`, so families have one mechanism. Done when 3.3 and the existing `routes.test.ts` and `seo.test.ts` pass unchanged, and `pnpm test:eval` passes.
- [x] 4.2 Add `packages/analysis/src/sampling/` with color conversion, region polygons and traits, following design.md decisions 3–6. Copy the landmark index lists from the MediaPipe source and cite it in a comment. Done when the 3.5 tests pass.
- [x] 4.3 Add `packages/analysis/src/palettes/data.ts` with the palettes approved in 2.2 and the canvas Soft Autumn data. Done when the 3.2 tests pass.
- [x] 4.4 Add `packages/analysis/src/classifier/` with the reference points, quiz weights, the `QuizAnswersSchema` and the classify function, following design.md decisions 7–9. Done when the 3.6 and 3.7 tests pass.
- [x] 4.5 Replace the placeholder in `packages/analysis/src/index.ts` with re-exports of the three capabilities, and drop `ANALYSIS_CORE_VERSION`. Done when the architecture-boundaries tests pass, including "loads in plain node".
- [x] 4.6 Run `pnpm fix` then `pnpm test`. Done when both are green.

## 5. Review and archive

- [x] 5.1 Run the phase review (`phase-review` skill) on the branch, then fix or answer every finding. Done when the review's findings are resolved.
- [x] 5.2 Archive the change. Then:
  - re-add Public Interface, Behavior and Edge Cases to `openspec/specs/color-sampling/spec.md`, `season-classifier/spec.md` and `season-palettes/spec.md`;
  - update `site-structure`'s Public Interface to say the slugs come from `@seasonly/analysis`;
  - add three README rows: `packages/analysis/src/sampling/**`, `packages/analysis/src/classifier/**`, `packages/analysis/src/palettes/**`.

  Done when `openspec validate --changes` passes and the unit suite (mapping-row and citation gates) is green.

- [x] 5.3 Add a Tracker Log line for the archived change, and note that canvas palettes other than Soft Autumn can now be replaced with the approved data. Done when the Log shows the line.
