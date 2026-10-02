## Context

`design-tokens` (archived with `t14-site-structure`) already gives `globals.css` every token as a CSS variable, the type classes, and the few component classes the site chrome uses (`.sn-screen`, `.sn-wordmark`, `.sn-navlink`, `.sn-btn` with primary and secondary variants). It puts them in `@layer components`. `site-chrome.tsx` renders buttons as `<Link className="sn-btn sn-btn--…">` and has its own `Wordmark`.

The design system ships its components as one browser bundle:

- `bundle.js` builds them with `React.createElement`. It is the source of each component's markup and ARIA.
- `index.d.ts` declares their props.
- `bundle.css` styles them. Its first line `@import`s Google Fonts, which the design-tokens e2e check forbids.

All three are copied into the canvas at `project/ds/seasonly/components/` and are identical to the design system's.

Unit tests run in one root Vitest project, in the node environment. It already includes `apps/*/src/**/*.test.{ts,tsx}`, and `apps/web/tsconfig.json` uses `jsx: react-jsx`. `react-dom/server`'s `renderToStaticMarkup` renders `next/link` in plain Node as `<a href>` (checked 2026-10-02).

Motivation and scope: proposal.md. Requirements: `specs/ui-components/spec.md`.

## Goals / Non-Goals

**Goals:**

- Canvas markup ports without renaming. `<Seasonly.Note tone="danger" title="Too dark">` becomes `<Note tone="danger" title="Too dark">`, with the same props and the same classes.
- No new dependency, no new test environment.

**Non-Goals:**

- Single-consumer components. Each goes to the change that uses it (proposal.md, What Changes).
- A real icon set. The design system's placeholder glyphs are ported as they are, and the Tracker lists "icon set" as open.
- Replacing the Tailwind classes in `site-chrome.tsx` with the new components. It works, and nothing requires that change.
- Storybook or a component gallery page. The canvas is the gallery.

## Decisions

### 1. Files

```
apps/web/src/components/ds/
  button.tsx  icon.tsx  swatch.tsx  note.tsx  report-section.tsx
  index.ts        re-exports the six components and their prop types
  ds.css          the ported bundle.css rules, inside @layer components
  ds.test.tsx
```

- `swatch.tsx` holds both `Swatch` and `SwatchGrid`. The grid is a loop over the swatch.
- Pages import from `@/components/ds`.
- At archive, the README gets the row `ui-components | apps/web/src/components/ds/**`.
- Alternative: `components/ui/`. Rejected: that path is spec-exempt (CLAUDE.md), so the spec hook would never guard these components.
- Alternative: one `ds.tsx` file. Rejected: each component is 10–20 lines, and five small files make the diffs per component easy to read.

### 2. Port from `bundle.js`, typed from `index.d.ts`

- Each component is a direct JSX translation of its `bundle.js` function: the same element types, class names, ARIA attributes, defaults (Button `primary`, Icon size 16, SwatchGrid 4 columns, Note `neutral`) and Icon path data.
- The prop interfaces copy `index.d.ts`, with one change: the design system's `Color` becomes the analysis core's `Swatch` type. It is imported as `import type { Swatch as Color } from "@seasonly/analysis"` to avoid clashing with the component's name.
- `ReportSection` uses `useId()` for its heading id when no `id` is given, as the bundle does. That makes the two-sections scenario hold.
- Button renders `next/link` for an `href` instead of `<a>`, so client navigation works. Every other prop, `aria-disabled` included, passes through. With no `href`, it renders `<button type="button">` unless a `type` is given.
- These are server components: no state, no effects, no `"use client"`. `useId` works in server components.

### 3. CSS: a separate `ds.css`, imported once

- `ds.css` holds the `bundle.css` rules for the six components (`.sn-icon`, `.sn-btn--ghost`, the disabled button rules, `.sn-swatch*`, `.sn-swatch-grid`, `.sn-note*`, `.sn-report*`) and the layout classes artboards use directly (`.sn-card`, `.sn-stack`, `.sn-slot*`), plus `.sn-visually-hidden`.
- `ds.css` adds no rule for the two hook classes (decision 4); the bundle has none.
- It drops the Google Fonts `@import`, the `.sn-screen` reset, and rules for components that are not ported.
- The whole file sits in one `@layer components { … }` block, so Tailwind utilities still override it, as in `globals.css`.
- `globals.css` gets `@import "../components/ds/ds.css";` right after `@import "tailwindcss";`, because CSS needs `@import` before other rules.
- The `.sn-btn` base and its primary and secondary rules stay in `globals.css`, where the site chrome already relies on them. `ds.css` adds only the missing ghost and disabled rules.
- Alternative: append the rules to `globals.css`. Rejected: the design-tokens spec describes `globals.css` as holding "the few ported component classes". Growing it would make that text stale, and the tokens file and the components file change for different reasons.
- Alternative: move every `.sn-btn` rule into `ds.css`. Rejected for now: that is an unrelated edit to `globals.css`. Revisit if the split confuses anyone.

### 4. Tests: static markup in the node environment

`ds.test.tsx` renders each scenario with `renderToStaticMarkup` and asserts on the HTML string. It checks text, attributes, class names and element types, so no DOM is needed. It cites each requirement's anchor in `openspec/specs/ui-components/spec.md`.

- The "every class has a style" test renders every component in every variant. It collects each `class="…"` token and checks that a selector `.<token>` appears in `globals.css` or `ds.css`, read as text the way `tokens.test.ts` reads `globals.css`.
- A named list exempts the two classes the bundle renders as hooks with no rule. `sn-note--neutral` needs none because neutral is the base `.sn-note`. `sn-report__overline` takes its look from `.overline`. The test also fails when a listed hook stops being rendered or gains a rule, so the list cannot go stale.
- The "no external resource" test fails on any `@import` and on any `url(` that is not a `data:` URL in `ds.css`. The color test fails on any hex, `rgb(` or `rgba(` literal there. The ported rules already use only token variables for color. Their few literal `2px` gaps stay, because the design system writes them that way.
- Alternative: jsdom with Testing Library. Rejected: two new dev dependencies and a second Vitest environment, for assertions a string can already answer. Add them when a component gets behavior, such as focus or events.
- `PALETTES["soft-autumn"].best` feeds the grid scenario, so the test uses real approved data.

## Risks / Trade-offs

- [Vitest's transform may not pick up `jsx: react-jsx` for `.tsx` at the root] → If the first test run fails on JSX, set `esbuild: { jsx: "automatic" }` in the root `vitest.config.ts` (a spec-exempt config file).
- [The design system changes a component after this port] → The port is a copy, not a sync. After launch, `/design-sync` pushes repo components back to the design system ("code is the source of truth", Architecture tab). Until then, a design-system change needs a new change here.
- [A substring check misses a selector that only appears inside `:has()` or a combined selector] → The check looks for `.<token>` followed by a selector boundary anywhere in the CSS, so `.sn-quiz:has(...)`-style compound rules still count. It is a guard against forgetting a rule, not a CSS parser.
- [`useId` ids differ between server and client renders] → Not an issue for server components. If a consumer renders `ReportSection` inside a client component, React's `useId` stays hydration-safe.

## Migration Plan

None. The change is additive: new files and one `@import` line. Rollback is a revert.
