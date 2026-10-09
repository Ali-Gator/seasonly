# Backlog

Open items only. When one ships, **delete it**: its history lives in git and in the spec or
change that fixed it. The detail belongs in the linked spec or source; this file is the lean
index of what's left, grouped by area. Every item has the same shape:

```
- **[BL-nn] <Title>** — <what to do + why it matters, 1–2 sentences>.
  _Refs:_ `<spec / change / source>` · _Status:_ open | gated — <blocker> | deferred — <trigger>
```

**Ids** are `BL-nn` and **monotonic**. A new item takes the number on the `_Next id:_` line
below and bumps that line by one. Do not use the highest id still in the file, because it falls
every time a shipped item is deleted. Ids are **never reused**, so a `BL-nn` in a commit message
or an archived change always means the same item.

_Next id:_ **BL-17**

**Status** is one of: **open** (actionable now), **gated — X** (blocked on a named decision or
dependency), **deferred — X** (waiting on purpose for a named trigger). Split a multi-part item
into separate items rather than letting one grow into a paragraph.

**What goes here and what doesn't.** Work that a named later change already owns goes in the
plan's "Carried in from finished changes" list (Architecture and phases tab), not here. This file
holds what no change owns yet: phase-review findings left unfixed, and defects or gaps found
along the way that are worth fixing later. CLAUDE.md ("Backlog") says when to add and when to
fold items in.

## Analysis

- **[BL-13] Temperature reads cool and moves with the light** — on the eval set, warm-labeled
  people average cool (skin hue 47° against a midpoint of 55°), and one person's temperature
  spreads 0.3–0.6 across photos, so label accuracy is 0.18. Constants cannot fix it (`t6-eval-set`
  tried); white-balance skin and hair against the measured eye white before computing traits,
  then re-tune on the set.
  _Refs:_ `packages/analysis/src/sampling/traits.ts`, `openspec/specs/color-sampling/spec.md`,
  `evals/README.md` · _Status:_ open — found in `t6-eval-set`, 2026-10-09

- **[BL-14] The eval set leans light-skinned and has no holdout** — 10 of 16 people are light,
  3 medium, 3 deep, and the same 72 usable photos tuned the limits they now score. Add medium
  and deep people (and the user's own selfies, which need no `source`), and keep a holdout once
  the set passes about 30 people.
  _Refs:_ `evals/manifest.json`, `openspec/specs/analysis-eval/spec.md` · _Status:_ open — found
  in `t6-eval-set`, 2026-10-09

- **[BL-15] CI checks a committed eval result, not the photos** — only a machine with the
  photos can refresh `results.json`. Run `eval:fetch` and `eval:run` in CI (Playwright's
  Chromium is already there) once a Commons fetch from CI proves stable.
  _Refs:_ `.github/workflows/ci.yml`, `evals/gate.ts` · _Status:_ deferred — until fetching about
  100 Commons originals per CI run is judged stable

## Code quality

- **[BL-02] A hung crop upload is abandoned, not cancelled** — `upload()` in
  `@supabase/storage-js` 2.117 takes no abort signal, so after the 3 s timeout the request keeps
  running until the function's time limit ends it. It is harmless today because the response is
  already sent. Wire an `AbortController` through the client's `global.fetch`, or a newer
  storage-js that takes a signal.
  _Refs:_ `apps/web/src/lib/draping/crops.ts`, `openspec/specs/draping-preview/spec.md` ·
  _Status:_ deferred — until Sentry shows `crop upload timed out` events, or storage-js adds a
  signal to `upload()`

- **[BL-16] The vision call uses a deprecated AI SDK image part** — every call logs "The
  "image" content part type is deprecated. Use a "file" part with mediaType". Switch the face
  crop to a `file` part with `mediaType: "image/jpeg"` before the SDK drops it.
  _Refs:_ `apps/web/src/lib/report-text/index.ts`, `openspec/specs/report-text/spec.md` ·
  _Status:_ open — found in `t6-eval-set`, 2026-10-09

## Testing

- **[BL-08] Two concurrent email stores are never raced in a test** — the abuse-controls
  scenario "Two requests at once" rests on `store_report_email` locking the report row (`for
update`). PGlite has one connection, so the test only checks that the lock is in the SQL. Race
  two sessions against a real Postgres (the Supabase CLI's local stack), or mark the scenario
  Unenforced.
  _Refs:_ `apps/web/src/lib/email/store.test.ts`, `openspec/specs/abuse-controls/spec.md` ·
  _Status:_ gated — a local Postgres in tests (the local Supabase stack needs Docker)

- **[BL-12] One report-delivery E2E case fails under `pnpm dev`** — "answers a report it cannot
  read with 500" expects `private, no-store`, but the dev server sends `no-cache,
must-revalidate`, so a local `pnpm test:e2e` (dev mode) always shows one failure. The built
  server and CI pass. Skip the header assertion outside the prebuilt mode, or run local E2E
  against a build.
  _Refs:_ `e2e/report-delivery.spec.ts`, `playwright.config.ts` · _Status:_ open — found in
  `t5-funnel-analytics`, 2026-10-09

## Design / UX

- **[BL-04] The design system's ShareCard overflows on long names** — the approved
  `bundle.css` sets post-card names at 0.75 em, and "Bright Turquoise" needs about 379 px of a
  285 px column at 1080 px. A two-line season name ("Light Summer") also pushes the story card's
  last color into its footer. The PNGs depart from the bundle to fix both (names 0.55 em on one
  line, hex 0.5 em; story rows share the list height). Bring board 11 and `bundle.css` in line,
  so a DOM ShareCard preview on the report matches the PNG.
  _Refs:_ `openspec/specs/share-card/spec.md` (Behavior), MVP canvas board 11
  (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) · _Status:_ deferred — until a page renders a
  DOM card preview (`t5-report-delivery` shows the PNGs themselves); check whether the 2026-10-07
  redesign session already updated the canvas

- **[BL-10] Any failure to load the face says the photo was deleted** — `ReportDraping` shows
  "Your photo has been deleted" for every image error, a storage 500 included, which is false
  inside the 24 h window; a reload would bring the face back. The spec says "cannot be loaded",
  so this is a copy question: tell a 404 (deleted) from other failures, or soften the line for
  the second case. Needs a canvas line first.
  _Refs:_ `apps/web/src/lib/report/draping.tsx`, `openspec/specs/report-page/spec.md` (The
  draping preview shows the stored face) · _Status:_ open — phase review, 2026-10-09

- **[BL-06] Placeholder icons and empty photo slots** — the icons are the bundle's placeholder
  glyphs, and the photo-tip and draping example slots show labels, not photos. Choose an icon set
  and real example photos.
  _Refs:_ `apps/web/src/components/ds/icon.tsx`, design system
  (https://claude.ai/artifact/E11hciU9VsyCxTFnJJNbHD) · _Status:_ gated — your choice of icon set
  and photos (open since T3, 2026-10-01)
