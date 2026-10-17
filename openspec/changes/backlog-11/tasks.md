## 1. Spec deltas

- [x] 1.1 spec-workflow delta ("Citations are gated at every commit": GitHub-rendered anchors, in-order rename walk, conflict drops; seven new scenarios, one THEN extended) — written in triage

## 2. Fixes — one subagent at a time, serially

Each task leaves the suite green before the next starts. All of them edit `scripts/__tests__/spec-citations.test.ts`, as approved in design.md Decisions 1–3. Order is fixed: BL-80, BL-81 with BL-83, BL-82, BL-84 (design.md Members).

- [x] 2.1 BL-80 — new failing rule test: `requirement--two-spaces`, `requirement-closed` and `scenario-closed-too` resolve; `requirement-two-spaces` and `requirement-closed-` do not ({@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-heading-github-anchors-with-its-spaces-kept}). Verify it fails.
- [x] 2.2 BL-80 — new failing rule test: `###Requirement: Glued` has no anchor and is reported unproven; a no-break space after `####` adds no scenario ({@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-heading-with-no-space-after-its-marker}). Verify it fails.
- [x] 2.3 BL-80 — `parseRequirements` anchors from the heading as GitHub renders it, `anchor` optional; scenario needs a space or tab after `####`, closing run dropped; `resolvableAnchors`, `unprovenRequirements`, `duplicateHeadings` skip an absent anchor (design.md BL-80). Done when 2.1–2.2 pass and every other `it` passes.
- [x] 2.4 BL-81 — new failing rule tests: a rename from a name main lacks makes nothing citable ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-whose-old-name-matches-nothing}); A to B then B to C makes `requirement-c` citable and A gone ({@link openspec/specs/spec-workflow/spec.md#scenario-a-chain-of-renames-in-one-delta}). Verify the first fails.
- [x] 2.5 BL-83 — new failing rule test: a rename from `Untested` to `Taken`, both in main, leaves `Untested` reported ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-onto-a-name-the-permanent-spec-already-holds}). Verify it fails.
- [x] 2.6 BL-81, BL-83 — in-order rename walk: `deltaAnchors` accepts a pair only when FROM is in the running set and TO is not; `deltaProof(text, into, existing = new Set())` refuses a pair whose TO is in the running set; `openChanges(specs = mainSpecs())` passes each capability's names (design.md BL-81 with BL-83, Decision 5). Edits exactly the six existing `it`s in design.md Decision 2, found by title. Done when 2.4–2.5 pass and every other `it` passes.
- [x] 2.7 BL-82 — new failing rule test: MODIFIED+REMOVED and MODIFIED+RENAMED-FROM in one delta; neither new scenario nor the rename's new name resolves, both main requirements reported ({@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-modified-and-also-removed-or-renamed-away}). Verify it fails.
- [x] 2.8 BL-82 — per-delta-text conflict sets (one REMOVED-name reader shared with `deltaProof`, every parsed rename pair); a conflicting name and its rename pair are dropped from `deltaAnchors` and `deltaProof` (design.md BL-82, Decision 4). Done when 2.7 passes and every other `it` passes.
- [ ] 2.9 BL-84 — new failing rule test, one delta per shape: ADDED+MODIFIED, ADDED equal to a rename TO, rename FROM folded-equal to a REMOVED name, repeated FROM or TO, repeated name within a section; no citation of a name involved resolves and each main requirement involved is reported ({@link openspec/specs/spec-workflow/spec.md#scenario-delta-names-archives-pre-validate-refuses}). Verify it fails.
- [ ] 2.10 BL-84 — extend 2.8's conflict sets with those shapes (design.md BL-84). Done when 2.9 passes and every other `it` passes.

## 3. Verify, delete, review, archive, ship

- [ ] 3.1 `pnpm fix`, then `pnpm test`; both green
- [ ] 3.2 delete shipped bullets BL-80, BL-81, BL-82, BL-83, BL-84 from `docs/backlog.md`
- [ ] 3.3 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [ ] 3.4 archive (`/opsx:archive` flow, no Tracker), preflight, push, PR, auto-merge
