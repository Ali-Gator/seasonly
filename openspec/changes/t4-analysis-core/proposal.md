## Why

The analysis core is still a placeholder (`ANALYSIS_CORE_VERSION = "0.0.0"`). Nothing turns a selfie or quiz answers into a season, and only Soft Autumn has a palette (on the canvas). Every later Phase 1 change depends on this one: the flow (`t5-analysis-flow`), the report text and images (`t4-report-text`, `t5-report-images`), the photo check (`t4-photo-check`), the eval set (`t6-eval-set`) and the Phase 2 plugin. The concept's first acceptance line is also met here: the same photo gives the same season every time.

## What Changes

- Color sampling: from raw RGBA pixels, MediaPipe face-mesh landmarks and an optional hair mask, the core measures skin (cheeks, forehead), eyes, lips and hair in CIELAB. It reduces them to three numbers: temperature (warm to cool), value (light to deep) and clarity (soft to bright). Highlights and shadows are trimmed, and a face too small to sample gives no traits instead of a guess.
- Season classifier: photo traits and the four quiz answers from the approved canvas (veins, jewelry, sun, natural hair) map to one of the 12 seasons. Each result carries a confidence, the runner-up season, and whether photo and quiz agree. Quiz answers move borderline photos. The quiz alone also classifies, at lower confidence. That covers "no usable photo" and the quiz-only plugin. The same input gives the same result on every run.
- Season palettes: one palette per fixed season slug. Each has 24 best colors and 6 neutrals (the "30 colors" the approved copy promises), colors to avoid, metals to wear and to go easy on, lip, blush, eye and hair swatches, and a best/worst draping pair, all with names and hex. Soft Autumn is the approved canvas data. The other 11 are drafted here and approved by you before any palette code is written.
- One season list. The core owns the 12 slugs and their families. `apps/web`'s route map and the eval manifest import them instead of keeping copies. This fixes `evals/manifest.ts`, which still uses the retired `warm-*` / `clear-*` / `cool-*` names.
- `zod` becomes the core's one runtime dependency, used to validate quiz answers that arrive from a client.

## Capabilities

### New Capabilities

- `color-sampling`: measuring skin, eye, lip and hair color from pixels and face landmarks, and reducing them to temperature, value and clarity traits
- `season-classifier`: mapping photo traits and quiz answers to one of the 12 seasons, with confidence, runner-up and photo/quiz agreement, deterministically
- `season-palettes`: the 12 season ids and families, and each season's palette (best, avoid, neutrals, metals, makeup and hair swatches, draping pair)

### Modified Capabilities

None. `site-structure` keeps its 12 slugs. Its route map imports them from the core, which is an implementation change only.

## Impact

- New code under `packages/analysis/src/sampling/`, `src/classifier/` and `src/palettes/`, re-exported from `src/index.ts`. The placeholder constant goes away.
- `packages/analysis/package.json` gains `zod`. `architecture-boundaries` already allows it.
- `apps/web/src/lib/site/routes.ts` takes `SEASON_SLUGS` and `SeasonSlug` from `@seasonly/analysis` and keeps its season summaries as page copy. `evals/manifest.ts` takes the slugs from the core.
- Downstream: `t5-analysis-flow` runs MediaPipe in the browser and passes landmarks and the hair mask in. `t4-photo-check` rejects bad photos before sampling. `t4-report-text` writes the prose. `t6-eval-set` tunes this change's provisional thresholds against labeled photos.
- Season palettes on the canvas other than Soft Autumn stay provisional until this change's palette data is approved.
- Out of scope: photo quality checks (`t4-photo-check`), report prose and the vision call (`t4-report-text`), white-balance correction, accuracy targets (`t6-eval-set`).
