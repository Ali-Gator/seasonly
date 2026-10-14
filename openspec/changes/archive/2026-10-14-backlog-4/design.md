## Context

See proposal.md for why. Triage ran on `backlog-3` at `f1a6461`, in a separate worktree (`../seasonly-backlog-4`) because `/backlog-fix backlog-3` was editing the main checkout. Seven items were investigated, one read-only Plan investigator each. Every decision and the canvas copy were settled with Oleg on 2026-10-14; the agent drew the canvas (v55).

| Id    | Lane | Why                                                                                                                          |
| ----- | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| BL-62 | C    | Three canvas lines (boards 10, 12, HowItWorks); redrawn in v55 (Decisions 1, 2, 4). Changes two existing tests (Decision 1). |
| BL-55 | A    | A float rule; the canvas board already draws one continuous left column. New test only.                                      |
| BL-24 | B    | Two ways to stop the double read; the chosen one edits two existing tests (Decision 3).                                      |
| BL-37 | A    | An `id` on an existing section, no visual change; repo-side listing files follow.                                            |
| BL-56 | A    | The `blocked` value already exists in the same `.catch`; one property. New e2e case only.                                    |
| BL-61 | D    | Its fix moves `backlog-3`'s unshipped column rule and needs a Light Spring 375/390 board; gated on `backlog-3` merging.      |
| BL-16 | A    | Fixable (fix in proposal.md), over the five-fix ceiling; ranked below BL-56.                                                 |

## Goals / Non-Goals

**Goals:** every "deleted within 24 hours" line a person reads after an analysis names Google's copy; Share and Save sit right under the agreement note on a wide report; a screen reader reads each famous name once; the listings have a support URL that lands on the contact line; a blocked browser is visible in analytics.

**Non-Goals:**

- The three note titles ("Your photo is deleted within 24 hours" on `/` and `/color-analysis-gpt-alternative`, "Deleted within 24 hours" on `/how-it-works`) stay as they are (Decision 2).
- `/privacy` does not change: it already names Google's 90 days, and its own 24-hour lines (`privacy/page.tsx:14`, `:79`) sit beside that row.
- No new `/support` page: it would need a route, a sitemap entry (the 19-URL count) and a canvas board, for the same email address.
- No portal change in this batch: switching each directory listing to `/terms#contact` is Oleg's step after the reviews close.
- BL-26 (famous photos bypass `Slot`) stays in the backlog.

## Members

### BL-62 — the 24-hour lines name Google's copy

- `apps/web/src/lib/report/view.tsx:75` (photo reports only, inside `!quizOnly`): "Your photo is deleted within 24 hours of your analysis." → "We delete our copy of your face crop within 24 hours of your analysis. Google may keep one up to 90 days for abuse checks."
- `apps/web/src/lib/email/render.ts:68` (photo reports only; one `footer` array feeds both the HTML and the plain-text part): "Your photo is deleted within 24 hours of your analysis. We keep your report until you ask us to delete it." → "We delete our copy of your face crop within 24 hours of your analysis. Google may keep one up to 90 days for abuse checks. We keep your report until you ask us to delete it." The quiz-only test (`render.test.ts`, `not.toMatch(/selfie|photo/i)`) still holds: the line stays out of the quiz-only branch, and quiz-only sends Google nothing.
- `apps/web/src/app/(site)/how-it-works/page.tsx:24`, FAQ "What happens to my photo?": "…It is deleted within 24 hours. We keep your report, not your photo." → "Only a crop of your face is uploaded, after the photo passes the check and you finish the quiz. We delete our copy within 24 hours. Google may keep one up to 90 days for abuse checks. We keep your report, not your photo."

Tests: `view.test.tsx:103` and `render.test.ts:8` take the new strings (Decision 1); `view.test.tsx:172`'s photo-footer marker `/photo/` becomes `/face crop/` (Decision 5); new `it` in `view.test.tsx` that a photo report's footer does not hold "Your photo is deleted within 24 hours"; new `it` in `content.test.tsx` for the FAQ. Prose: `report-page` Edge Cases line "The footer says the photo is deleted within 24 hours…" becomes "The footer says our copy of the crop is deleted within 24 hours and Google may keep one up to 90 days…", keeping the BL-18 worst case. Files: `view.tsx`, `render.ts`, `how-it-works/page.tsx`, `view.test.tsx`, `render.test.ts`, `content.test.tsx`, `openspec/specs/report-page/spec.md`.

"90 days" is the figure `/privacy` and the guide notice already carry; `legal-pages` records it as Vertex's documented maximum for abuse monitoring.

### BL-55 — the wide report's left column runs on

CSS 2.1 §9.5.1 rule 5: a float's top cannot be higher than the top of an earlier float. The last left block (Premium, actions with `lg:order-first`, footer; `view.tsx:59`) comes after the right float holding sections 2–6, so it starts level with "Colors to avoid" whenever the palette is taller than the season block. Fix: that one block drops `lg:float-left` and keeps `lg:clear-left` and the 4-of-12 width. Every earlier sibling is a float, so its static position is the top of `main` (a flow root at `lg`); `clear:left` drops it below the season's rest block only; it is `display:flex`, a formatting context whose border box may not overlap floats, and it fits beside the right floats (0 → W/3 − 2g/3 against right floats from 5W/12 + 5g/12), so it stays at its cleared position. `LEFT` and `RIGHT` in `sections.tsx` stay as they are — the season page and `/sample-report` use them and have no trailing left block; add a second constant there (e.g. `LEFT_LAST`) so the width calc is written once. Update the comments at `view.tsx:14-16`, `:58` and `sections.tsx:32-36`, and the `report-page` Behavior sentence "Floats cannot start above an earlier float, so the left last block starts level with section 2 (BL-55)." to say the last block is in flow with `clear:left` and follows the agreement note.

Test: the existing `view.test.tsx:181` regex stays green but is vacuous (its greedy `.*` matches from the season head). Leave it; add a new `it` asserting the element that holds "Share my season"'s block carries `lg:clear-left` and not `lg:float-left`. `/r/[id]` cannot be reached in e2e (Supabase points at a dead port), so the layout is proved once by hand at 1280 px against a real local report: "Share my season" top minus the agreement note's bottom ≈ `--space-5`, and Share sits above the top of "Colors to avoid". Files: `view.tsx`, `sections.tsx`, `view.test.tsx` (new `it`), `openspec/specs/report-page/spec.md`.

### BL-24 — a famous name is read once

`apps/web/src/app/(site)/seasons/[season]/page.tsx:118-131` renders `li > div.sn-slot > img[alt=name]`, then the name, then the credit; all 36 `alt` values in `seasons.ts` equal the name. Fix: `li > figure.m-0` holding the slot with `<img alt="">` and a `figcaption` with the name (the landing's `page.tsx:60` already uses `figure className="m-0 …"`); the credit may sit inside the `figcaption` under the name or stay after it — keep the visible layout identical. Drop `alt` from `Famous` (`seasons.ts:15`) and its 36 lines; edit the `famous` data shape in `site-content`'s Public Interface (spec line ~20) to drop `alt`. The archived `t9-site-content` `content.json` stays as it is. Google Images takes the `figcaption` as the photo's context, so image search still gets the name.

Tests: `content.test.tsx:97` exempts only an `<img>` inside a `figure` whose `figcaption` has text — every other empty alt still fails; `content.test.tsx:213` expects `alt: ""` for `f.image` and a `figcaption` containing `f.name` (Decision 3). New `it` for the scenario "The name is read once" if `:213` does not already cite it. Files: `seasons/[season]/page.tsx`, `seasons.ts`, `content.test.tsx`, `openspec/specs/site-content/spec.md`.

### BL-37 — `/terms#contact`

`terms/page.tsx` renders its sections from a `[heading, body]` tuple array with no ids. Give the tuple an optional id (or key it off the heading) and render `id="contact"` on the "Law and contact" `section` (matches `privacy/page.tsx:132`'s `<section id="chat-plugin">`). Not text, so the "Last updated" date stays. Then `docs/chat-plugin-listing.md:63` Support → `https://seasonly.me/terms#contact` (drop the BL-37 note) and `docs/chat-plugin-openai/plugin.json:21` `supportURL` → the same; `termsOfServiceURL` stays `/terms`. New test in `apps/web/src/app/(site)/legal-pages.test.tsx` (template: `privacy/chat-plugin.test.tsx:24`): a `<section id="contact">` holds "Law and contact" and `mailto:care@seasonly.me`. Files: `terms/page.tsx`, `legal-pages.test.tsx` (new `it`), the two docs files.

### BL-56 — `analysis_failed` carries `blocked`

`flow.tsx:153-156` already sets `blocked` from `res.status === 403`, in scope in the `.catch` at `:181`, where `track("analysis_failed", { quiz_only: !request.photo })` becomes `{ quiz_only: !request.photo, blocked }`. A property, not a new event: the catalogue keeps one event per funnel step and puts variants in properties (`outcome`, `reason`); a new event would break the Result step's three-event set and the sample report's "sends none of" list. A timeout is `blocked: false`. Prose: `analytics` Public Interface row for `analysis_failed` gains `blocked` (403); `season-reveal` Behavior "`analysis_failed` fires as for any failure (BL-56)" → "…fires with `blocked: true`". `/privacy` lists no event properties: no change.

Test: new e2e case in `e2e/funnel.spec.ts` — the analyze route answers 403 → one `analysis_failed` with `{ quiz_only: false, blocked: true }`; `answerAnalyze` (`:102`) gains a `403` branch (a helper change, not an assertion change). Optionally a second new case: 500 → `blocked: false`; the existing 500 case's `toMatchObject({ quiz_only: false })` stays as it is. Files: `flow.tsx`, `e2e/funnel.spec.ts`, `openspec/specs/analytics/spec.md`, `openspec/specs/season-reveal/spec.md`.

### BL-61 — parked (corrections to the bullet)

A 4-column cell is (W − 100) / 4: 68.75 px at 375. Watermelon is 75–76 px at 13 px and fits from ~400–404 px; 390 and 393 px iPhones still overflow by ~2–3 px. Beyond the bullet's three: True Summer best #16 (column 4, runs into the grid's right padding) and Champagne in Light Spring metals (~73–74 px, column 4). Options for later: (1) move `backlog-3`'s breakpoint to ~404 px (cheapest, changes the 375 board to 3 columns); (2) smaller names (~11.5 px needed, below the 12 px hex); (3) break inside a word (reverses BL-38); (4) a ~2–4 px gap. Each but (3) changes the drawn 375 layout and the design system's `bundle.css`.

## Decisions

### Decision 1 — BL-62: wording of the three 24-hour lines

Sites: report footer (`view.tsx:75`, board 10), report email footer (`render.ts:68`, board 12), how-it-works FAQ (`how-it-works/page.tsx:24`, board HowItWorks). Photo reports only for the two footers.
Options: (a) append one sentence to each line as written: "Google may keep a copy up to 90 days for abuse checks."; (b) rewrite each in the guide notice's shape: "We delete our copy of your face crop within 24 hours of your analysis. Google may keep one up to 90 days for abuse checks."
Trade-off: (a) is the smallest copy change; (b) matches the guide notice word for word but rewrites three approved lines.
Existing tests: `view.test.tsx:103` and `render.test.ts:8` take the new string, either option.
Recommendation: (a).
**Answer:** (b), rewrite like the guide notice; the two test edits approved with it (Oleg, 2026-10-14).

### Decision 2 — BL-62: the three short note titles

Options: (a) leave the titles; (b) add the caveat to each (four more boards, `content.test.tsx:119` edit).
Recommendation: (a) — a title has no room; the FAQ and `/privacy` carry it.
**Answer:** (a), leave the titles (Oleg, 2026-10-14).

### Decision 3 — BL-24: famous photos read twice

Options: (a) `alt=""`, `figure` + `figcaption` with the name, drop `alt` from `Famous`; edits `content.test.tsx:97` (exempt an img inside a figure with a non-empty figcaption, nothing wider) and `:213` (expect `alt=""` and a figcaption with the name); (b) write 36 descriptive alts (new copy), no test edit.
Trade-off: (a) no new copy, the page looks the same, two narrow test edits; (b) keeps the tests, costs 36 new lines of copy.
Recommendation: (a).
**Answer:** Oleg left it to the agent ("change alts on your own, don't ask me"), 2026-10-14; the agent picked (a), which carries the two test edits.

### Decision 4 — BL-62 canvas

Options: (a) agent edits the canvas in place; (b) Oleg draws.
**Answer:** (a) (Oleg, 2026-10-14). Canvas v55 (`1791958706-5aac`):

- Boards "10 Full report" 375 (`Report.dc.html`) and 1280 (`Report-1280.dc.html`): footer "We delete our copy of your face crop within 24 hours of your analysis. Google may keep one up to 90 days for abuse checks."
- Board "12 Report email" (`ReportEmail.dc.html`): footer "We delete our copy of your face crop within 24 hours of your analysis. Google may keep one up to 90 days for abuse checks. We keep your report until you ask us to delete it."
- Board HowItWorks (`HowItWorks.dc.html`): FAQ "What happens to my photo?" as in BL-62 above. The board still said "only after you agree" and "We keep your result" (the v54 sync had not landed), and its crop note said "…and you agree"; both now match the live page ("…and you finish the quiz.") — canvas sync only, no code change.

**Approved:** Oleg, 2026-10-14.

### Decision 5 — BL-62 defeats a third existing test

`apps/web/src/lib/report/view.test.tsx:172` ("has no photo line in a quiz-only footer") checks the photo report's footer with `toMatch(/photo/)` as its control; the v55 line says "face crop". Options: (a) change the marker to `/face crop/`; (b) keep "photo" in the copy and redraw board 10.
Recommendation: (a).
**Answer:** (a), approved (Oleg, 2026-10-14).

## Risks / Trade-offs

- BL-55 has no automated layout proof: `/r/[id]` is unreachable in e2e and `/sample-report` has no trailing left block. The new unit test pins the class; the 1280 px check is by hand.
- BL-24 drops alt text from 36 photos; the caption carries the name for screen readers and image search.
- BL-37's portal URLs stay at `/terms` until Oleg swaps them; `/terms` keeps working meanwhile.
- `backlog-3` is in flight: this branch must take `main` after `backlog-3` merges, with a `docs/backlog.md` conflict to resolve by hand.
