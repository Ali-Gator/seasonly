## Context

See proposal.md for why. Triage ran on `origin/main` at `0e824c5`. Seven read-only Plan investigators ran in parallel: BL-35, BL-65, BL-42, BL-63, BL-23, BL-64 and BL-26. All seven are real and fixable; the top five by importance and ease make the batch. Every decision was settled with Oleg on 2026-10-14. No canvas design is involved: BL-63 leaves the layout unchanged at every width.

| Id    | Lane         | Why                                                                                                                                   |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| BL-35 | B            | Docs only; what the listing claims is a product call (Decision 1).                                                                    |
| BL-65 | A            | Type-only tightening; no existing test builds a loose pass, and the guarded paths are unreachable today. New type test only.          |
| BL-42 | B            | The gate lives in an existing test file (Decision 2).                                                                                 |
| BL-63 | B            | Two existing inline-style tests change (Decision 3).                                                                                  |
| BL-23 | B            | Both recorder users are existing E2E specs (Decision 4).                                                                              |
| BL-64 | not in batch | Lane B (two-test refactor in `view.test.tsx`); 6th by ranking, over the ceiling of 5. Stays `open`.                                   |
| BL-26 | not in batch | Lane B (port-fidelity: spec exception or design-system change first, as `backlog-4` also found); 7th, over the ceiling. Stays `open`. |

## Goals / Non-Goals

**Goals:** every chat-plugin test case claims only a call its host was seen making; a passed photo check cannot reach the flow without its photo, by type; an open change can move its citations off requirements it removes or renames before archive; a page's column utility on a swatch grid wins without `!important`; one E2E PostHog decoder.

**Non-Goals:**

- No change to the MCP tool description (`apps/web/src/lib/mcp/server.ts:69`): `chat-plugin` spec forbids it telling the model how to behave.
- No re-run of either host: each claimed call is one already observed on 2026-10-11.
- `SwatchStrip` keeps its inline columns; nothing overrides it.
- BL-64 and BL-26 wait for the next batch.

## Members

### BL-35 — case 5 per host

`docs/chat-plugin-listing.md`: positive row 5 (:88) becomes the prompt Claude was seen calling, "Run the Seasonly quiz with all four answers as unsure.", same expected call and result. A one-line note under the positive table says the ChatGPT package keeps the original wording ("I honestly can't tell my vein color, jewelry, tan or hair, it's all hard to say."), which ChatGPT called and Claude answered itself. The screenshot note (:104) drops its BL-35 sentence, since screenshot 3's prompt is now case 5's. The ChatGPT package paragraph (:108, "The review test cases above live in `plugin.json`") adds "except case 5's wording, above". `docs/chat-plugin-openai/plugin.json` is unchanged. No test reads either list. If the Claude listing has already been submitted, Oleg updates case 5 in the portal after merge. Files: `docs/chat-plugin-listing.md`.

### BL-65 — `CheckedPhoto` and the `checked` event as unions

`apps/web/src/lib/capture/photo.ts:13-22`: `CheckedPhoto` becomes a pass (`problem: null`, `traits: Traits`, `crop: Blob`) or a rejection (`problem: RetakeReason`, no traits or crop), sharing `faceCount` and `measures`. The shared `outcome` (:59) stops carrying `traits: null, crop: null`; the rejection returns (:60, :73) and the pass return (:89-95) build their branch. The `!landmarks` part of :72 stays: it narrows `landmarks` for `cropBox`. `apps/web/src/app/(flow)/analyze/flow-state.ts:65-71`: the `checked` `FlowEvent` becomes `{ problem: null; photo: PassedPhoto }` or `{ problem: RetakeReason; photo: null }`; `reduce` (:125-131) narrows on `e.problem` and loses `|| !e.photo` and `?? "no-face"`. `flow.tsx:118-131` narrows on `checked.problem === null` instead of `checked.traits && checked.crop`; the catch path (:136) already dispatches a rejection. `photoCheckedProps` reads only `problem`, `faceCount`, `measures`, present on both branches. Existing fixtures in `flow-state.test.ts:28-41` already fit; `flow.dom.test.tsx`'s untyped `vi.mock` is unaffected. New type-level test with `// @ts-expect-error` lines (a pass `CheckedPhoto` without traits or crop; a `checked` event with no problem and `photo: null`; one with a problem and a photo), mirroring `photo-check.test.ts`'s "type refuses a pass without traits"; `pnpm typecheck` fails before the fix on the unused directives. Files: `photo.ts`, `flow-state.ts`, `flow.tsx`, `flow-state.test.ts` (new `it`).

### BL-42 — the proof check reads open changes

All of the gate lives in `scripts/__tests__/spec-citations.test.ts`. Today `deltaAnchors` (:93-111) feeds only the stale-citation check (`resolvableAnchors`, :193-211); the proof check (`unprovenRequirements(mainSpecs(), repoCitations())`, :136-148, called at :226-228) never sees an open change. The fix collects, per open change (not `archive/`), the requirements it removes (`## REMOVED Requirements` headings), renames away from (the `FROM:` names under `## RENAMED Requirements`), and the scenarios it adds inside `## MODIFIED Requirements`. `unprovenRequirements` takes that as an optional third argument: removed and renamed-from requirements are skipped, and a modified requirement is proven when a citation names one of its delta's scenarios. The existing two-argument rule tests (:288, :296, :305, :312) keep passing unchanged. The header comment (:7-8, "only main-spec requirements must be proven") is updated. New rule tests, next to the existing delta tests (~:389-396), cite the two new spec-workflow scenarios and fail before the fix. Files: `spec-citations.test.ts` (approved).

### BL-63 — `--sn-cols` instead of an inline column template

`apps/web/src/components/ds/swatch.tsx:47` sets `--sn-cols: <n>` inline instead of `gridTemplateColumns`; `.sn-swatch-grid` (`ds.css:174-182`) sets `grid-template-columns: repeat(var(--sn-cols, 4), minmax(0, 1fr))`. The below-375 rule (`ds.css:183-189`) keeps setting `grid-template-columns: repeat(3, …)` directly — setting `--sn-cols: 3` would lose to the inline value — and drops `!important`. With nothing inline to beat, the three `lg:grid-cols-N!` overrides lose their bang: `apps/web/src/app/(site)/page.tsx:105`, `apps/web/src/lib/report/sections.tsx:60` (two), `apps/web/src/lib/site-content/season-link.tsx:57`. A `utilities`-layer class now beats the `components`-layer narrow rule at any width. Port fidelity (`ui-components/spec.md:123`) is unaffected in the way BL-57's `data-columns` was: the bundle's inline column template is an app-side layout detail documented in the Behavior "Since `backlog-3`" paragraph, which this change rewrites, so no design-system change is needed. `data-columns` stays as it is (the existing marker tests at `ds.test.tsx:80-90` pin it; making it 4-only is not needed). The two approved tests (`ds.test.tsx:68-78`) assert `--sn-cols:3` and `--sn-cols:4`. A new test for "A page overrides a grid's columns" checks that the grid sets no inline `grid-template-columns`, that no `.sn-swatch-grid` rule in `ds.css` is `!important`, and that no `SwatchGrid` caller's class carries a `grid-cols-N!` bang; it fails before the fix. The e2e block "swatch grids on narrow phones" (`e2e/site-structure.spec.ts:134-172`) must pass unchanged. The ui-components Behavior note (`spec.md:142`, "keeps its inline column count … with `!important`") is edited by hand: archive replaces requirements only. Files: `swatch.tsx`, `ds.css`, `ds.test.tsx`, `page.tsx`, `sections.tsx`, `season-link.tsx`, `openspec/specs/ui-components/spec.md`.

### BL-23 — one E2E PostHog recorder

`e2e/posthog.ts`: `Captured` gains `timestamp?`; `recordPostHog` returns `{ events, bodies, errors }`, where `bodies` keeps every POST as URL plus decoded text and every non-POST as its URL, and a try/catch around decode and parse pushes to `errors` instead of throwing inside the route handler. The doc comment's BL-23 line goes. `e2e/funnel.spec.ts`: the `zlib` and `Request` imports, `POSTHOG`, its `Captured`, `decode` and `recordPostHog` copies go; its inline phone posing (:29-42) becomes `posingAsAPhone()` plus its own `test.use({ viewport })`; a thin local wrapper adds `named` (its `NAMED` set, sorted by `timestamp`) and `find`. `e2e/sample-report.spec.ts:27` destructures `events`. All eight funnel tests and the sample-report test must pass unchanged in what they assert. The analytics Behavior E2E bullet (`openspec/specs/analytics/spec.md:38`) is edited by hand: the shared `e2e/posthog.ts` routes and decodes, and `funnel.spec.ts` and `sample-report.spec.ts` record through it (the "every other spec sends no PostHog request" clause is reworded to match). `e2e/**` has no mapping row; no requirement changes. Files: `posthog.ts`, `funnel.spec.ts`, `sample-report.spec.ts` (approved), `openspec/specs/analytics/spec.md`.

## Decisions

### 1. BL-35 — what the listing claims for positive case 5

Case 5 ("I honestly can't tell my vein color, jewelry, tan or hair, it's all hard to say.") is a positive case in `docs/chat-plugin-listing.md` and `docs/chat-plugin-openai/plugin.json`. ChatGPT called the tool for it; Claude answered itself and linked to `/analyze`. Claude did call the tool for "Run the Seasonly quiz with all four answers as unsure." (screenshot `3-no-result.png`).

- **a. Split case 5 per host.** The Claude listing's case 5 becomes the explicit prompt Claude was seen calling; `plugin.json` keeps the original wording ChatGPT was seen calling. The listing notes the difference. Every claimed call matches an observed call; no re-check needed.
- **b. Reword case 5 for both hosts** to the explicit prompt. One shared table, but ChatGPT has not been run on the new wording, so it needs a manual re-check by Oleg after merge.
- **c. Accept as is**, adding a note that Claude may answer itself. A Claude directory reviewer who runs case 5 sees no call and may flag the listing.

Trade-off: a keeps every claim true at the cost of one per-host row; b keeps one table but leaves an unverified claim; c ships a claim known false on Claude. Moving case 5 to the negative list was rejected: calling the tool is the right result there.

**Recommendation:** a.

**Answer:** a — split case 5 per host (Oleg, 2026-10-14)

### 2. BL-42 — approve the edit to `scripts/__tests__/spec-citations.test.ts`

The proof check (`unprovenRequirements` over the main specs, real-repo call at :226-228) ignores open changes, so a requirement an open change removes or renames must still be cited until archive. Same root cause: a MODIFIED requirement proven only through a scenario its delta adds counts as unproven until archive. The fix changes `unprovenRequirements` (new optional open-change argument), the real-repo proof call, the header comment, and adds new rule tests. Existing rule-test assertions stay as they are. Spec: MODIFIED "Citations are gated at every commit" (its "Only archived requirements" sentence mandates today's behavior).

- **a. Approve, widened scope:** REMOVED, RENAMED-FROM, and MODIFIED-with-new-scenario.
- **b. Approve, REMOVED only** as the bullet says; RENAMED-FROM and MODIFIED stay broken.
- **c. Not now:** keep moving citations only at archive.

**Recommendation:** a — one root cause, three symptoms; fixing one leaves two.

**Answer:** a — approved, widened scope (Oleg, 2026-10-14)

### 3. BL-63 — approve the edit to two tests in `apps/web/src/components/ds/ds.test.tsx`

`SwatchGrid` sets its column count inline, which forces `!important` on the below-375 rule in `ds.css` and on the `lg:grid-cols-N!` overrides; inside `@layer components` the narrow rule beats any future `grid-cols-N!` utility. The fix sets `--sn-cols` inline, reads it in `.sn-swatch-grid`, drops every `!important`/bang. Rendered layout is unchanged at every width. "lays out in the number of columns asked for" (:68-72) and "lays out in 4 columns by default" (:74-78) assert the inline `grid-template-columns` and would assert `--sn-cols: 3` / `--sn-cols: 4` instead.

- **a. Approve** the two test edits and fix now.
- **b. Not now:** nothing breaks today (every current override is `lg:`).

**Recommendation:** a — cheap, and it removes the trap before an `sm:` override falls into it.

**Answer:** a — approved (Oleg, 2026-10-14)

### 4. BL-23 — approve the edits to `e2e/funnel.spec.ts` and `e2e/sample-report.spec.ts`

`funnel.spec.ts` keeps its own copy of the PostHog route + decode that `e2e/posthog.ts` shares. The shared helper is too narrow for the funnel: it needs every request body (GET URLs included), decode errors, and event timestamps. The fix extends `recordPostHog` to return `{ events, bodies, errors }` with a try/catch around decoding, adds `timestamp` to `Captured`, and makes funnel a thin wrapper (`named`, `find` stay local). `sample-report.spec.ts:27` changes to destructure `events`.

- **a. Approve both files**, helper returns an object.
- **b. Approve funnel only**; helper keeps returning an array and exposes bodies/errors some other way (clumsier).
- **c. Not now.**

**Recommendation:** a — smallest clean diff, and the sample-report check then fails loudly when posthog-js changes its body format.

**Answer:** a — approved, both files (Oleg, 2026-10-14)

**Review follow-up:** the helper now catches decode errors, so `sample-report.spec.ts` also asserts `errors` is empty, or a body-format change would hide a funnel event (approved, Oleg, 2026-10-15).

## Corrections to the bullets

- **BL-42** says the gate "already skips" ADDED headings. It does not skip them: `deltaAnchors` makes them citable, and they escape the proof check only because they are not in the main specs yet. The same root cause also hits RENAMED-FROM requirements and MODIFIED requirements proven through a new scenario (Decision 2).
- **BL-63** says `data-columns` "could become a 4-only marker". Not needed for the fix, and the existing marker tests pin today's marker; it stays.
- **BL-23**: the shared helper's API is too narrow for the funnel as it stands (no bodies, errors or timestamps), so the fix extends the helper, not only funnel.spec.ts. `openspec/specs/analytics/spec.md:38` still names `funnel.spec.ts` as the decoder.

## Risks / Trade-offs

- BL-42 changes the gate every commit runs through. A bug that skips too much would let an unproven requirement pass silently; the new rule tests pin both the skip and that an unrelated requirement is still reported.
- BL-63 relies on cascade-layer order (`components` before `utilities`); the e2e narrow-phone block guards the layout at 360 and 375 px.
- BL-35: if the Claude listing was already submitted with the old case 5, the repo copy and the portal differ until Oleg updates the portal.
