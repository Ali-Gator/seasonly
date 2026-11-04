## 1. Plan, canvas and approvals

- [x] 1.1 MVP canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3), edited in place: 16 Season 375 and 1280 gain "Makeup and hair", "Outfit ideas" and the extra-names line before Famous; new board 16c holds all 12 seasons' outfits and names; 19 GptAlternative 375 and 1280 gain the publisher line (BL-113). Verify: canvas version noted here. Done 2026-11-04: version 76 (1793802418-6254), boards checked rendering in Chrome.
- [x] 1.2 Ask the user to approve the boards and the copy sheet. Verify: approval and date recorded here. Approved by the user 2026-11-04 "as drawn".
- [x] 1.3 Existing-test edit for BL-109 needs the user's yes: the doc comment of the alias loop in `e2e/site-structure.spec.ts` gains `{@link openspec/specs/site-structure/spec.md#scenario-a-dark-name}`. Verify: approval recorded here. Approved by the user 2026-11-04.
- [x] 1.4 Tracker (https://claude.ai/artifact/5MZDhho5AxYk1UDasHkdAT): add row T23 "Season page depth (t23-season-page-depth)" In progress, and a Log line naming the change. Verify: the row and Log line show.

## 2. Tests first (each cites its scenario at the permanent path)

- [x] 2.1 `apps/web/src/lib/site-content/content.test.tsx`, `/seasons/<slug>` block, new cases:
  - "Makeup and hair match the report" and "Every season shows its makeup and hair": for all 12, the `Lip colors`, `Blush colors`, `Eye colors` and `Hair colors` grids equal `PALETTES[slug]`'s lists; the text holds `makeupIntro` and `hairTip`.
  - "Outfits use only the season's own colors": for all 12, the `Everyday outfit`, `Work outfit` and `Evening outfit` grids are three swatches. The first is in `best`, the second in `neutrals`, the third in `metals`; none is in `avoid`; the three best colors differ.
  - "An outfit reads as a sentence": the Soft Autumn Everyday grid is Sage, Oatmeal, Brushed Gold, and the exact sentence shows. Also unit-check the a/an rule on the helper ("An emerald dress…").
  - "The new sections sit before the famous people": in the markup, "Best metals" < "Makeup and hair" < "Outfit ideas" < "Famous".
  - "The extra names" and "The extra names on Soft Autumn": 3–6 names, unique, none in `famous`, the line comes before `FAMOUS_NOTE.before`; the exact Soft Autumn line.

  Verify: the new cases fail on today's code; existing cases unchanged.

- [x] 2.2 `e2e/site-structure.spec.ts`: BL-109 doc-comment link only (approved in 1.3). Verify: `pnpm test:unit` citation gate passes.

## 3. Code

- [x] 3.1 `apps/web/src/lib/report/sections.tsx`: export `MakeupAndHair({ season, overline })`; `ReportSections` renders it with the same props as today. Verify: report tests (`view.test.tsx`, sample-report tests) pass unchanged.
- [x] 3.2 `apps/web/src/lib/site-content/seasons.ts`: `outfits` and `alsoTyped` for the 12 seasons, copied from canvas board 16c (approved); `seasonOutfits(slug)` resolves names and builds the sentence, throwing on a name not in the right list. Verify: 2.1's outfit cases pass.
- [x] 3.3 `apps/web/src/app/(site)/seasons/[season]/page.tsx`: render `MakeupAndHair` and the three outfits after Metals, and the `alsoTyped` line between the photos and `FAMOUS_NOTE`; doc comment cites the three new requirements. Verify: all of 2.1 passes.
- [x] 3.4 `docs/backlog.md`: delete BL-109 and BL-113. Verify: neither id is in the file.

## 4. Gates, review, archive, ship

- [x] 4.1 `pnpm fix`, `pnpm test`, `pnpm test:eval` green (the eval must not report `results.json` stale, since the core is untouched). Verify: the three commands exit 0.
- [x] 4.2 Check the page in a browser at 375 and 1280 (local dev server): the sections render as on boards 16. Verify: screenshot.
- [x] 4.3 Phase review (`/code-review high`) in a fresh `general-purpose` subagent; fix findings; log what stays unfixed as BL items. Verify: findings and their outcome noted here. Done 2026-11-04, no blocking issue. Fixed: design and tasks named `outfit()`/`Trio` (now `seasonOutfits`/`Outfit`); `alsoTyped` typed as at least three names and its line built once in `alsoTypedLine`; a second literal names test (True Summer, three names); tests now pin the outfit order and the hair tip opening the Hair group; `an()` returns lower case and the sentence is capitalized once. Logged: BL-116 (a/an by first letter).
- [ ] 4.4 `/opsx:archive`, then hand-edit `openspec/specs/site-content/spec.md` Public Interface and Behavior for `outfits`, `alsoTyped` and `MakeupAndHair`. Verify: `openspec validate --specs` passes.
- [ ] 4.5 Push, open the PR to `main`, enable auto-merge with a merge commit. Verify: CI, e2e and validate green; PR merged; production serves the new sections on `/seasons/soft-autumn`.
- [ ] 4.6 Tracker: T23 Done with a Log line; Launch plan step 5 marked done. Verify: the row and step show.
