## Context

See proposal.md for why. Triage ran on `origin/main` at `15d0c2e` with six investigated items, one read-only Plan investigator each. Every decision and the canvas copy were settled with Oleg on 2026-10-14; Oleg drew the canvas copy himself (canvas v54).

| Id    | Lane | Why                                                                                                             |
| ----- | ---- | --------------------------------------------------------------------------------------------------------------- |
| BL-30 | B    | Real and worse than logged: face-crop bytes reach Sentry. Off vs disclose was Oleg's call (Decisions 1–2).      |
| BL-43 | C    | The notice copy is a canvas line; board 02 redrawn in v54 (Decision 3). Changes an existing test (Decision 4).  |
| BL-44 | C    | Copy swap to an already-approved sentence, but the four boards still said "result"; synced in v54 (Decision 3). |
| BL-58 | A    | Name clash with Tailwind's `overline` utility; one line in `globals.css`, no test edit.                         |
| BL-57 | B    | Narrow-phone column rule is a layout choice (Decision 5). No existing test edit if the inline style stays.      |
| BL-55 | A    | Fixable, but over the five-fix ceiling; left for the next batch (fix recorded in proposal.md).                  |

## Goals / Non-Goals

**Goals:** no request body in any Sentry report; the guide notice and the three site notes say what is really kept and by whom; no stray line above kickers; no colliding names below 375 px.

**Non-Goals:**

- No change to `/privacy`. Its Sentry row stays true once bodies are off; its plugin line ("If a call fails, its error report can include the answers sent with it") becomes an over-disclosure, which Oleg chose to keep (Decision 2).
- The report footer, email footer and how-it-works FAQ also say "deleted within 24 hours" without Google's copy: logged as BL-62, not widened here.
- "Watermelon" still runs ~6 px into the gap from 375 to ~399 px; fixing that changes the approved 375 layout: logged as BL-61.

## Members

### BL-30 — Sentry stops capturing request bodies

In `@sentry/nextjs` 10.75.3 the server `init` replaces the default Http integration with `httpIntegration({ disableIncomingRequestSpans: true })`; its server part captures up to 10 KB (`maxIncomingRequestBodySize` default `"medium"`) of every incoming body, with no content-type filter and no `sendDefaultPii` check. The fix passes our own `httpIntegration({ disableIncomingRequestSpans: true, maxIncomingRequestBodySize: "none" })` in the server init's `integrations`. Integrations are de-duplicated by name and the user's instance wins, so **`disableIncomingRequestSpans: true` must be repeated**, or Next's request spans come back twice. For a unit-testable seam, the server-only options move into an exported builder under `apps/web/src/lib/observability/` (not `sentry.ts`'s `baseSentryOptions`, which the browser and edge inits share), and `sentry.server.config.ts` spreads it. The new test asserts the builder's Http integration has `maxIncomingRequestBodySize: "none"` and `disableIncomingRequestSpans: true` (read the integration's options however the SDK exposes them; if it does not, assert on the arguments passed to a mocked `httpIntegration`). Edge runtime captures no bodies and no route runs on edge; `sentry.edge.config.ts` and `instrumentation-client.ts` are untouched. Also hand-edit `openspec/specs/chat-plugin/spec.md` Edge Cases "Failed call" line: Sentry gets no request body; `/privacy#chat-plugin` still says it may (kept on purpose, Oleg 2026-10-14). Files: `apps/web/sentry.server.config.ts`, a new module under `apps/web/src/lib/observability/`, `observability.test.ts` (new `it` only), `openspec/specs/chat-plugin/spec.md`.

Correction to the bullet: it names only quiz answers and email addresses. `/api/analyze` is multipart with `answers`, `traits`, then `crop` (JPEG up to 512 KB), so the 10 KB cut also holds about 9.5 KB of the face crop, mangled by a UTF-8 decode but still sent. Sentry keeps reports 30 days, against the 24-hour promise on every page.

### BL-43 — the guide notice names Google's copy

`Guide` in `apps/web/src/app/(flow)/analyze/_capture/steps.tsx:107-109`: the last sentence "We delete it within 24 hours." becomes "We delete our copy within 24 hours. Google may keep one up to 90 days for abuse checks." — canvas v54, board 02, word for word. The "Privacy policy" link stays at the end. `guide.test.tsx:38` changes to the new string (Decision 4). The 375 × 812 e2e check of both actions is unaffected: the notice sits below them. Files: `steps.tsx`, `guide.test.tsx`.

### BL-44 — the three 24-hour notes say "report"

- `apps/web/src/app/(site)/page.tsx:150` and `color-analysis-gpt-alternative/page.tsx:150`: "Only a crop of your face is uploaded. We keep your result, not your photo." → "Only a crop of your face is uploaded. We keep your report, not your photo."
- `apps/web/src/app/(site)/how-it-works/page.tsx:176`: "We keep your result, your season and your colors, not your photo." → "We keep your report, not your photo." (title "Deleted within 24 hours" stays).
- Leave `color-analysis-gpt-alternative/page.tsx:77`'s "Keep your result" note alone: it tells GPT users to write down their season, not what Seasonly stores.

New test in `apps/web/src/lib/site-content/content.test.tsx` (new `it`, no edit): each of the three pages contains "We keep your report, not your photo." and none contains "We keep your result". `/how-it-works` loses ~5 words; check its ≥250-word floor still passes. Files: the three pages, `content.test.tsx`.

### BL-58 — kickers lose Tailwind's overline

`globals.css` gains `@source not inline("overline");` after its imports, so Tailwind 4.3.3 never generates its `overline` utility (`text-decoration-line: overline` in `@layer utilities`, which beats `.overline` in `@layer components`). A reset inside the existing `.overline` rule would not work: it sits in the losing layer. Fallback if the directive misbehaves: an unlayered or `@layer utilities` rule `.overline { text-decoration-line: none }` after line 256. A rename would touch ~18 class sites, `tokens.json`, a spec and two existing tests, so it is rejected. `tokens.test.ts` reads the first plain `.overline` block and stays green. Test: a new e2e case (or a case in an existing e2e file, added as a new `test`) loads a page with a kicker (the landing's "SEASONAL COLOR ANALYSIS" or `/privacy`'s "Legal") and asserts computed `text-decoration-line` is `none`. `apps/web/src/lib/mcp/card.ts` uses the same class in its own CSS, which Tailwind never processes; untouched. Files: `apps/web/src/app/globals.css` (exempt), one e2e spec.

### BL-57 — 3 columns below 375 px

`SwatchGrid` (`apps/web/src/components/ds/swatch.tsx:34-50`) sets `grid-template-columns` inline, and the inline style beats a stylesheet media query (the wide overrides already need `lg:grid-cols-6!`). Keep the inline style, so `ds.test.tsx:68-79` stays green, and mark the grid's asked-for count (e.g. a `data-columns` attribute); `ds.css` adds `@media (max-width: 374.98px) { .sn-swatch-grid[data-columns="4"] { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; } }`. Every 4-column grid takes it: report and season-page best colors (24 → 8 rows of 3), metals (3 + 1), metals to go easy on (2), landing sample (12 → 4 × 3), GPT-alternative sample (3 + 3 + 2), but not `SeasonLink`'s 4-color preview, which keeps 4 columns (Oleg, 2026-10-14; its widest name, Terracotta, fits to ~349 px): `SwatchGrid` gets an opt-out that skips the narrow marker, and `SeasonLink` (`apps/web/src/lib/site-content/season-link.tsx:52-57`) uses it. Tests: a new `ds.test.tsx` case that a 4-column grid carries the marker and `ds.css` has the narrow rule; a new e2e case at 360 × 800 on `/seasons/light-spring` (Watermelon is among its best colors) asserting 3 columns and that every name's text fits its cell (`scrollWidth <= clientWidth`), and at 375 asserting 4 columns. Files: `swatch.tsx`, `ds.css`, `ds.test.tsx` (new `it`s), one e2e spec. The design system's `bundle.css` on the canvas keeps 4 columns: widths below 375 are not drawn.

## Decisions

### Decision 1 — BL-30: what Sentry does with incoming request bodies

Options: (a) turn body capture off in the server init; (b) keep capture and disclose on `/privacy` that error reports can carry quiz answers, an email address and part of the face crop; (c) off for `/api/analyze` only, disclose the rest.
Trade-off: (a) loses request bodies for debugging (stack traces and `extra` remain) but stops face-crop bytes, answers and emails at the source, and keeps every "deleted within 24 hours" line true. (b) keeps debugging data but leaves part of the crop in Sentry for 30 days against the 24-hour promise. (c) splits the difference with more code and a new disclosure.
Recommendation: (a).
**Answer:** first "disclose"; asked again once the 30-day vs 24-hour conflict was spelled out, then (a), turn capture off (Oleg, 2026-10-14).

### Decision 2 — BL-30: the `/privacy` plugin line

`privacy/page.tsx:146-148` says a failed plugin call's error report can include the answers sent with it. Under 1(a) it overstates.
Options: (a) delete it and set a new "Last updated" date; (b) leave it as a harmless over-disclosure.
Recommendation: (a).
**Answer:** (b), leave it (Oleg, 2026-10-14). The chat-plugin spec's Edge Case records that the line is kept on purpose.

### Decision 3 — BL-43 and BL-44 canvas copy

Options: (a) agent edits the canvas in place; (b) Oleg draws it.
**Answer:** (b), Oleg drew it (Oleg, 2026-10-14). Canvas v54 (`1791956135-8f04`):

- Board 02 Guide (one board, 375 light — the board has no 1280 or dark version): caption ends "We delete our copy within 24 hours. Google may keep one up to 90 days for abuse checks."
- Boards Main (375), Landing-1280, GptAlternative (375 and 1280): the "Your photo is deleted within 24 hours" note reads "Only a crop of your face is uploaded. We keep your report, not your photo."
- Board HowItWorks: the "Deleted within 24 hours" note reads "We keep your report, not your photo."; its FAQ "What happens to my photo?" synced to the live t11 text (no code change).

**Approved:** Oleg, 2026-10-14.

### Decision 4 — BL-43 edits an existing test

`apps/web/src/app/(flow)/analyze/_capture/guide.test.tsx:38` asserts the notice word for word; the notice changes on purpose. Only the expected string changes, to the approved caption.
**Answer:** approved (Oleg, 2026-10-14).

### Decision 5 — BL-57: 4-column grids on narrow phones

Options: (a) 3 columns below 375 px; (b) 3 columns below 360 px; (c) shrink names below the breakpoint; (d) leave as is.
Trade-off: (a) covers 360 px Android (names ~2 px apart there today); widths below 375 are undrawn on the canvas; cost is uneven last rows (metals 3 + 1). (b) leaves 360 touching. (c) a 12 px Watermelon (~69 px) still overflows a 65 px cell. (d) collisions below ~352 px.
Recommendation: (a).
**Answer:** (a), 3 columns below 375 px (Oleg, 2026-10-14). Follow-up: the season previews (`SeasonLink`) keep 4 across (Oleg, 2026-10-14).

## Risks / Trade-offs

- BL-30 removes request bodies from every server error report; debugging a bad analyze request relies on the stack, `withTimeout`'s `extra` and the route's own logs.
- BL-57's uneven rows below 375 px (metals 3 + 1) are accepted with Decision 5; `SeasonLink` keeps 4 columns.
- BL-58's `@source not inline` is a Tailwind 4 directive; a Tailwind upgrade that drops it would bring the line back silently, which the new e2e check catches.
