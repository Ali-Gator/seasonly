## 1. Spec deltas

- [x] 1.1 spec-workflow delta ("Citations are gated at every commit": a rename's old name is exempt only when the walk no longer holds it; removals taken in order, and a near-miss removal makes nothing citable or exempt for either name; two new scenarios) — written in triage
- [x] 1.2 analytics delta ("Each funnel step fires one event": "Starting on the camera" THEN gains "its URL still carrying `?start=camera`") — written in triage

## 2. Fixes — one subagent at a time, serially

Each task leaves the suite green before the next starts. Tasks 2.1–2.5 edit `scripts/__tests__/spec-citations.test.ts`, as approved in design.md Decisions 1–3; 2.6 edits `e2e/funnel.spec.ts`, as approved in Decision 4. Order is fixed: BL-94, BL-93, BL-91, BL-96 (design.md Members). No existing `it`'s assertion, fixture or call changes; if one would, stop and ask Oleg.

- [x] 2.1 BL-94 — `openChanges(specs, deltas = openDeltas())` loops over `deltas`; `resolvableAnchors` takes its `open` map from `openChanges(specs, deltas)`; keep its `names` helper for `deltaAnchors` (design.md BL-94). No new `it`. Done when all 48 `it`s pass unchanged.
- [x] 2.2 BL-93 — new failing rule test: with a permanent `Requirement: A` and no citing test, A to B then B to A reports A as unproven, and so does A to B plus C to A against permanent A and C ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-round-trip-in-one-delta}). Verify it fails.
- [x] 2.3 BL-93 — `deltaProof` takes `held` from `appliedRenames` and adds an accepted FROM to `gone` only when `held` no longer has it; update the `OpenDelta.gone` comment and `deltaProof` JSDoc (design.md BL-93). Done when 2.2 passes and every other `it` passes.
- [x] 2.4 BL-91 — new failing rule tests, both shapes: permanent A, A to B plus REMOVED `b` makes `requirement-b` stale and reports A as unproven; permanent Foo, MODIFIED `Foo` adding a scenario plus REMOVED `foo` makes that scenario stale and reports Foo as unproven; and REMOVED `B` then REMOVED `b` after A to B drops nothing beyond B's exact removal ({@link openspec/specs/spec-workflow/spec.md#scenario-a-removal-archive-aborts-on-as-a-near-miss}). Verify the first two fail.
- [x] 2.5 BL-91 — one post-walk near-miss helper next to `conflicts`: removals in document order against a running copy of `held`, exact match deleted, near-miss adds the removed and held names to the dropped set, renames walked again without dropped pairs until the set stops growing; used by `deltaAnchors` and `deltaProof`; JSDoc cites `specs-apply.js:318-324`; lift `conflicts`' local `fold` to file scope and share it (design.md BL-91, Decision 5). Done when 2.4 passes and every other `it` passes.
- [x] 2.6 BL-96 — in `e2e/funnel.spec.ts`'s "sends one /analyze page view when the landing opens the camera", after the poll, assert the `/analyze` page view's `properties.$current_url` ends in `/analyze?start=camera` ({@link openspec/specs/analytics/spec.md#scenario-starting-on-the-camera}). Existing-test edit approved in design.md Decision 4. Run that spec with Playwright and confirm it passes.

## 3. Verify, delete, review, archive, ship

- [ ] 3.1 `pnpm fix`, then `pnpm test`; both green
- [ ] 3.2 delete shipped bullets BL-91, BL-93, BL-94, BL-96 from `docs/backlog.md`
- [ ] 3.3 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [ ] 3.4 archive (`/opsx:archive` flow, no Tracker), preflight, push, PR, auto-merge
