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

_Next id:_ **BL-08**

**Status** is one of: **open** (actionable now), **gated — X** (blocked on a named decision or
dependency), **deferred — X** (waiting on purpose for a named trigger). Split a multi-part item
into separate items rather than letting one grow into a paragraph.

**What goes here and what doesn't.** Work that a named later change already owns goes in the
plan's "Carried in from finished changes" list (Architecture and phases tab), not here. This file
holds what no change owns yet: phase-review findings left unfixed, and defects or gaps found
along the way that are worth fixing later. CLAUDE.md ("Backlog") says when to add and when to
fold items in.

## Code quality

- **[BL-02] A hung crop upload is abandoned, not cancelled** — `upload()` in
  `@supabase/storage-js` 2.117 takes no abort signal, so after the 3 s timeout the request keeps
  running until the function's time limit ends it. It is harmless today because the response is
  already sent. Wire an `AbortController` through the client's `global.fetch`, or a newer
  storage-js that takes a signal.
  _Refs:_ `apps/web/src/lib/draping/crops.ts`, `openspec/specs/draping-preview/spec.md` ·
  _Status:_ deferred — until Sentry shows `crop upload timed out` events, or storage-js adds a
  signal to `upload()`

## Testing

- **[BL-03] Nothing catches a font missing from the production build** — the first
  `t5-report-images` build left Instrument Sans out of the bundle (a template-literal
  `new URL()`), and every card fell back to Bodoni. All unit tests passed because Vitest reads the
  fonts from disk. Only the human look at the built PNGs caught it. Add a check against the build
  output: an e2e request for one card compared with a Vitest render, or a test that the fonts
  appear in the route's file trace.
  _Refs:_ `apps/web/src/lib/og/index.tsx` (`OG_FONTS`), `openspec/specs/share-card/spec.md` (Edge
  Cases) · _Status:_ open — found 2026-10-07

## Design / UX

- **[BL-04] The design system's ShareCard overflows on long names** — the approved
  `bundle.css` sets post-card names at 0.75 em, and "Bright Turquoise" needs about 379 px of a
  285 px column at 1080 px. A two-line season name ("Light Summer") also pushes the story card's
  last color into its footer. The PNGs depart from the bundle to fix both (names 0.55 em on one
  line, hex 0.5 em; story rows share the list height). Bring board 11 and `bundle.css` in line,
  so a DOM ShareCard preview on the report matches the PNG.
  _Refs:_ `openspec/specs/share-card/spec.md` (Behavior), MVP canvas board 11
  (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) · _Status:_ open — before
  `t5-report-delivery` renders a card preview; check whether the 2026-10-07 redesign session
  already updated the canvas

- **[BL-05] A disabled Button with `href` is still a live link** — `aria-disabled` is passed
  through, but the rendered `next/link` still navigates, as in the design system's bundle. Drop
  the `href` (or prevent the click) while disabled.
  _Refs:_ `apps/web/src/components/ds/button.tsx`, `openspec/specs/ui-components/spec.md` ·
  _Status:_ open — noted at `t3-design-tokens` archive, 2026-10-02

- **[BL-06] Placeholder icons and empty photo slots** — the icons are the bundle's placeholder
  glyphs, and the photo-tip and draping example slots show labels, not photos. Choose an icon set
  and real example photos.
  _Refs:_ `apps/web/src/components/ds/icon.tsx`, design system
  (https://claude.ai/artifact/E11hciU9VsyCxTFnJJNbHD) · _Status:_ gated — your choice of icon set
  and photos (open since T3, 2026-10-01)
