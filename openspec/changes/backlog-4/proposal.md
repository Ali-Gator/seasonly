## Why

Five backlog items can ship before the 2026-10-26 launch. The report footer, the report email and the how-it-works FAQ still say the photo is deleted within 24 hours, with no word that Google may keep the crop up to 90 days (BL-62); `backlog-3` fixes only the guide notice. On a wide screen the report's Share and Save buttons start up to ~200 px below the agreement note, beside "Colors to avoid" (BL-55). Screen readers read each famous person's name twice on every season page (BL-24). Both chat-plugin listings point their support URL at the top of `/terms`, whose contact line is at the bottom (BL-37). And a refused request from the bot check counts as an ordinary failure in analytics, so a spike of blocked TikTok or Instagram in-app browsers would not show at launch (BL-56).

## What Changes

- **BL-62:** the report footer and the report email footer say "We delete our copy of your face crop within 24 hours of your analysis. Google may keep one up to 90 days for abuse checks." (the email keeps "We keep your report until you ask us to delete it."); the how-it-works FAQ "What happens to my photo?" says "…We delete our copy within 24 hours. Google may keep one up to 90 days for abuse checks. We keep your report, not your photo." Canvas v55. Photo reports only; the three short note titles stay.
- **BL-55:** from 1024 px the report's last left block (Premium, actions, footer) is no longer a float: it clears the left floats only, so "Share my season" starts right under the agreement note.
- **BL-24:** each famous photo on a season page has an empty `alt` and sits in a `figure` whose `figcaption` holds the name; the `alt` field leaves the `Famous` content type.
- **BL-37:** the "Law and contact" section of `/terms` is addressable at `/terms#contact`; the listing doc and the ChatGPT `plugin.json` point their support URL there.
- **BL-56:** `analysis_failed` carries `blocked` — true when the analyze route answered 403.

## Members

| Id    | Title                                                              | Lane                                                                |
| ----- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| BL-62 | Three more "deleted within 24 hours" lines leave out Google's copy | C — canvas v55, guide-style rewrite, titles stay (Oleg, 2026-10-14) |
| BL-55 | The wide report's actions wait for the palette's bottom            | A                                                                   |
| BL-24 | Famous people's names are read twice                               | B — empty alt + figcaption (left to the agent by Oleg, 2026-10-14)  |
| BL-37 | A support page with an HTTPS URL                                   | A                                                                   |
| BL-56 | A refused request counts as an ordinary failure in analytics       | A                                                                   |

Selection: no argument, pass 1 (open items, importance then ease), skipping `backlog-3`'s members (BL-30, BL-43, BL-44, BL-57, BL-58). Investigated seven: BL-55, BL-61, BL-62, BL-16, BL-24, BL-37, BL-56. Six were fixable after BL-61 was parked; the ceiling of five dropped BL-16 (below).

## Parked

- **BL-61** "Watermelon" still runs into the gap at 375–399 px — lane D. Its likely fix moves `backlog-3`'s below-375 column rule, which is being implemented now; status set to `gated — backlog-3 merged, then a Light Spring 375/390 board`. Triage also found 390/393 px iPhones, True Summer best #16 and Champagne in Light Spring metals overflow (design.md).

Fixable but left untouched in `docs/backlog.md` for the next batch:

- **BL-16** The vision call uses a deprecated AI SDK image part — lane A, over the ceiling. Fix found: `apps/web/src/lib/report-text/index.ts:170` becomes `{ type: "file", data: faceCrop, mediaType: "image/jpeg" }`; new test sets `globalThis.AI_SDK_LOG_WARNINGS` to a spy and asserts no `deprecated` warning; no existing test or spec changes. Ranked below BL-56: a warning only, on a lockfile-pinned `ai@7.0.127`.
- **BL-26** The famous photos bypass `Slot` — touches BL-24's lines; needs a decision (a listed `ui-components` exception for a `loading` prop, or a design-system `bundle.js` change first). A sixth fix, so not here.

## Base branch

`backlog-3` at `f1a6461` (its triage, unmerged): it carries BL-61, BL-62 and `_Next id:_ BL-63`. `backlog-3` is being implemented in the main checkout; this batch was triaged in a separate worktree (`../seasonly-backlog-4`). **Ship order:** `backlog-3` merges first; then merge `main` into `backlog-4` before its PR. Expect a `docs/backlog.md` conflict (BL-62 sits after BL-44, which `backlog-3` deletes) and nearby edits in `how-it-works/page.tsx` (`backlog-3` changes line 176, this batch line 24). Archive `backlog-4` after `backlog-3`: no requirement is modified by both (`backlog-3`'s `site-content` delta is ADDED only).

## Approved test edits

- `apps/web/src/lib/report/view.test.tsx:103` — the footer string becomes the canvas v55 line (design.md Decision 1, Oleg, 2026-10-14).
- `apps/web/src/lib/report/view.test.tsx:172` — the photo footer's marker `/photo/` becomes `/face crop/` (design.md Decision 5, Oleg, 2026-10-14).
- `apps/web/src/lib/email/render.test.ts:8` — the `FOOTER` constant becomes the canvas v55 line (design.md Decision 1, Oleg, 2026-10-14).
- `apps/web/src/lib/site-content/content.test.tsx:97` — the every-image-has-alt check exempts only an image inside a `figure` whose `figcaption` is not empty (design.md Decision 3, delegated by Oleg, 2026-10-14).
- `apps/web/src/lib/site-content/content.test.tsx:213` — a famous photo is expected with `alt: ""` and a `figcaption` holding the name (design.md Decision 3, delegated by Oleg, 2026-10-14).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `report-page`: the photo footer names Google's copy; from 1024 px "Share my season" follows the agreement note.
- `email-capture`: the photo report email's footer names Google's copy.
- `site-content`: the how-it-works FAQ names Google's copy; a famous person's name is the photo's caption and is read once.
- `legal-pages`: the terms' contact section has a stable address.
- `analytics`: `analysis_failed` says whether the request was blocked.

## Impact

- `apps/web/src/lib/report/view.tsx` (footer line, last left block), `view.test.tsx` (footer string; new `it`s).
- `apps/web/src/lib/email/render.ts`, `render.test.ts` (`FOOTER`).
- `apps/web/src/app/(site)/how-it-works/page.tsx` (FAQ answer).
- `apps/web/src/app/(site)/seasons/[season]/page.tsx`, `apps/web/src/lib/site-content/seasons.ts` (36 `alt` lines and the `Famous.alt` field go), `content.test.tsx`.
- `apps/web/src/app/(site)/terms/page.tsx`, new case in `apps/web/src/app/(site)/legal-pages.test.tsx`; `docs/chat-plugin-listing.md`, `docs/chat-plugin-openai/plugin.json`.
- `apps/web/src/app/(flow)/analyze/flow.tsx`, `e2e/funnel.spec.ts` (new 403 case; `answerAnalyze` gains a `403` branch).
- Prose: `report-page` Behavior and Edge Cases, `analytics` Public Interface, `site-content` Public Interface, `season-reveal` Behavior.
- `docs/backlog.md`: BL-62, BL-55, BL-24, BL-37, BL-56 deleted.
- Follow-up for Oleg, not blocking: once both directory reviews close, change the support URL in each portal to `https://seasonly.me/terms#contact` (re-upload the ChatGPT ZIP).
