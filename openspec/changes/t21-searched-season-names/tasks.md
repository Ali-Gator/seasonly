## 1. Plan and approvals

- [ ] 1.1 Tracker (Claude Docs concept, https://claude.ai/code/artifact/23434923-c1ff-47d6-8ce6-7c86fd14856c): set T21 to "In progress" and add a Log line, newest first, naming `t21-searched-season-names`. Verify: the row's status and the Log line show.
- [ ] 1.2 Existing-test edit, one, needs the user's yes (CLAUDE.md). In `apps/web/src/lib/site/routes.test.ts`, the `SEASON_ALIASES` `toEqual` gains `"dark-autumn": "deep-autumn"` and `"dark-winter": "deep-winter"`. No other existing test pins a season title, a season h1 other than Soft Autumn's, or How it works' FAQ markup. If another breaks anyway, stop and ask. Verify: the approval and its date are recorded here.

## 2. Tests first (each cites its scenario at the permanent path)

- [ ] 2.1 `site-structure`, `apps/web/src/lib/site/routes.test.ts`: after 1.2's edit, cite "A dark name" on the alias case; new cases for "A season with a second name" (Deep Autumn's exact title, its description contains "Deep (Dark) Autumn") and "A season without one" (Soft Autumn's exact title); a case that every `SEASON_ALIASES` key is a second name hyphenated and lowercased and every second name has one key. Verify: they fail on today's `routes.ts`.
- [ ] 2.2 `site-content`, `apps/web/src/lib/site-content/content.test.tsx`: new cases for "A page with a second name" (Deep Autumn h1 text, "Also called Dark Autumn." before the summary, "Find out if you're a Deep Autumn" still present) and "A page without one" (Soft Autumn h1, no "Also called"). Verify: they fail on today's page.
- [ ] 2.3 `site-content`, same file: "The questions on a page with a second name" (Deep Autumn: six `<summary>` texts in order, the first `<details>` has `open`, the section's index is after "Neighbouring seasons" and before "Is this you?"), "The questions on a page without one" (Soft Autumn: five, first is the avoid question, open), and `it.each(SEASON_SLUGS)` for "Answers match the shared copy" (first three avoid names, `hairTip`, `makeupIntro`, every metal and metal-to-go-easy-on name, `href="/analyze"` inside the section). Verify: they fail on today's page.
- [ ] 2.4 How it works keeps its FAQ: the existing How it works cases (including "The FAQ names Google's copy") pass unchanged after 3.3. Verify: run them before and after 3.3; same result.

## 3. Code

- [ ] 3.1 `apps/web/src/lib/site/routes.ts`: `SECOND_NAMES`, `secondName`, `searchName`; `routeAt` fills `{season}` with `searchName`; `SEASON_ALIASES` derived from `SECOND_NAMES` (design decisions 1–2). Update the site-structure Public Interface block at archive. Verify: 2.1 passes; `pnpm typecheck`.
- [ ] 3.2 `apps/web/src/lib/site-content/faq.tsx`: `Faq({ id, title, items })` with How it works' markup (design decision 4). `seasonFaq(slug)` in `apps/web/src/lib/site-content/seasons.ts` (design decision 5). Verify: typecheck.
- [ ] 3.3 `apps/web/src/app/(site)/how-it-works/page.tsx` renders its FAQ through `Faq`. Verify: 2.4 passes and the rendered How it works HTML is byte-identical to before (compare `renderToStaticMarkup` output in a scratch script).
- [ ] 3.4 `apps/web/src/app/(site)/seasons/[season]/page.tsx`: h1 `searchName`, the "Also called" opener inside the summary paragraph, the FAQ section between the neighbours and "Is this you?". Verify: 2.2 and 2.3 pass.

## 4. Gates, review, archive

- [ ] 4.1 `pnpm fix`, `pnpm test`, `pnpm test:eval` (no eval change expected: the analysis is untouched). Verify: all green.
- [ ] 4.2 E2E locally: `e2e/site-structure.spec.ts` (redirects now include `dark-autumn` and `dark-winter`) and `e2e/design-review.spec.ts`; plus one screenshot of `/seasons/bright-winter` at 375 × 812 to see the double-name h1 wrap and the first swatch still in view. Verify: green, and the screenshot checked.
- [ ] 4.3 Phase review in a fresh `general-purpose` subagent (`phase-review` skill); fix findings; log unfixed ones in `docs/backlog.md`. Archive (`/opsx:archive`), re-add Public Interface, Behavior and Edge Cases notes to the two permanent specs, push, open a PR to `main`, auto-merge with a merge commit. Set T21's code part done in the Tracker and Launch plan step 2. Verify: PR green and merged.
- [ ] 4.4 After deploy: in Search Console, request indexing again for the eight renamed season pages (Claude in your Chrome, your yes). Verify: noted in the Launch plan's step 1 row.
