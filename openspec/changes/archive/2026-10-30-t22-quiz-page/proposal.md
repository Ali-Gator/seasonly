## Why

"color analysis quiz" (8,100 US searches a month, KD 20) and "what season am i" (2,900, KD 33) have no page on seasonly.me (Semrush, Launch plan "Search targets", read 2026-10-27). The quiz exists only inside `/analyze`, which is noindex on purpose and opens on the photo guide, so a searcher who wants a quiz lands on a camera. This is Tracker row T22, Launch plan step 4, with the canvas due Nov 6. colorwise.me owns the quiz query today but not the palettes, which our season pages carry.

## What Changes

- **A new indexable page, `/color-analysis-quiz`.** It is in the `(site)` group with the site header and footer, and its title is "Color analysis quiz: what season am I? · Seasonly". The four existing questions sit in the first screen, the same questions, options and example photos as the flow. Below them is real content for search: what each question tells, why a selfie is more exact, the four families with links to the 12 season pages, and a short FAQ.
- **A family result on the page, worked out in the browser.** After "See my result" the page shows the season family, its tagline, reveal line and 6 highlight colors, plus "From the quiz alone. A selfie gives your exact season and all 30 colors." These are the facts the chat plugin's card shows, from the same core function, so the two never disagree. Answers that point nowhere get the plugin's no-result title and message. Nothing is sent to a server and no report is saved. This was the user's choice on 2026-10-28.
- **The photo as the next step.** The result's primary action, "Add a selfie for your exact season", opens `/analyze` with the four answers in the address. The flow opens on the photo guide with those answers kept and the quiz marked done. After a passing photo it goes straight to the analysis, and the quiz is not asked again. The address then drops the answers, as it drops `start=camera` today. Answers that fail the core's validation are ignored, and the flow opens as usual. "Change my answers" goes back to question 1 with the answers kept.
- **Back works on the page.** Each question and the result is one browser history entry holding the answers. Back steps through the quiz. Back from `/analyze` returns to the result, and a reload of the page keeps where the person was.
- **Analytics.** One new event, `quiz_page_completed`, fires on "See my result" with `result`: the family, or the no-result reason. It carries no answers. The hand-off shows as the `/analyze` pageview whose URL carries the answers. The flow's `quiz_completed` does not fire for a person who skipped the quiz.
- **Found from every site page.** The footer's "More" group gains "Color analysis quiz", the first internal link to the page.
- **Canvas first.** A "Quiz page" board in the MVP canvas, at 375 and 1280, with the question, result and no-result states, waits for the user's approval before any UI code (CLAUDE.md).
- **Not in scope:**
  - Pre-filling `/analyze` from the chat plugin's link (BL-32 stays deferred on its funnel trigger). This change's hand-off makes that a link change later.
  - New quiz questions, or a quiz that gives Soft Autumn, Soft Summer or Bright Spring: only a photo gives those (season-classifier).
  - Landing or season-page copy changes.
  - Requesting indexing in Search Console after deploy is done by hand, as in step 1.

## Capabilities

### New Capabilities

- `quiz-page`: the `/color-analysis-quiz` page. It covers the four questions outside the flow, its own history, the family result and no-result in the browser, the hand-off link to `/analyze`, and the page's content and word floor.

### Modified Capabilities

- `site-structure`: the public route table gains `/color-analysis-quiz` (static, may be indexed).
- `site-content`: the core-routes scenario's sitemap count grows from 19 to 20 URLs with the quiz page.
- `capture-flow`: `/analyze` takes the quiz page's answers from the address. It opens on the guide with the quiz done and drops the answers from the address, so the camera link's "the one change to the address inside the flow" becomes two.
- `quiz`: the "Step 2 of 3 · Question n of 4" progress row applies inside the flow only. The quiz page shows its own progress.
- `analytics`: the `quiz_page_completed` event and what it may carry.

## Impact

- New `apps/web/src/app/(site)/color-analysis-quiz/` (`page.tsx` plus a client `quiz-page.tsx`), and `apps/web/src/lib/quiz-page/` for the pure step machine and the hand-off link. The README row for `quiz-page` is added at archive.
- `apps/web/src/lib/site/routes.ts`: one `ROUTES` entry, `ready: true` once the content ships in this change.
- `apps/web/src/app/(flow)/analyze/flow-state.ts` and `flow.tsx`: a `preset-answers` event read from the address next to `start=camera`, and the address cleanup extended to the four answer keys.
- `apps/web/src/app/(flow)/analyze/_quiz/quiz.tsx`: `QuizStep` takes a heading level, because the page's h1 is its title, and an optional Back.
- `apps/web/src/lib/mcp/result.ts`: `quizResult` is reused by the page. One word of its `no-answers` message changes, “Not sure” to “Hard to tell”, the option's real label (the user's yes, 2026-10-30). The plugin's behavior is otherwise unchanged.
- `apps/web/src/components/site-chrome.tsx`: one footer link.
- Tests: two existing assertions need the user's yes. `apps/web/src/lib/site/seo.test.ts` pins the sitemap's URL list twice, as "19 URLs" and as every route ready; both gain `/color-analysis-quiz`. New unit, DOM and E2E tests cover the page, the hand-off and the event.
- No new dependency, no migration, no paid run. The analysis core is untouched, so the eval cannot move.
- After deploy: request indexing for `/color-analysis-quiz` in Search Console (by hand).
