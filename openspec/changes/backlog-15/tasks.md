## 1. Spec deltas

- [x] 1.1 ui-components delta ("A swatch grid shows every color of a list in order": 3 columns below a 76 px cell, grid-width rule; scenario "A 4-column grid at 375 px" now 3 columns; new "A 4-column grid on a wide phone") — written in triage
- [x] 1.2 capture-flow delta ("Each photo check is reported without photo data": outline outcome and time on a pass; two new scenarios) — written in triage
- [x] 1.3 spec-workflow delta ("Citations are gated at every commit": a rename with neither name held aborts; slugs keep combining marks; permanent names read from `## Requirements` only; three new scenarios) — written in triage
- [x] 1.4 site-content delta ("The sample report puts the palette first on a phone": at least half of the first swatch in the first screen, Decision 6) — written in triage
- [x] 1.5 canvas v64/v65 board 16b, the canvas DS `SwatchGrid` rule and `keepColumns` on the season strips approved (design.md Canvas) — done in triage

## 2. Fixes — one subagent at a time, serially

Each task leaves the suite green before the next starts. Only the edits named here may touch an existing test. Task 2.1 flips one existing e2e test (approved, design.md Decision 4). Tasks 2.7–2.12 edit helper code in `scripts/__tests__/spec-citations.test.ts` (approved, Decisions 1–2). No other existing `it`'s assertion, fixture or call changes; if one would, stop and ask Oleg.

- [ ] 2.1 BL-61 — failing tests in `e2e/site-structure.spec.ts`:
  - flip "a 4-column grid keeps 4 columns at 375 px" (approved, Decision 4) to 3 columns at 375 px on `/seasons/light-spring`, with no palette `.sn-swatch__name` whose `scrollWidth` exceeds its `clientWidth` and none taller than 36 px; keep its citation of {@link openspec/specs/ui-components/spec.md#scenario-a-4-column-grid-at-375-px} and retitle it to match;
  - add a new test: 4 columns at 414 px ({@link openspec/specs/ui-components/spec.md#scenario-a-4-column-grid-on-a-wide-phone}).

  Verify the 375 test fails.

- [ ] 2.2 BL-61 — replace the `@media (max-width: 374.98px)` rule in `apps/web/src/components/ds/ds.css` with the media-free `minmax(max(76px, …))` template on `.sn-swatch-grid[data-columns="4"]`, still in `@layer components`. Update the rule's comment and `swatch.tsx`'s `keepColumns` doc (design.md BL-61). Done when 2.1 and 2.2a pass and `ds.test.tsx` passes unchanged.
- [ ] 2.2a BL-61 — edit `e2e/design-review.spec.ts` (approved, Decision 6): "shows the sample report's first swatch in the first screen" asserts the first chip `toBeInViewport({ ratio: 0.5 })`, keeping its citations ({@link openspec/specs/site-content/spec.md#scenario-the-sample-on-a-phone}); `firstSwatchInView` takes the ratio as a parameter, so the season-page test keeps `ratio: 1`. Done when both design-review tests pass.
- [ ] 2.3 BL-61 — hand-edit `openspec/specs/ui-components/spec.md` Behavior (:150-154): the grid-width rule replaces the below-375 rule, the canvas DS copy draws it (v65), and the BL-61 leftover sentence is dropped.
- [ ] 2.4 BL-68 — failing tests:
  - new `it`s in `apps/web/src/lib/capture/capture.test.ts`: a passing photo's `photoCheckedProps` carry `outline: "late"` with no `outline_ms` key ({@link openspec/specs/capture-flow/spec.md#scenario-a-passing-photo-whose-outline-is-late}), and carry `outline: "made"` with a whole-number `outline_ms` ({@link openspec/specs/capture-flow/spec.md#scenario-a-passing-photo-whose-outline-is-made}); a rejected photo's props carry neither key;
  - a new `apps/web/src/lib/capture/photo.test.ts` with a mocked `loadPerson` covering `outline()`'s five outcomes.

  Verify they fail.

- [ ] 2.5 BL-68 — `outline()` returns `{ mask, outcome, ms }`. `CheckedPhoto`'s pass branch gains `outline` and `outlineMs?`, and its rejection branch gets `outline?: never`. `photoCheckedProps` emits `outline` and `outline_ms` only when present. Drop the `ponytail:` note (design.md BL-68, Decision 5). Files: `apps/web/src/lib/capture/photo.ts`, `events.ts`. Done when 2.4 passes and the existing `capture.test.ts` and `flow-state.test.ts` pass unchanged.
- [ ] 2.6 BL-68 — hand-edit `openspec/specs/capture-flow/spec.md` Public Interface (`CheckedPhoto` :33-36, `photoCheckedProps` :47-53) and the Behavior bullet on the 3 s wait (:62), naming BL-104 for the tuning.
- [ ] 2.7 BL-85 — failing rule `it`: a scenario heading with `e` followed by U+0301 slugs with the mark kept, and `‿` (U+203F) is kept ({@link openspec/specs/spec-workflow/spec.md#scenario-a-heading-that-holds-a-combining-mark}). Verify it fails.
- [ ] 2.8 BL-85 — add `\p{M}` and `\p{Pc}` to `slugify`'s class (design.md BL-85, Decision 2). Done when 2.7 passes and every other `it` passes unchanged.
- [ ] 2.9 BL-92 — failing rule `it`: a fixture spec with a `### Requirement:` under `## Behavior`. The requirement is not held, it is not reported unproven, and a citation of its anchor is stale ({@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-heading-outside-the-requirements-section}). Verify it fails.
- [ ] 2.10 BL-92 — `mainSpecs` passes only the `## Requirements` section body and its fence-mask slice to `parseRequirements` (design.md BL-92, Decision 2). Done when 2.9 passes and the four repo-wide gate `it`s pass unchanged.
- [ ] 2.11 BL-103 — failing rule `it`s:
  - (a) permanent {Foo}: `foo` to `Bar`, plus MODIFIED `Foo` with a cited new scenario; the citation is stale and Foo is unproven;
  - (b) permanent {A}: `Ghost` to `Fresh`, then `A` to `Ghost`; a citation of `Ghost` is stale and A is unproven;
  - (c) the case-only `foo` to `Foo` no-op is unchanged.

  All cite {@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-archive-aborts-on-with-neither-name-held}. Verify (a) and (b) fail.

- [ ] 2.12 BL-103 — when neither the old nor the new name of a pair is held at its turn, `appliedRenames` adds the old name, the new name and every held name folding onto the old name to `aborted`. Update the JSDoc on `nearMisses`, `appliedRenames` and `deltaProof`, citing `specs-apply.js:285` (design.md BL-103, Decision 1). Done when 2.11 passes and every other `it` passes unchanged.

## 3. Verify, delete, review, archive, ship

- [ ] 3.1 `pnpm fix`, then `pnpm test`, then `pnpm test:eval`; all green
- [ ] 3.2 delete shipped bullets BL-61, BL-68, BL-85, BL-92 and BL-103 from `docs/backlog.md` (BL-104 stays)
- [ ] 3.3 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [ ] 3.4 archive (`/opsx:archive` flow, no Tracker), preflight, push, PR, auto-merge
