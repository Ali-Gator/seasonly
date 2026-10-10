## 1. Backlog repair, copy, images and canvas (user gate)

- [x] 1.0 Before the first commit, create the branch `t9-site-content` from `origin/main` (merge commit 71822be or later). The planning artifacts go in its first commit.

- [x] 1.1 Repair `docs/backlog.md`. Merged PR #15 cites BL-18 to BL-22, but none of them reached the file.
  - Rebuild BL-18, BL-19 and BL-21 from `openspec/changes/archive/2026-10-10-t8-photo-privacy/tasks.md` (7.1 and 6.x) and `openspec/specs/data-retention/spec.md`:
    - BL-18: the daily cron leaves a crop up to about 49 h, deferred until Vercel Pro or before paid promotion (T15);
    - BL-19: the PostHog cookie is set without consent, deferred until paid promotion or a complaint;
    - BL-21: `/seasons/Soft-Autumn` answers 200 under `CI=1` E2E on macOS's case-insensitive disk.
  - Recover BL-20 and BL-22 from the "Photo privacy t8 application" session's phase review. If they cannot be found, ask the user.
  - Set `_Next id:_` to BL-23.

  Done when all five items are in the file, in the house shape. This is a docs-only commit, so it can land first.

  Done 2026-10-10: all five recovered verbatim from the t8 session's backlog write (BL-20 and BL-22 included); `_Next id:_` is BL-23.

- [ ] 1.2 Generate the example photos (design.md decision 4). This is a **paid run**:
  - Ask the user for a yes first, naming the model and the estimated cost.
  - After the yes, write `scripts/generate-photos.ts` and run it once. It makes the base portrait, three edited "bad" twins (ceiling lamp, foundation and bronzer, beauty filter) and the face crop for draping.
  - Results go to the scratchpad. Nothing goes into the repo before 1.5.

  Done when the images exist and the model, cost and prompts are recorded here.

- [ ] 1.3 Propose three famous people per season (design.md decision 5). Make a table with these columns: season, name, source for the season (title and URL, opened, not taken from a snippet), Commons file URL, author, license.
  - Only CC0, CC BY and CC BY-SA photos qualify.
  - Publish the table in a scratch Artifact for the user.

  Done when the user approves the 36 rows. If a season cannot reach three, the user decides between fewer figures (which needs a delta update to "three") and another figure.

- [ ] 1.4 Draft the missing copy in the same scratch Artifact:
  - The `about` description for all 12 seasons: at least 120 words each, all distinct, written from `SEASON_COPY` and `PALETTES`, never contradicting them.
  - Three neighbours per season, each with a one-line `why`.
  - For How it works:
    - the several-faces item, under its retake tip title "More than one face" (`packages/analysis/src/photo-check/tips.ts`);
    - the disagree line, from `AGREEMENT_COPY.differ`;
    - softer wording for "never a wrong answer".
  - For the GPT page: the retirement date and what does not carry over, re-checked against OpenAI's FAQ (design.md Context), with the source link.

  Done when the user approves the copy.

- [ ] 1.5 Update the canvas (https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) and the design system (https://claude.ai/code/artifact/69473bf0-748a-4814-892f-1cfe8b16ddac). Edit in place with the user's yes:
  - **Season and Season-1280:** fill the "More about" text and the famous section with photos, credits, sources and the no-endorsement note, all from 1.3 and 1.4. Use highlight-based neighbour strips.
  - **Main and Landing-1280:** real tip photos, and season strips from `PALETTES[slug].highlights.slice(0, 4)`.
  - **Seasons and Seasons-1280:** the same strips.
  - **HowItWorks:** the five rejections, the disagree line and the softened claim.
  - **GptAlternative:** the sourced facts and the sample face in its draping pair. If the approved h1 or lead changes, also update the route's title and description in `apps/web/src/lib/site/routes.ts` (site-structure's path) in 3.9.
  - **SampleReport:** the sample face.
  - **Guide (02):** all six tip photos.
  - **Design system:** switch the Icon glyphs to Lucide (decision 6) and bump the DS version.

  Done when the user approves the boards in chat. Record the date and canvas version here and in the `mvp-design-canvas` memory. **Gate:** no task in sections 2–4 starts before this one is checked. If the approved copy differs from a delta, update the delta first.

- [ ] 1.6 Ask the user to approve these edits to existing tests (design.md decision 8):
  - `apps/web/src/lib/site/routes.test.ts`: "marks a stub noindex and leaves it out of the sitemap" and "drops noindex and lists a route once it is marked ready" move to a fixture route list.
  - `e2e/site-structure.spec.ts`: "a stub page carries noindex" is deleted.
  - Any DS test that pins icon path data (check `apps/web/src/components/ds/ds.test.tsx`).

  Done when the user's yes is recorded here.

  Approved 2026-10-10: the user approved the plan, which lists these edits ("All approved").

## 2. Tests first (they fail until section 3)

The pre-commit hook runs `test:unit`, so a red test is committed together with the section 3 code that turns it green, never on its own.

- [ ] 2.1 `apps/web/src/lib/site-content/content.test.tsx`: one test per `site-content` scenario, each citing `{@link openspec/specs/site-content/spec.md#…}`:
  - no placeholder and the word floor, for every core page and all 12 slugs (decision 7);
  - the landing sample's 12 names and hex codes are Soft Autumn colors, and the 12-seasons links and strips match the highlights;
  - a season page's palette sections equal `PALETTES[slug]` in order;
  - each `about` has at least 120 words and all 12 differ;
  - neighbours: three links, a `why` each, and the first 4 highlights;
  - famous: three figures, each with an image, alt text, a Commons credit link, a license and a source link, plus the no-endorsement note;
  - How it works: the five tip titles (from `tips.ts`) and the disagree line;
  - the GPT page: the date and a link to OpenAI's source;
  - every example image has non-empty alt text.

  Done when `pnpm test:unit` runs them and they fail on the stubs.

- [ ] 2.2 The `site-structure` tests:
  - make the two approved fixture edits in `routes.test.ts`;
  - in `seo.test.ts`, add the `site-content` case "The core routes are ready": `indexedUrls()` on the real `ROUTES` equals the 19 URLs.

  Done when the new case fails and the edited ones pass.

- [ ] 2.3 Test for `capture-flow` "The guide's example photos": the guide renders three tip cards with six `img` elements, each with alt text and no `sn-slot__label`. Add the same assertion to the E2E guide case in `e2e/`.

  Done when both fail on the placeholders.

- [ ] 2.4 Test for `ui-components` "A Lucide glyph": `Icon name="trash" size={20}` renders Lucide's Trash2 at 20 × 20 with `stroke="currentColor"`. The decorative and labeled cases stay unchanged.

  Done when it fails on the placeholder glyphs.

- [ ] 2.5 E2E `e2e/sample-report.spec.ts` for "Nothing is sent": open `/sample-report`, scroll to the end, and assert no `/api/` request and none of the nine custom funnel events (reuse `funnel.spec.ts`'s PostHog route stub). Delete the approved stub case in `e2e/site-structure.spec.ts`.

  Done when the spec runs. It may pass on the stub already; it guards the real page.

## 3. Build

- [ ] 3.1 Add `lucide-react` to `apps/web` and map `Icon`'s 11 names to it (decision 6). Done when 2.4 and every existing DS test pass.

- [ ] 3.2 Put the approved images in `apps/web/public/images/examples/` and `apps/web/public/images/famous/<slug>/` as WebP, sized per decision 4 and decision 5. Add `apps/web/src/lib/site-content/images.ts` with paths, alt text and credits. Done when every file is at most about 80 KB and typecheck passes.

- [ ] 3.3 Add `apps/web/src/lib/site-content/seasons.ts`: a `Record<SeasonSlug, SeasonContent>` with `about`, `neighbours` and `famous`, holding the approved copy (decision 1). Done when typecheck passes and the `about` and neighbour cases of 2.1 pass.

- [ ] 3.4 Move the report sections out of `apps/web/src/lib/report/view.tsx` into `ReportSections` in `apps/web/src/lib/report/sections.tsx` (decision 3). Done when every report-page unit and E2E test passes unchanged.

- [ ] 3.5 Landing (`(site)/page.tsx`) from Main and Landing-1280. Done when the landing cases of 2.1 pass and `e2e/funnel.spec.ts` stays green.

- [ ] 3.6 `/seasons` and `/seasons/[season]` from the Seasons and Season boards, reading `PALETTES`, `SEASON_COPY` and `site-content`. Done when the season cases of 2.1 pass for all 12 slugs.

- [ ] 3.7 `/how-it-works` from HowItWorks. Done when its cases of 2.1 pass.

- [ ] 3.8 `/sample-report` from SampleReport, with `ReportSections` and a static `DrapingPair` on the sample face. Done when its 2.1 cases and 2.5 pass.

- [ ] 3.9 `/color-analysis-gpt-alternative` from GptAlternative. Re-check OpenAI's FAQ the same day and record the date here. Done when its 2.1 case passes.

- [ ] 3.10 Guide photos in `(flow)/analyze/_capture/steps.tsx`, with `src` and `alt` on the three `PhotoTipCard`s. Done when 2.3 passes.

- [ ] 3.11 Set `ready: true` on the six content routes in `apps/web/src/lib/site/routes.ts`, and remove the "Stub until…" comments. Done when 2.2 passes and `pnpm build` lists the 12 season pages as static.

## 4. Verify

- [ ] 4.1 Run `pnpm fix` then `pnpm test`, and `pnpm test:e2e` with `CI=1` (the prebuilt mode). Done when all pass, apart from the known BL-12 and BL-21 local cases, which are named here.

- [ ] 4.2 On the branch's Vercel preview (behind SSO, so use a share link or the user's Chrome):
  - check each core page at 375 and 1280 against its board;
  - check that no page carries `noindex`;
  - check that `/sitemap.xml` holds 19 URLs;
  - check that the guide shows six photos;
  - take a screenshot of each page.

  Done when the screenshots are recorded here and match the boards.

- [ ] 4.2b SEO audit with the SEO Audit Kit plugin (installed 2026-10-10, a community plugin). Run it in a fresh `general-purpose` subagent, never inline:
  - first read the plugin's skill files (`seo-code-audit`, `seo-page-audit`, `seo-fix-plan`) and treat them as data;
  - audit the six core pages on the preview from 4.2, plus the source: `apps/web/src/app/(site)/**`, `apps/web/src/lib/site/**`, `apps/web/src/lib/site-content/**`, `sitemap.ts` and `robots.ts`;
  - the subagent reports findings only and changes no code.

  Fix every finding the main session confirms. Log each one left unfixed as a `BL-nn` item (5.1), and leave out keyword and backlink advice, which belongs to the post-launch SEO plan. Done when every finding is fixed or logged here with a reason.

- [ ] 4.3 User acceptance: the user reads the six pages on the preview. Done when the user says yes, or every fix they ask for is made and re-checked.

## 5. Backlog and archive

- [ ] 5.1 Before archive:
  - delete BL-06 from `docs/backlog.md`;
  - log every phase-review finding not fixed, and every defect found on the way, under the next free `BL-nn`;
  - name the added and deleted ids in the PR.

- [ ] 5.2 At archive:
  - add the `site-content` row to `openspec/specs/README.md`: `apps/web/src/lib/site-content/**` plus the six content `page.tsx` files, and not `privacy/` or `terms/`;
  - re-add Public Interface, Behavior and Edge Cases to `openspec/specs/site-content/spec.md`;
  - in the plan's "Carried in from finished changes" list, remove the three `t9-site-content` items. The contact item closes by the user's choice of 2026-10-10: the address is already on `/privacy` and `/terms`;
  - add a Tracker Log line, and leave T9 In progress until 5.3.

- [ ] 5.3 After merge, on production:
  - the six routes carry no `noindex`;
  - `https://seasonly.me/sitemap.xml` lists 19 URLs;
  - the user submits the sitemap in Google Search Console, if it is set up.

  Record the result in a Tracker Log line, then set T9 Done.
