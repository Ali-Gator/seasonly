## Why

Five backlog items can ship before the 2026-10-26 launch. Sentry stores up to 10 KB of every failed request's body, so quiz answers, email addresses and the first ~9.5 KB of the face-crop JPEG can sit in Sentry for 30 days, while every page promises the crop is gone within 24 hours (BL-30). The guide notice says "We delete it within 24 hours" without saying Google may keep the crop up to 90 days (BL-43), and three site notes say only the result is kept (BL-44). Every kicker on every page has a stray line above it (BL-58), and long color names collide in 4-column swatch grids on narrow phones (BL-57).

## What Changes

- **BL-30:** the server Sentry init stops capturing incoming request bodies (`httpIntegration` with `maxIncomingRequestBodySize: 'none'`, keeping `disableIncomingRequestSpans: true`). `/privacy`'s Sentry row stays; its plugin line stays as a harmless over-disclosure (Oleg's choice). The chat-plugin spec's "Failed call" note is corrected.
- **BL-43:** the guide notice ends "We delete our copy within 24 hours. Google may keep one up to 90 days for abuse checks." (canvas v54, board 02).
- **BL-44:** the 24-hour notes on `/`, `/how-it-works` and `/color-analysis-gpt-alternative` say "We keep your report, not your photo." (canvas v54).
- **BL-58:** Tailwind no longer generates its `overline` text-decoration utility, so the design system's `.overline` kicker draws no line.
- **BL-57:** a swatch grid asked for 4 columns lays out in 3 columns below 375 px.

## Members

| Id    | Title                                                  | Lane                                          |
| ----- | ------------------------------------------------------ | --------------------------------------------- |
| BL-30 | Sentry error reports can carry request bodies          | B — capture off (Oleg, 2026-10-14)            |
| BL-43 | The guide notice does not say Google may keep the crop | C — canvas v54 board 02 (Oleg, 2026-10-14)    |
| BL-44 | Three site pages still say "We keep your result"       | C — canvas v54, copy sync (Oleg, 2026-10-14)  |
| BL-58 | A line is drawn above every overline                   | A                                             |
| BL-57 | Ten-letter color names overflow narrow 4-column grids  | B — 3 columns below 375 px (Oleg, 2026-10-14) |

Selection: no argument, pass 1 (open items, importance then ease). Investigated six: BL-58, BL-57, BL-55, BL-30, BL-43, BL-44. All six were fixable; the ceiling of five kept the privacy items and the two user-visible defects, and left BL-55 for the next batch (below).

## Parked

None in lane D. Investigated and fixable, but over the five-fix ceiling, so left untouched in `docs/backlog.md` for the next batch:

- **BL-55** The wide report's actions wait for the palette's bottom — lane A. Fix found in triage: drop only `lg:float-left` from the last left block in `apps/web/src/lib/report/view.tsx:59` (keep `lg:clear-left` and the 4-of-12 width), so it clears the left floats instead of waiting for the right ones; no existing test changes; update report-page's Behavior paragraph. Ranked below the privacy items as a wide-screen polish that no scenario fails.

New items logged in triage: **BL-61** ("Watermelon" still runs into the gap at 375–399 px) and **BL-62** (three more "deleted within 24 hours" lines leave out Google's copy).

## Base branch

`origin/main` at `15d0c2e` (backlog-2 merged). It carries every member id.

## Approved test edits

- `apps/web/src/app/(flow)/analyze/_capture/guide.test.tsx:38` — the expected notice string changes to the approved caption (design.md Decision 4, approved by Oleg, 2026-10-14).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `observability`: Sentry error reports carry no incoming request body.
- `capture-flow`: the guide notice says Seasonly deletes its copy within 24 hours and Google may keep one up to 90 days for abuse checks.
- `site-content`: a core page that says what Seasonly keeps names the report, not only the result.
- `design-tokens`: the type classes draw no text decoration.
- `ui-components`: a 4-column swatch grid lays out in 3 columns below 375 px.

## Impact

- `apps/web/sentry.server.config.ts` (and, for a testable seam, `apps/web/src/lib/observability/sentry.ts`).
- `apps/web/src/app/(flow)/analyze/_capture/steps.tsx` and `guide.test.tsx`.
- `apps/web/src/app/(site)/page.tsx`, `how-it-works/page.tsx`, `color-analysis-gpt-alternative/page.tsx`; new test in `apps/web/src/lib/site-content/content.test.tsx`.
- `apps/web/src/app/globals.css` (exempt path).
- `apps/web/src/components/ds/ds.css` and possibly `swatch.tsx`.
- Edge Cases prose in `openspec/specs/chat-plugin/spec.md`.
- `docs/backlog.md`: BL-30, BL-43, BL-44, BL-58, BL-57 deleted.
