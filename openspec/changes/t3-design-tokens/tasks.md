## 1. Tracker

- [x] 1.1 Add a Tracker Log line naming `t3-design-tokens` (design-tokens shipped in t14; this change adds ui-components) and set T3 to In progress until it archives, as T4 stays In progress while its code changes are open. Done when the Log shows the line.

## 2. Tests first (cite `openspec/specs/ui-components/spec.md`)

- [ ] 2.1 Write `apps/web/src/components/ds/ds.test.tsx`. Render with `renderToStaticMarkup` (design.md, decision 4) and cover every scenario in `specs/ui-components/spec.md`:
  - **Swatch:** lowercase hex shown uppercase; name and hex are text; the chip is `aria-hidden` and has the color as its background; the large variant.
  - **SwatchGrid:** `PALETTES["soft-autumn"].best` gives one labeled list of 24 items in order; the default is 4 columns.
  - **Button:** no `href` gives `<button type="button">` in the primary variant; a ghost, block button with `href="/analyze"` gives a link with the ghost and block classes.
  - **Icon:** hidden without a label; `role="img"` with `aria-label` when labeled.
  - **Note:** the danger default icon is `cross`, success is `check`, neutral is `info`; a chosen icon wins; the title and body are text.
  - **ReportSection:** two sections are each labeled by their own `h2` id.

  Done when the tests fail for the missing modules.

- [ ] 2.2 In the same file, test the stylesheet requirement:
  - every class token rendered by every component variant has a `.<token>` selector in `globals.css` or `ds.css`;
  - `ds.css` has no `@import` and no non-`data:` `url(`.

  Done when the tests fail for the missing `ds.css`.

## 3. Code

- [ ] 3.1 Add `icon.tsx`, `button.tsx`, `swatch.tsx` (Swatch and SwatchGrid), `note.tsx` and `report-section.tsx` under `apps/web/src/components/ds/`. Each is a JSX port of its `bundle.js` function, typed from `index.d.ts`, with `Color` taken from `@seasonly/analysis` (design.md, decision 2). Add `index.ts` re-exporting them. Sources: `project/ds/seasonly/components/` on the canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3). If JSX fails to transform under Vitest, apply the design.md risk fix. Done when the 2.1 tests pass.
- [ ] 3.2 Add `apps/web/src/components/ds/ds.css` with the `bundle.css` rules listed in design.md decision 3, inside `@layer components`, and import it from `globals.css` right after `@import "tailwindcss";`. Done when the 2.2 tests and the existing `tokens.test.ts` pass.
- [ ] 3.3 Run `pnpm fix`, then `pnpm test`, then `pnpm --filter web build`. Done when all three are green.
