## 1. Spec deltas

- [x] 1.1 spec-workflow delta ("Citations are gated at every commit": names a rename's new name is citable under, ADDED+REMOVED conflict, ADDED onto a held name, a MODIFIED block replaces the permanent one; ten new scenarios) — written in triage

## 2. Fixes — one subagent at a time, serially

Each task leaves the suite green before the next starts. All of them edit `scripts/__tests__/spec-citations.test.ts`, as approved in design.md Decisions 1–3. Order is fixed: BL-90, BL-87, BL-86, BL-89, BL-88 (design.md Members). Keep every signature (Decision 5).

- [ ] 2.1 BL-90 — existing-test edit approved in design.md Decision 2: in the four `it`s it names (found by title), pass the permanent names as `deltaProof`'s third argument at the five calls listed, no assertion changed. Verify the suite stays green on the old code.
- [ ] 2.2 BL-90 — parse each delta once into a plan; one in-order rename walk checking FROM and TO, shared by `deltaAnchors` and `deltaProof` (`gone` from its accepted FROMs); drop `checkFrom`; memoize `mainSpecs()`. Keep `deltaProof`'s MODIFIED rule and document order with duplicates (design.md BL-90). Done when every `it` passes unchanged beyond 2.1.
- [ ] 2.3 BL-87 — new failing rule test: ADDED and REMOVED `Both` against a permanent `Both`; the added scenario does not resolve and `Requirement: Both` is reported ({@link openspec/specs/spec-workflow/spec.md#scenario-a-name-added-and-removed-in-one-delta}). A new `it`, not a row in the existing `shapes` fixture. Verify it fails.
- [ ] 2.4 BL-87 — add the added-against-removed term to `conflicts` and its JSDoc. Done when 2.3 passes and every other `it` passes.
- [ ] 2.5 BL-86 — new failing rule tests: A to B then B to C makes `requirement-b` stale and `requirement-c` citable; A to B plus REMOVED B makes `requirement-b` stale and A is not reported ({@link openspec/specs/spec-workflow/spec.md#scenario-a-renames-new-name-the-same-delta-moves-on-or-removes}). Verify they fail.
- [ ] 2.6 BL-86 — `deltaAnchors` keeps an accepted TO only when the walk still holds it and the delta does not remove it; filter the ordered pair list in place, no Set or dedupe (design.md BL-86). Done when 2.5 passes and every other `it` passes.
- [ ] 2.7 BL-89 — new failing rule test, three shapes: held name with a different block (added-only scenario stale), identical block (anchors resolve), rename X to Y plus ADDED X (X's new scenario resolves) ({@link openspec/specs/spec-workflow/spec.md#scenario-an-added-name-the-permanent-spec-already-holds}, {@link openspec/specs/spec-workflow/spec.md#scenario-an-added-name-a-rename-of-the-same-delta-frees}). Verify the first shape fails.
- [ ] 2.8 BL-89 — `deltaAnchors` skips an `added` block whose name is in the held set (permanent names after the walk, REMOVED not subtracted; design.md BL-89). Done when 2.7 passes and every other `it` passes.
- [ ] 2.9 BL-88 — new failing rule tests, one per scenario: {@link openspec/specs/spec-workflow/spec.md#scenario-a-modified-requirement-whose-heading-archive-rewrites}, {@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-heading-with-no-space-that-a-change-fixes}, {@link openspec/specs/spec-workflow/spec.md#scenario-a-scenario-heading-archive-keeps-under-another-anchor}, {@link openspec/specs/spec-workflow/spec.md#scenario-a-modified-requirement-that-drops-its-unenforced-flag}, {@link openspec/specs/spec-workflow/spec.md#scenario-a-renamed-requirement-modified-under-another-spelling}, {@link openspec/specs/spec-workflow/spec.md#scenario-two-changes-modifying-one-requirement}. Citation-side fixtures feed deltas through `resolvableAnchors`' new optional `deltas` parameter (design.md BL-88). Verify the first five fail.
- [ ] 2.10 BL-88 — `OpenDelta.replaced`; `resolvableAnchors(specs, deltas = openDeltas())` with the subtraction; swap in `unprovenRequirements`; rename slot substituted, never dropped; union across changes with a `ponytail:` comment (design.md BL-88, Decision 4). `scenarios`, `gone` and `deltaAnchors`' return stay as they are. Done when 2.9 passes and every other `it` passes.

## 3. Verify, delete, review, archive, ship

- [ ] 3.1 `pnpm fix`, then `pnpm test`; both green
- [ ] 3.2 delete shipped bullets BL-86, BL-87, BL-88, BL-89, BL-90 from `docs/backlog.md`
- [ ] 3.3 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [ ] 3.4 archive (`/opsx:archive` flow, no Tracker), preflight, push, PR, auto-merge
