## Why

The Phase 1 table gives `t3-design-tokens` two capabilities, `design-tokens` and `ui-components`, and the exit check "tokens match the approved design system; swatch shows name and hex". `design-tokens` already shipped with `t14-site-structure`. Its `tokens.json` is still byte-identical to the design system's (checked 2026-10-02). `ui-components` was never built. The web app has no Swatch, SwatchGrid, Note, Icon or Button component, only the `.sn-btn` classes the site chrome uses. `t5-analysis-flow`, `t5-report-images` and `t5-report-delivery` all start after this change and all build on these components, so they are blocked until it lands.

Design gate: the Seasonly design system (https://claude.ai/artifact/E11hciU9VsyCxTFnJJNbHD) and the MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) are both approved (Tracker T3 and T2, Done). The canvas's board "11 Share cards" (`project/Share.dc.html`) has a 9:16 story (1080 × 1920), a 1:1 post (1080 × 1080) and both at thumbnail size. The design system's ShareCard README documents both ratios, so the share card's design input for `t5-report-images` is complete.

## What Changes

- Port six design-system components to React in `apps/web`: `Button`, `Icon`, `Swatch`, `SwatchGrid`, `Note` and `ReportSection`. Each keeps the design system's props, markup, class names and accessibility. This is the set the canvas uses across more than one Phase 1 change: Button appears on 26 artboards, Icon on 18, SwatchGrid on 9, Note on 13 and ReportSection on 4. Swatch is what SwatchGrid renders.
- Port their CSS from the design system's `bundle.css`, plus the layout classes artboards use directly (`.sn-card`, `.sn-stack`, `.sn-slot`). The CSS uses the `globals.css` variables and makes no font request.
- Swatches take the analysis core's `Swatch` type (`{ name, hex }`), so a `PALETTES` entry renders without mapping.
- Assumption: the components with one consumer stay with that consumer, so parallel `t5-*` sessions do not share a capability:
  - `t5-analysis-flow`: StepProgress, QuizOption, CameraFrame, PhotoTipCard;
  - `t5-report-images`: ShareCard, DrapingPair (its exit check is the PNG render, which may not use DOM components at all);
  - `t5-report-delivery`: EmailInput, SeasonBadge;
  - `t7`: Teaser.
- `Wordmark` already exists in `site-chrome.tsx` and is not ported again.

## Capabilities

### New Capabilities

- `ui-components`: the shared design-system components in the web app, with each prop, markup and accessibility rule the design system gives them

### Modified Capabilities

None. `design-tokens` requirements are unchanged. The new CSS lives in its own stylesheet, so `globals.css` changes by only one `@import` line, and the design-tokens test still passes unchanged.

## Impact

- New code under `apps/web/src/components/ds/`: one file per component, an `index.ts`, `ds.css` and a test. This directory is not spec-exempt (unlike `components/ui/**`), so it gets a README row `apps/web/src/components/ds/**` at archive.
- `apps/web/src/app/globals.css` gains one `@import` of `ds.css`, into the components layer.
- No new dependency. Tests render with `react-dom/server` in the existing node Vitest environment.
- Downstream: `t5-analysis-flow`, `t5-report-images` and `t5-report-delivery` import from `@/components/ds`. The Tracker's "t3-design-tokens starts after" gate is met when this change archives.
