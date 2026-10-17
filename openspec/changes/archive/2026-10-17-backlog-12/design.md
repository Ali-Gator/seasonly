## Context

See proposal.md for why. Triage ran on `origin/main` at `34d4c9a`. Five read-only Plan investigators ran in parallel, one per member; the BL-88 investigator was then asked for a concrete design built on BL-90. The reference parser is `@fission-ai/openspec` 1.13.0, the global CLI at `/usr/local/lib/node_modules/@fission-ai/openspec` (pinned in CI at `.github/workflows/openspec.yml:26`, not a repo dependency): `dist/core/parsers/requirement-blocks.js`, `dist/core/specs-apply.js`, `dist/core/validation/validator.js` and `dist/core/archive.js`. No canvas design is involved.

| Id    | Lane | Why                                                                                            |
| ----- | ---- | ---------------------------------------------------------------------------------------------- |
| BL-90 | B    | The gate's helpers live in an existing test file, and four existing `it`s change (Decision 2). |
| BL-87 | B    | Same file (Decision 1). New `it` only.                                                         |
| BL-86 | B    | Same file (Decision 1). New `it`s only.                                                        |
| BL-89 | B    | Same file (Decision 1). New `it` only.                                                         |
| BL-88 | B    | Same file; Oleg chose to include it rather than defer it (Decision 3). New `it`s only.         |

## Goals / Non-Goals

**Goals:** one parse and one rename walk per delta, as archive's `parseDeltaSpec` and `buildUpdatedSpec` do; then a delta's renames, removals, additions and modifications make citable and exempt only what archive will write.

**Non-Goals:**

- No whole-change refusal. Archive refuses the whole change when any spec file throws (`archive.js:1167-1268`); the gate keeps dropping only what a conflict names (`backlog-11` Decision 4).
- No apply-time near-miss aborts (a REMOVED name that folds onto a held name, `specs-apply.js:321-323`): logged as BL-91.
- No change to which sections the permanent spec is read from (BL-92, deferred).
- No OpenSpec 1.14 behavior (it also refuses an ADDED name that matches a held one once case and spacing are folded); the pin is 1.13.0.
- No extraction of the gate helpers to a module, and no signature change to `deltaAnchors(text, existing)`, `deltaProof(text, into, existing)` or `openChanges(specs)`; `resolvableAnchors` gains only a trailing optional parameter (Decision 5).

## Members

All change file-local helpers in `scripts/__tests__/spec-citations.test.ts`. Line numbers are at `34d4c9a`, a hint only; find `it`s by title. Order is fixed: BL-90, BL-87, BL-86, BL-89, BL-88. BL-90 comes first so it can prove it changes no behavior, and the other four each edit one parsed structure and one walk. If any existing `it` beyond Decision 2's five calls turns out to need an edit, stop and ask Oleg; do not make it.

Write every fixture's heading, bullet, fence and rename lines inside template strings in the test file, as the existing ones are. Never put such a line at the start of a line in a real delta under `openspec/changes/`.

### BL-90 — parse each delta once, walk renames once

Today `conflicts` (:209-228), `appliedRenames` (:236-253), `deltaAnchors` (:261-276) and `deltaProof` (:291-317) each re-read the delta's sections (`deltaSections` :172-190, `removedNames` :193-200, `renamedPairs`, `parseRequirements`); `deltaProof` re-reads rename pairs it already has; `appliedRenames`' `checkFrom` flag gives two walks (`deltaAnchors` checks FROM, `deltaProof` does not, per `backlog-11` Decision 5); and `openChanges()` re-reads every permanent spec its caller just parsed.

Parse a delta once into a plan (added and modified blocks, removed names, rename pairs, in document order), compute `conflicts` from the plan, and run one rename walk that checks FROM and TO in order against a running copy of the permanent names, as `specs-apply.js:268-308` does. Both `deltaAnchors` and `deltaProof` read that plan and that walk; `deltaProof`'s `gone` takes the walk's accepted FROM names. The `checkFrom` flag goes. `mainSpecs()` is memoized in its helper, so the `openChanges()` call inside "every requirement is proven by a citing test or marked unenforced" and the third read inside "every citation … resolves" go without touching either `it`.

Conditions that keep the existing-test edits to Decision 2's list:

- Keep the signatures. Each helper parses its `text` once internally.
- Keep `deltaProof`'s current MODIFIED rule: a block's scenarios and its unenforced flag count whatever its name. Applying `deltaAnchors`' rule (name held or renamed to) there also flips the `it`s at :702, :715, :728 and :792.
- Keep the output order: document order, duplicates kept.

No spec delta: the gate's output does not change. A FROM-missing name the old `deltaProof` kept in `gone` names no permanent requirement.

Test first: make the five Decision 2 argument additions on the old code and confirm the suite stays green. Then refactor until it is green again.

### BL-87 — a name added and removed

Archive's pre-validate refuses it (`specs-apply.js:160-163`, thrown at :189, "requirement present in multiple sections (ADDED and REMOVED)"); `validator.js:310` reports it as an ERROR, so the window is commit to push. It is the only pre-validate conflict `conflicts` still omits; the other ten are covered (BL-84). Add an added-against-removed term to `conflicts` (names compared trimmed and exact, as `normalizeRequirementName` does) and to its JSDoc. Use a new `it`, not a sixth row in the existing "delta names archive's pre-validate refuses make nothing citable or exempt" `it`'s `shapes` fixture: that would edit an existing `it`.

New rule test ({@link openspec/specs/spec-workflow/spec.md#scenario-a-name-added-and-removed-in-one-delta}): ADDED `Both` and REMOVED `Both` against a permanent `Both`; the added block's scenario does not resolve and `Requirement: Both` is reported unproven.

### BL-86 — a rename's new name the delta no longer holds

Archive accepts both shapes: A to B then B to C (pre-validate checks only repeated FROM or TO, `specs-apply.js:140-151`; `validator.js:508` treats it as a valid chain), and A to B with REMOVED B (REMOVED is checked folded against FROM only, :165-178; apply order is RENAMED, REMOVED, MODIFIED, ADDED, :265, and REMOVED runs on the post-rename map, :309-331). So the gate's answer is "only the name still held", not "nothing": in the chain C is citable, B is not, A is gone; renamed then removed, neither A nor B is citable and A is gone.

In `deltaAnchors`, keep an accepted pair's TO only when it is in the walk's final held set and not among the delta's non-dropped REMOVED names. **Filter the ordered pair list in place**: no Set, no dedupe, no rebuild from the final names, since "a change delta makes its ADDED, MODIFIED and RENAMED headings citable" and "a delta section heading is matched trimmed, in any letter case, and whole" each expect `requirement-after` twice, and "a rename line with no partner …" depends on pair order. `deltaProof` needs no change.

New rule tests ({@link openspec/specs/spec-workflow/spec.md#scenario-a-renames-new-name-the-same-delta-moves-on-or-removes}): the chain makes `requirement-b` stale and `requirement-c` citable; A to B plus REMOVED B makes `requirement-b` stale and the proof check does not report A.

### BL-89 — an ADDED name the permanent spec holds

Archive's ADDED step (`specs-apply.js:358-374`) looks the name up in the running map after renames and removals; it is a no-op when `normalizeBlockRaw` of both blocks match (CRLF to LF and outer trim only, :783-784; the header line, inner spacing and blank lines all count), and otherwise throws "ADDED failed … already exists" (:370). An identical block parses to exactly the permanent anchors, which `resolvableAnchors` already holds, so the gate needs no text comparison: skip every `added` block whose name is in the held set and both outcomes match archive.

**Held set:** the permanent names minus the walk's accepted FROMs plus its accepted TOs. It differs from BL-86's set, which also subtracts REMOVED names. They agree on ADDED only because BL-87 drops a name both added and removed; do not unify them without that in mind.

New rule test ({@link openspec/specs/spec-workflow/spec.md#scenario-an-added-name-the-permanent-spec-already-holds}, {@link openspec/specs/spec-workflow/spec.md#scenario-an-added-name-a-rename-of-the-same-delta-frees}), three shapes: a held name with a different block (the added-only scenario does not resolve); a held name with the identical block (its anchors still resolve); a rename X to Y plus ADDED X (X's new scenario resolves).

**Bullet correction:** the window is commit to archive, not commit to push. `openspec validate` dry-runs `buildUpdatedSpec` (`validator.js:697-744`) and reports the refusal only as INFO "Archive would refuse this delta: …", which never fails the report (:745-751), as `backlog-11` recorded for BL-83.

### BL-88 — an accepted MODIFIED block replaces the permanent one

Archive writes the delta's raw block for MODIFIED, heading line included (`specs-apply.js:356`), and matches names with `/^###\s*Requirement:\s*(.+)\s*$/i` then `trim()` (`requirement-blocks.js:2-4, 16`), so `### Requirement:Foo` (anchor `requirementfoo`), `### Requirement:   Foo` (`requirement---foo`) and `###Requirement: Foo` (no anchor) all modify `Requirement: Foo`. Scenarios match through `scenarioNameAt` (:356-368), which also folds `#### Foo`, `#### Scenario:Foo` and spacing after `Scenario:`. `openspec validate` is silent on all of these, so the window is commit to archive. The gate already fails at the archive commit; this moves the failure to the commit that writes the delta. Every one of the 229 requirement and 517 scenario headings under `openspec/specs/**` is canonical today, so no live anchor moves.

- **Data:** a new `OpenDelta` field, `replaced: Map<name, { anchor?: string; unenforced: boolean }[]>`, filled by `deltaProof`'s MODIFIED branch for every block `conflicts` does not drop, accumulated across changes as `gone` and `scenarios` already are. `deltaProof` does not check `existing` before filling it (a name the permanent spec lacks is never looked up). `scenarios` and `gone` keep their meaning and insertion order.
- **Citation side:** `resolvableAnchors(specs, deltas = openDeltas())` gains a trailing optional `deltas` (the `[capability, delta text]` list `openDeltas()` returns), so a rule test can feed fixture deltas while the three existing calls stay as they are. From those same texts it builds each capability's `OpenDelta` with `deltaProof` (so `replaced` and the anchors come from one input) and, when it seeds the permanent anchors, skips `anchorsOf(r)` for every permanent `r` named in `replaced`; it then adds `deltaAnchors(text, main)` as today, which already emits the accepted block's own anchor and scenario anchors. A canonical heading comes back unchanged; only a differently anchored one drops out. A permanent scenario the block drops also stops resolving; archive refuses that block (`findMissingCurrentScenarios`), so this fails closed at the citation to fix.
- **Proof side:** `unprovenRequirements`, for a permanent `r` that `replaced` lists, proves through every listed block's defined `anchor` plus `delta.scenarios.get(r.name)`, not `anchorsOf(r)`; "has an anchor" becomes "some listed block has one"; the permanent `r.unenforced` is ignored and exemption comes only from `gone`. A permanent requirement no block replaces keeps today's rule.
- **Rename then MODIFIED:** in `deltaAnchors`, each accepted rename's slot carries the MODIFIED block's own anchor when an accepted block names that new name, nothing when that block has no anchor, and `slugify(to)` otherwise (archive's canonical rewrite, `specs-apply.js:291`). **Substitute the slot, never drop it**, or the two `it`s that expect `requirement-after` twice each lose one.
- **The subtraction lives in `resolvableAnchors`, not `deltaAnchors`**, so no `deltaAnchors` list in an existing `it` changes. `deltaAnchors` and `deltaProof` need names only, never permanent blocks.

New rule tests, one per scenario: {@link openspec/specs/spec-workflow/spec.md#scenario-a-modified-requirement-whose-heading-archive-rewrites}, {@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-heading-with-no-space-that-a-change-fixes}, {@link openspec/specs/spec-workflow/spec.md#scenario-a-scenario-heading-archive-keeps-under-another-anchor}, {@link openspec/specs/spec-workflow/spec.md#scenario-a-modified-requirement-that-drops-its-unenforced-flag}, {@link openspec/specs/spec-workflow/spec.md#scenario-a-renamed-requirement-modified-under-another-spelling}, {@link openspec/specs/spec-workflow/spec.md#scenario-two-changes-modifying-one-requirement}. Citation-side fixtures pass their deltas as `resolvableAnchors`' `deltas` (two entries for one capability model two open changes); proof-side fixtures pass an `OpenDelta` built from `deltaProof` calls into one `into`.

**Bullet correction:** two facets beyond the bullet share the root cause and ship here: a rename then modified under a non-canonical heading, and a modified block that drops `**Unenforced:**` (exempt until archive today).

## Decisions

### 1. BL-86, BL-87, BL-89 — approve editing the gate's helpers and adding rule tests

Helper code in `scripts/__tests__/spec-citations.test.ts` (`conflicts`, `appliedRenames`, `deltaAnchors`, their JSDoc) and one new rule `it` per member. No existing `it`'s assertion, fixture or call changes under this decision.

- **a. Approve.** Closes three fail-open gaps (rename chain or renamed-then-removed name, ADDED+REMOVED, ADDED onto a held name).
- **b. Not now:** they stay in the backlog.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-17)

### 2. BL-90 — approve changing four existing `it`s (arguments only)

A FROM-checking walk under `deltaProof`'s default empty `existing` refuses every rename, so four `it`s pass the permanent names as `deltaProof`'s third argument (`undefined` as the second). No assertion value changes. This reverses `backlog-11` Decision 5 (`deltaProof` skipped the FROM check so these fixtures would not change).

- "a rename in any spelling OpenSpec's archive accepts is read, and only at line start" (:678) — pass `old`.
- "a requirement an open change removes or renames away from needs no citing test" (:697) — pass the cap's permanent names (`new Set(specs.get("cap")?.map((r) => r.name))`); the removal-only call at :689 is unaffected.
- "a rename line with no partner is neither citable nor gone, as archive pairs them" (:768) — pass `untested`; :753 is unaffected.
- "a delta section heading is matched trimmed, in any letter case, and whole" (:790, :796) — pass `before`; the `scenarios` assertion at :792 is unaffected.

`mainSpecs()` is memoized in its helper, so the `openChanges()` call at :459 stays untouched.

- **a. Approve.** One walk; BL-86 builds on it.
- **b. Refuse:** only parse-once ships, the second walk stays, BL-86 must work around it.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-17)

### 3. BL-88 — defer, or include

Fixing it treats a MODIFIED block as a full replacement of the permanent one.

- **a. Defer** on the trigger "a permanent spec or an open delta holds a non-canonical requirement or scenario heading". Zero today, and the gate already fails at the archive commit.
- **b. Include:** five fixes.

**Recommendation:** a.

**Answer:** b — include (Oleg, 2026-10-17). The follow-up investigation (BL-88 above) found the fix needs only names in `deltaAnchors` and `deltaProof` and a new `OpenDelta` field, so no existing `it` changes beyond Decision 2. The approval covers BL-88's helper code and new rule `it`s, on Decision 1's terms.

### 4. Two open changes modifying one requirement: union

A technical call, made in triage under CLAUDE.md ("Decide technical choices yourself"); recorded, not asked. Every listed block's anchors and scenarios resolve and count as proof, and any one block marked unenforced exempts the requirement. It matches the gate's existing cross-change rule (`gone` and `scenarios` already accumulate over `into`; `backlog-11` scoped conflicts to one delta), the archive order of open changes cannot be read from the tree, and archive already forces the second change to refresh its block or throw on the scenarios it would drop. Ceiling: with two non-canonical blocks for one requirement, the loser's anchor stays citable until the winner archives. Mark it with a `ponytail:` comment in the code.

### 5. BL-90 keeps every signature and memoizes `mainSpecs`

A technical call, recorded, not asked. Each helper parses its `text` once internally, so about 45 call sites stay as they are. The one addition is BL-88's trailing optional `deltas` parameter on `resolvableAnchors`, defaulting to `openDeltas()`, so its existing calls do not change. Memoizing `mainSpecs()` removes the re-read without editing the two real-repo `it`s; hoisting `const specs = mainSpecs()` into the proof `it` would be one line but edits an existing `it`.

## Risks / Trade-offs

- The real-repo `it`s read the live `openspec/changes/`; while this change is open, its own delta is read by the gate it changes. The delta's fixture-like text sits inside backticks and never at a line start, so it adds only its own scenarios as citable.
- BL-88 drops a permanent anchor before archive. A test citing it fails at the commit that writes the delta, which is the point; the fix is to cite the delta's heading.
- The union rule (Decision 4) fails open in one corner, by design.
