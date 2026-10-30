## 1. Plan, canvas and approvals

- [x] 1.1 Tracker (Claude Docs concept, https://claude.ai/code/artifact/23434923-c1ff-47d6-8ce6-7c86fd14856c): set T22 to "In progress" and add a Log line, newest first, naming `t22-quiz-page`. Note in Launch plan step 4 that the change is planned. Verify: the row's status, the Log line and the step note show.
- [x] 1.2 MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3), edited in place after a bare `read`: add a "Quiz page" board at 375 and 1280 with three states.
  - Question 1: h1, lead, "Question 1 of 4", the veins question with its photos, no Back.
  - Result: family, tagline, reveal line, 6 swatches with hex, the quiz-alone note, "Add a selfie for your exact season" (primary), "Change my answers".
  - No-result: the plugin's title and message, "Let a selfie read your colors", "Change my answers".
  - Below the quiz: what each question tells; why a selfie is more exact, naming Soft Autumn, Soft Summer and Bright Spring; the four families with all 12 season links; 3–5 FAQ items including "What season am I?".
  - The site footer's "More" group gains "Color analysis quiz".

  Reuse the design system's components; no DS change. Verify: the canvas version is noted here, and the board at 375 shows question 1 inside the first screen (812 px). Done 2026-10-30: canvas version 68 (1793361824-88db), boards 23, 23b, 23c; every option ends at about 778 px on the 375 board, and the disabled "Next" sits just below the fold.

- [x] 1.3 Ask the user to approve the board and its copy (CLAUDE.md: the canvas before UI code). If an approved string differs from one the specs fix (the h1, "Question n of 4", the action labels, the note), update `specs/quiz-page/spec.md` first. Verify: the approval and its date are recorded here. No task in groups 3–4 starts before it. Approved by the user 2026-10-30 (canvas version 68), no fixed string changed. Also approved: the shared no-answers message says “Hard to tell” instead of “Not sure”, in `lib/mcp/result.ts`, so the plugin's text changes by that word.
- [x] 1.4 Existing-test edits, two in one file, need the user's yes (CLAUDE.md). Both are in `apps/web/src/lib/site/seo.test.ts`: "lists exactly these URLs once every route is ready" and "are ready, so the sitemap lists the 19 URLs" each gain `"https://seasonly.me/color-analysis-quiz"` after the GPT-alternative URL, and the second is renamed "…the 20 URLs". No other existing test pins the route list, the footer's links or `QuizStep`'s heading element: the flow keeps `h1` by default. If another breaks anyway, stop and ask. Verify: the approval and its date are recorded here. Approved by the user 2026-10-30. A third edit broke as the plan warned: `routes.test.ts`, "holds exactly the public routes", gains the route (the user's yes, 2026-10-30). A fourth: `e2e/sample-report.spec.ts` scrolled a fixed distance, and the footer's new link left its line 3 px above the screen at the bottom of the page, so it gains one scroll line (the user's yes, 2026-10-30).

## 2. Tests first (each cites its scenario at the permanent path)

- [x] 2.1 `site-structure`, `apps/web/src/lib/site/routes.test.ts` (new case) and `seo.test.ts` (after 1.4): cite "The quiz page answers". The route is in `ROUTES`, indexable and ready, with the exact title "Color analysis quiz: what season am I? · Seasonly" and a description. The two sitemap lists match 1.4. Verify: they fail on today's `routes.ts`.
- [x] 2.2 `quiz-page`, `apps/web/src/lib/quiz-page/state.test.ts` (new): pure step machine and link.
  - Forward, back and "Change my answers" keep the answers.
  - `restore(history.state)` accepts only a valid `quizPage` shape and rejects bad steps or answers.
  - `handoffHref` builds the "The selfie link carries the answers" URL, `unsure` included.

  Cite the history and the photo-next-step scenarios. Verify: they fail (module missing).

- [x] 2.3 `quiz-page`, `apps/web/src/app/(site)/color-analysis-quiz/quiz-page.dom.test.tsx` (new, jsdom).
  - "The page opens on question 1": one h1, an h2 legend, "Question 1 of 4", nothing chosen, no Back.
  - "A tap moves on, as in the flow" (fake timers).
  - "The last question waits for the person".
  - "Back inside the quiz" (popstate with the pushed state).
  - "Back from the photo guide returns to the result" and "Reload on the result" (mount with `history.state.quizPage`).
  - "A Summer result" and "Nothing is sent" (a `fetch` spy sees no `/api/` call).
  - "Every answer is "Hard to tell"" and "Answers that cancel out".
  - "Changing the answers".

  Verify: they fail.

- [x] 2.4 `quiz-page`, same DOM file: "The page and the plugin agree". For every one of the 750 answer combinations, the page's rendered family and 6 hex codes equal `quizResult(answers).structured`, or both give the same no-result reason. Render the result view directly per combination, not through clicks. Verify: it fails before 3.4.
- [x] 2.5 `quiz-page`, `apps/web/src/app/(site)/color-analysis-quiz/page.test.tsx` (new, `renderToStaticMarkup`):
  - "The word floor without the quiz": ≥ 250 words outside the fieldset, header and footer.
  - No placeholder.
  - "Every season page is linked": 12 hrefs.
  - "The footer link": render `SiteShell` and find "Color analysis quiz" → `/color-analysis-quiz` in the "More" group.

  Verify: they fail.

- [x] 2.6 `quiz`, `apps/web/src/app/(flow)/analyze/_quiz/` (new case in the existing DOM test, or a new `quiz.dom.test.tsx` if none exists): "The questions on the quiz page". With `heading="h2"` and no `onBack`, the legend holds an h2 and no Back button renders. Without props the markup is unchanged: an h1 and a Back button. Verify: fails today.
- [x] 2.7 `capture-flow`, `apps/web/src/app/(flow)/analyze/flow-state.test.ts` and `flow.dom.test.tsx` (new cases):
  - "Opening with the quiz page's answers" (guide shown; the address keeps `utm_source`).
  - "A passing photo goes straight to the analysis" (one request with the four answers, no quiz rendered).
  - "The quiz-only path keeps the answers".
  - "An answer the core does not accept".
  - "Reload after opening with answers".
  - "The camera link with the quiz page's answers".
  - `preset-answers` is ignored once the trail is not empty.

  The existing `start=camera` cases stay green unchanged. Verify: the new cases fail.

- [x] 2.8 `analytics`, the quiz-page DOM file plus `e2e/funnel.spec.ts` (new tests only):
  - "A result on the quiz page" and "A no-result on the quiz page" (spy on `track`: `quiz_page_completed`, `result` only).
  - "The result shown again" (a remount from `history.state` sends nothing).
  - E2E "From the quiz page to the photo": the recorded `$pageview` for `/analyze` carries the four parameters, followed by `photo_checked` and `analysis_result`, and no `quiz_completed`. Use the CC0 fixture face and no paid call, as the funnel spec does.

  Verify: they fail.

- [x] 2.9 E2E `e2e/site-structure.spec.ts`: "The quiz page answers" (200, no `noindex`, canonical) and "The quiz page is indexed" (`/sitemap.xml` lists it). Verify: they fail against today's build.

## 3. Code

- [x] 3.1 `apps/web/src/lib/site/routes.ts`: the `/color-analysis-quiz` entry (title, description, `indexable: true`, `ready: true`). Update the site-structure route table at archive. Verify: 2.1 passes after 3.5 adds the page file (the "Every page file is a mapped route" check pairs them).
- [x] 3.2 `apps/web/src/app/(flow)/analyze/_quiz/quiz.tsx`: `heading?: "h1" | "h2"` and optional `onBack` (design decision 3). Verify: 2.6 passes; `flow.dom.test.tsx` is unchanged and green.
- [x] 3.3 `apps/web/src/lib/quiz-page/` (pure): the state type, `next`, `popped`, `change`, `restore`, and `handoffHref` (design decisions 4 and 6). The Back action is the browser's own `history.back()`, and `popped` takes the entry's step with the newest answers, so no `back` is needed. Verify: 2.2 passes.
- [x] 3.4 `apps/web/src/app/(site)/color-analysis-quiz/quiz-page.tsx` (client): the progress line, `QuizStep` with `heading="h2"`, `pushState`/`popstate`/mount restore, focus on the new step's heading after a step change (none on mount), the result from `quizResult(answers).structured` with `SwatchGrid`, the no-result, both actions, and `track("quiz_page_completed", { result })` in the "See my result" handler. Verify: 2.3, 2.4 and the unit half of 2.8 pass.
- [x] 3.5 `apps/web/src/app/(site)/color-analysis-quiz/page.tsx`: `metadata = pageMetadata("/color-analysis-quiz")`, the h1, the lead, the island, and the approved sections with `SeasonLink`s and `Faq` (design decision 2). Verify: 2.1 and 2.5 pass (all but the footer case).
- [x] 3.6 `apps/web/src/components/site-chrome.tsx`: "Color analysis quiz" after "Sample report" in "More". Verify: 2.5's footer case passes.
- [x] 3.7 `apps/web/src/app/(flow)/analyze/flow-state.ts` and `flow.tsx`:
  - the `preset-answers` event (guide, empty trail only);
  - the four keys read and validated with `QuizAnswersSchema` in the mount-only layout effect, after `start`;
  - the strip set `{start, veins, jewelry, sun, hair}`;
  - router sync whenever something was stripped (design decision 6).

  Update the capture-flow Public Interface and Behavior notes at archive. Verify: 2.7 passes, and every existing `start=camera` test passes unchanged.

## 4. Gates, review, archive

- [x] 4.1 `pnpm fix`, `pnpm test`, `pnpm test:eval` (no eval change expected: the core is untouched). Verify: all green.
- [x] 4.2 `pnpm --filter web build`, then:
  - grep `.next/static/chunks` for `@modelcontextprotocol` (design decision 5);
  - E2E locally: `e2e/site-structure.spec.ts`, `e2e/funnel.spec.ts`, `e2e/analysis-flow.spec.ts`, `e2e/design-review.spec.ts`;
  - screenshots of `/color-analysis-quiz` at 375 × 812 (question 1 and the result) and at 1280, compared with the approved board.

  Verify: no MCP SDK in client chunks, E2E green or any sandbox-only failure named as such, and the screenshots match the board. Done 2026-10-30: 0 chunks hold `@modelcontextprotocol`, the four E2E files plus a new `e2e/quiz-page.spec.ts` pass on the real router, and the 375 and 1280 screenshots match boards 23 and 23b.

- [ ] 4.3 Phase review in a fresh `general-purpose` subagent (`phase-review` skill); fix its findings and log unfixed ones in `docs/backlog.md`.
  - Archive (`/opsx:archive`). Re-add the `quiz-page` spec's Public Interface, Behavior and Edge Cases. Update the capture-flow, quiz, site-structure and analytics notes (the event table row). Add the `quiz-page` row (`apps/web/src/app/(site)/color-analysis-quiz/**`, `apps/web/src/lib/quiz-page/**`) to `openspec/specs/README.md`.
  - Push, open a PR to `main` and turn on auto-merge with a merge commit.
  - Set T22 Done in the Tracker and step 4 in the Launch plan.

  Verify: PR green and merged.

- [ ] 4.4 After deploy: in Search Console, request indexing for `https://seasonly.me/color-analysis-quiz` (Claude in your Chrome, your yes). Verify: noted in the Launch plan's step 1 or 4 row.
