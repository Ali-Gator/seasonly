## Context

See proposal.md for why. Today the quiz lives only in `/analyze`.

- `QuizStep` (`_quiz/quiz.tsx`, quiz) is a stateless component: question index, answers, `onAnswer`, `onNext`, `onBack`. It renders the legend as an `h1` inside the `legend` and always renders a Back button.
- The flow's reducer (`flow-state.ts`, capture-flow) holds `answers` and `quizDone`. `afterPhoto` already sends the analysis straight away when `quizDone` is true, and so does the quiz-only path.
- `flow.tsx` already reads one query parameter, `start=camera`, in a mount-only `useLayoutEffect`. It strips that parameter from the address and syncs Next's router with a timer, and its rules for raw `&` pairs and Next's history keys are pinned by tests.
- The chat plugin's `quizResult(answers)` (`lib/mcp/result.ts`) is a pure function over the core. It returns the family, tagline, reveal line, 6 highlights and the quiz-alone note, or the no-result title and message. `QuizAnswersSchema` (core) validates untrusted answers.
- Site pages declare metadata through `pageMetadata` over `ROUTES`. The sitemap lists ready routes. How it works and the season pages share `Faq`, and the season list uses `SeasonLink`.

## Goals / Non-Goals

**Goals:**

- One source for questions, options and photos: the quiz page renders `QuizStep`, not a copy.
- One source for the quiz-alone result: the page and the plugin both call `quizResult`.
- A hand-off that reuses the flow's existing address-cleanup path rather than a second mechanism.

**Non-Goals:**

- No server route, no report row, no BotID on the quiz page: nothing is sent.
- No change to the classifier, the plugin's output or its link (BL-32).
- No `Quiz` structured data: Google has no quiz rich result for this kind of page, so it would add code with no visible effect.

## Decisions

1. **The route is `/color-analysis-quiz` in `(site)`.** It is the exact 8,100-search phrase, and "what season am I" goes into the title and h1 ("Color analysis quiz: what season am I?"). The title is 49 characters with " · Seasonly". The page needs the site header and footer, so it goes in the `(site)` group. Alternatives: `/quiz` is shorter but drops the keyword from the URL. `/what-season-am-i` targets the smaller query. Both rejected.

2. **The page is a server `page.tsx` with one client island.** `page.tsx` renders the h1, the lead, the content sections, `Faq` and the `SeasonLink`s statically. `quiz-page.tsx` (`"use client"`) owns the quiz and the result. The island server-renders question 1, so crawlers see a real question. The quiz's copy and photos stay in `QuizStep`'s `QUIZ` map, unchanged.

3. **`QuizStep` gains two optional props, and the flow's output does not change.**
   - `heading?: "h1" | "h2"`, default `"h1"`, sets the element inside the `legend`. The page passes `"h2"` because its h1 is the title.
   - `onBack` becomes optional. Without it, no Back button renders, which is the page's question 1.

   The page draws its own "Question n of 4" line above the fieldset. `StepProgress` is the flow's three-step bar, and "Step 2 of 3" means nothing on the page. Alternative: a page-specific copy of the quiz markup. Rejected, because the options and photos would then drift.

4. **The page's step machine is pure, in `lib/quiz-page/`.**
   - State: `{ step: number | "result"; answers: QuizAnswers }`, where 0–3 is a question.
   - Each forward move calls `history.pushState({ ...history.state, quizPage: state }, "")`. Spreading the current state keeps Next's own keys, and the flow's `{ depth }` entries show this works with Next 16's patched history.
   - A `popstate` listener sets the state from `event.state.quizPage`. On mount, an effect restores `history.state?.quizPage` when its shape is valid (`QuizAnswersSchema` plus a step check), which covers Back from `/analyze` and a reload.
   - The quiz page has no async step and no other route's entries to guard, so it needs none of the flow's depth bookkeeping.
   - Alternative: keep the step in React state only. Rejected: a phone's back gesture would leave the page mid-quiz, and Back from `/analyze` would start the quiz over.

5. **The result calls `quizResult(answers).structured` and ignores its `link`.** It renders the family as a heading, the tagline, the reveal line, a 6-color `SwatchGrid` with names and hex, and the note, in the board's layout. A no-result renders the plugin's title and message. Importing from `lib/mcp` keeps a single copy of the words. That module imports only the core and `lib/site/routes`, so it adds nothing server-only to the client bundle. Task 4.2 checks the built client chunks for `@modelcontextprotocol`. Alternative: move `quizResult` to a shared `lib/quiz-result/`. Rejected for now: it would mean a chat-plugin file move and spec edit for a single new caller.

6. **The hand-off uses four named query parameters.** The link is `/analyze?veins=…&jewelry=…&sun=…&hair=…`, built by `handoffHref(answers)` in `lib/quiz-page/`.
   - The flow's mount-only `useLayoutEffect` already parses `location.search`. It now also collects those four keys, validates them with `QuizAnswersSchema`, and requires all four.
   - When they pass, it dispatches `{ type: "preset-answers", answers }`. The reducer sets `answers` and `quizDone: true` only on the opening guide with an empty trail, as `start-camera` does. If `start=camera` is also present, `start-camera` runs first, so the photo guide is skipped as on the landing.
   - The cleanup filter generalises from "decoded key is `start`" to a set `{start, veins, jewelry, sun, hair}`. The router-sync timer then runs whenever anything was stripped, not only for `start`.
   - Alternatives considered:
     - `sessionStorage`: keeps answers out of URLs, but cannot cross origins for BL-32's plugin link, and it survives a reload, which the flow promises it does not.
     - One packed parameter (`?quiz=green.gold.burn-tan.dark`): opaque in analytics, and its order is fragile.

   Both rejected.

7. **Analytics: one event plus the pageview.** `quiz_page_completed { result }` fires from the "See my result" handler, never from a render or a restore. `result` is `seasonFamily(season)` or the no-result reason.
   - The hand-off is counted from the `/analyze` `$pageview` URL, which still carries the answers: PostHog's history-change pageview fires on Next's push, before the flow strips the address, as `?start=camera` shows today.
   - Quiz answers are not personal data, and the flow's `quiz_no_result` already sends them. Still, the pageview URL is the only place they appear for this path, and no event property carries them.

8. **The footer link goes in `site-chrome.tsx`'s "More" group**, after "Sample report". `site-chrome.tsx` has no spec row; the quiz-page spec states the link's requirement.

9. **The canvas comes before UI code.** The MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) gains a "Quiz page" board at 375 and 1280 with three states: question, result and no-result. The result and no-result take the plugin card's words. The page-level copy (lead, sections, FAQ) is drafted on the board for the user's approval. If the approved copy differs from a string the specs fix (the h1, the actions, "Question n of 4"), the spec delta is updated before tests.

## Risks / Trade-offs

- [The page and `/analyze` compete for "color analysis quiz"] → `/analyze` is noindex, so they cannot compete.
- [colorwise.me ranks with a longer quiz] → Our edge is the follow-up: a family plus colors right away, then a photo that keeps the answers. Step 5's depth work and the Jan 15, 2027 checkpoint judge it.
- [A shared link to `/analyze?veins=…` pre-fills a stranger's answers] → The answers are four multiple-choice values, validated and dropped from the address at once. The worst case is that the recipient's result uses someone else's answers, which weigh 20% beside their own photo (season-classifier).
- [A reload of `/analyze` after the hand-off loses the answers] → It matches the flow's existing rule ("a reload starts at the guide"), and Back still returns to the quiz page's result, which holds them.
- [Restoring from `history.state` hydrates question 1, then jumps to the result] → The restore runs in a mount effect, so there is one frame of question 1. The board's result sits in the same first-screen slot, and the jump replaces content of the same height region. Acceptable for a Back or a reload.
- [`QuizStep`'s heading change breaks the flow's focus rule (`main h1`)] → The default stays `h1`, and the flow passes nothing. The page's island never moves focus on mount. On each step change it focuses the new question's legend heading, as the flow does, through the same `tabIndex={-1}` heading.

## Migration Plan

Deploys with the next production build; the sitemap gains one URL. Rollback is a revert: the page 404s, the footer link goes, and `/analyze` ignores the four parameters again. After deploy, request indexing for `/color-analysis-quiz` in Search Console (task 4.4).
