## Context

See proposal.md for why. Triage ran on `origin/main` at `a3ecf55`. Three read-only Plan investigators ran in parallel, one per open member (BL-80, BL-81, BL-82); the BL-82 investigator then triaged BL-83 and BL-84, which the others had found. The reference parser is `@fission-ai/openspec` 1.13.0, the global CLI at `/usr/local/lib/node_modules/@fission-ai/openspec` (pinned in CI at `.github/workflows/openspec.yml:26`, not a repo dependency): `dist/core/parsers/requirement-blocks.js`, `dist/core/specs-apply.js` and `dist/core/validation/validator.js`. No canvas design is involved.

| Id    | Lane | Why                                                                            |
| ----- | ---- | ------------------------------------------------------------------------------ |
| BL-80 | B    | The gate's helpers live in an existing test file (Decision 1). New `it`s only. |
| BL-81 | B    | Same file (Decision 1), and six existing `it`s change (Decision 2).            |
| BL-83 | B    | Same file (Decision 1). Same rename walk as BL-81.                             |
| BL-82 | B    | Same file (Decision 1). New `it`s only.                                        |
| BL-84 | B    | Same file (Decision 1); Oleg chose to fold it in (Decision 3). New `it`s only. |

## Goals / Non-Goals

**Goals:** a requirement or scenario anchor is GitHub's slug of the heading as GitHub renders it. A delta's renames, modifications, removals and additions count only where archive would accept them, so a test cannot lean on a citation or an exemption that archive or push will take away.

**Non-Goals:**

- No whole-delta refusal. Archive refuses a whole spec file on any of these shapes; the gate drops only what the conflict names, as `backlog-10` already does for a MODIFIED requirement missing from the permanent spec (Decision 4).
- No change to requirement names, which archive matches: only anchors move (BL-80).
- No change to the RENAMED new-name anchor (`renamed.map(slugify)` of the trimmed name). Archive rewrites a renamed header as `### Requirement: <trimmed>` with one space (`specs-apply.js:291`), so the trimmed slug is what GitHub will render.
- No `slugify` change for combining marks (BL-85, deferred: no heading holds one).
- No extraction of the gate helpers to a module.

## Members

All change file-local helpers in `scripts/__tests__/spec-citations.test.ts`. Line numbers are at `a3ecf55`, a hint only. Order: BL-80 (independent, inside `parseRequirements`), then BL-81 with BL-83 (the rename walk), then BL-82 (conflict sets), then BL-84 (extends BL-82's conflict sets).

Write every fixture's heading, bullet, fence and rename lines inside template strings in the test file, as the existing ones are. Never put such a line at the start of a line in a real delta under `openspec/changes/`.

### BL-80 — anchors as GitHub renders the heading

`parseRequirements` (:98-120) keeps archive's requirement regex (:104) and its `name` (`requirementName`, :95). The `anchor` moves to GitHub's rule, from the line itself: when `###` is followed by a space or tab, take the rest of the line, trim it, drop a closing `#` run that follows a space or tab (CommonMark), and `slugify` what is left, so inner spaces stay (`### Requirement:  X` anchors `requirement--x`; `### Requirement: X ###` anchors `requirement-x`, while archive's name is `Requirement: X ###`). When `###` is followed by anything else (`###Requirement: X`, or a no-break space), GitHub renders a paragraph: the requirement keeps its name, for the proof check and for MODIFIED matching, but gets no anchor, so `Requirement.anchor` becomes optional and the proof check names it unproven unless it is marked unenforced. `resolvableAnchors` (:340), `unprovenRequirements` (:261) and `duplicateHeadings` (:282) skip an absent anchor.

The scenario regex (:106) accepts only a space or tab after `####`, and its captured text drops a closing `#` run before `slugify`, so `#### Scenario: X ####` anchors `scenario-x` and a no-break space after `####` is no scenario.

Every permanent heading is canonical today (checked: no inner double space, closing run or missing space), so no live anchor moves. The `it` titled "a scenario heading is read with any spacing after #### …" keeps its title and assertions; its fixtures use spaces only.

New rule tests:

- requirement headings `### Requirement:  Two spaces`, `### Requirement: Closed ###` and a scenario `#### Scenario: Closed too ####` are citable as `requirement--two-spaces`, `requirement-closed` and `scenario-closed-too`; `requirement-two-spaces` and `requirement-closed-` are not ({@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-heading-github-anchors-with-its-spaces-kept}).
- `###Requirement: Glued` is not citable as `requirement-glued` and the proof check reports `Requirement: Glued`; a scenario heading with a no-break space after `####` adds no scenario ({@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-heading-with-no-space-after-its-marker}).

Both fail before the fix.

**Bullet corrections:** two shapes beyond the bullet fail the same way — a closing run on a requirement heading (fails closed) and `###` with no space (fails open).

### BL-81 with BL-83 — renames walked in order, as archive applies them

Archive applies renames in order against a running name map (`specs-apply.js:268-300`): FROM missing throws "source not found" (:285) unless TO already exists (an early-sync no-op, :275-283); TO already present throws "target already exists" (:287-288). Names are compared exactly, trimmed (`normalizeRequirementName`).

One file-local helper walks a delta's rename pairs in document order against a running copy of the permanent spec's names, deleting FROM and adding TO for each pair it accepts:

- `deltaAnchors` (:188-203) accepts a pair only when FROM is in the running set and TO is not. Only accepted TOs become citable, and only accepted TOs let a MODIFIED requirement through (:197). A refused pair whose TO is already permanent stays citable through the permanent spec, as archive's no-op leaves it.
- `deltaProof` (:214-236) gains an optional third parameter `existing` (the permanent spec's names, default empty). It refuses a pair when TO is in the running set (BL-83), so FROM stays needing a citing test. It does not check FROM: a FROM the permanent spec lacks names no requirement the proof check reads, so keeping it in `gone` is harmless. With the default empty set nothing is refused that is not a BL-84 repeat, so existing `deltaProof` calls keep their results.
- `openChanges` (:354) takes `specs = mainSpecs()` and passes each capability's names to `deltaProof`. Its one caller (:374) stays as it is.

A chain (A to B, then B to C) succeeds, as archive's in-order apply does; a plain `existing.has(from)` would refuse its second link.

New rule tests:

- a rename from a name the permanent spec does not hold makes nothing citable ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-whose-old-name-matches-nothing}).
- A to B then B to C: `requirement-c` is citable and A is gone ({@link openspec/specs/spec-workflow/spec.md#scenario-a-chain-of-renames-in-one-delta}).
- main holds `Untested` and `Taken`; a rename from `Untested` to `Taken` leaves `Untested` reported by the proof check ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-onto-a-name-the-permanent-spec-already-holds}).

All three fail before the fix. The six existing `it`s that change are in Decision 2; one of them, "a delta name that differs from the permanent one only in case or punctuation matches nothing", now proves its modified scenario ({@link openspec/specs/spec-workflow/spec.md#scenario-a-delta-name-that-differs-from-the-permanent-one-only-in-case-or-punctuation}).

**Bullet correction:** six existing `it`s change, not one.

### BL-82 — a requirement modified and also removed or renamed away

Archive's pre-validate refuses a name in both MODIFIED and REMOVED (`specs-apply.js:154-156`, thrown at :187-189) and a MODIFIED name equal to any parsed RENAMED FROM ("MODIFIED must reference the NEW header", :165-180), exact names. Both are checked per delta text, before anything is applied, and the FROM check ignores the permanent spec.

Per delta text, collect the REMOVED names (heading and bullet forms, fenced lines skipped — one reader shared with `deltaProof`'s REMOVED branch) and every parsed rename pair. A MODIFIED name in either set is a conflict. Its MODIFIED anchors do not resolve, it adds no scenarios and no unenforced flag, the REMOVED entry does not put it in `gone`, and a rename from it is dropped whole (its TO is not citable, its FROM is not gone). Conflicts are found within one delta text, never across the `into` that `openChanges` accumulates for several changes.

New rule test: main holds `Removed one` and `Renamed one`. A delta removes `Removed one` and modifies it with a new scenario; renames `Renamed one` to `Fresh` and modifies `Renamed one` with a new scenario. Neither new scenario nor `requirement-fresh` resolves, and the proof check reports both main requirements ({@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-modified-and-also-removed-or-renamed-away}). It fails before the fix.

**Bullet correction:** the window is commit to push, not "until archive": `openspec validate --all` reports both shapes as ERRORs (`validator.js:300-302`, :313-317), and `openspec.yml` runs it on push. The exemption also fails open for a MODIFIED rename FROM, not only for REMOVED+MODIFIED.

### BL-84 — the other conflicts archive's pre-validate refuses

Extends BL-82's per-delta sets. Each conflict drops everything it names, as in BL-82:

- a name in ADDED and MODIFIED (`specs-apply.js:157-158`): neither block's anchors resolve, and the MODIFIED block adds no scenarios or flag;
- an ADDED name equal to a rename's TO (:183-184): the ADDED block and the pair are dropped;
- a rename FROM that a REMOVED name matches folded — trimmed, lower-cased, whitespace collapsed, as archive's `foldRequirementName` (`requirement-blocks.js:12-14`; check :174-177): the pair is dropped and the REMOVED name does not enter `gone`;
- a FROM or TO repeated in RENAMED (:143-147): every pair holding it is dropped;
- a name repeated within ADDED, MODIFIED or REMOVED (:115-137): every copy is dropped.

New rule test: one delta per shape against a main holding the names involved; no citation of a name involved resolves, and the proof check reports each main requirement involved ({@link openspec/specs/spec-workflow/spec.md#scenario-delta-names-archives-pre-validate-refuses}). It fails before the fix.

`openspec validate --all` reports every BL-84 shape as an ERROR (`validator.js:286-331`), so its window is commit to push. BL-83's shape is the only one validate reports only as INFO.

## Decisions

### 1. All members — approve editing the gate's helpers and adding rule tests

Helper code in `scripts/__tests__/spec-citations.test.ts` (`parseRequirements`, `deltaAnchors`, `deltaProof`, `openChanges`, `resolvableAnchors`, `unprovenRequirements`, `duplicateHeadings`, new file-local helpers) and the new rule `it`s listed per member above. No existing assertion changes under this decision.

- **a. Approve.** Closes the fail-open gaps before push or archive.
- **b. Not now:** all members stay in the backlog.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-17)

### 2. BL-81 — approve changing six existing `it`s

`deltaAnchors`' `existing` defaults to an empty set, so every fixture that renames without passing its old name loses its rename once FROM must exist. Five fixtures add the old names; one assertion flips on purpose.

- "a change delta makes its ADDED, MODIFIED and RENAMED headings citable" (:535): `existing` becomes `new Set(["Requirement: Old thing", "Requirement: Before"])`.
- "a RENAMED name that holds a code span is citable in full" (:563): pass `new Set(["Requirement: Old flag"])`.
- "a rename in any spelling OpenSpec's archive accepts is read, and only at line start" (:580): pass `new Set(["Requirement: Old thing", "Requirement: Second old", "Requirement: Third old"])`. Its `gone` assertion does not change.
- "a rename line with no partner is neither citable nor gone, as archive pairs them" (:673): pass `new Set(["Requirement: Untested"])`. The `[]` at :658 stays.
- "a delta section heading is matched trimmed, in any letter case, and whole" (:690, :700): pass `new Set(["Requirement: Before"])` to every `deltaAnchors` call, so the CRLF equality still compares non-empty lists.
- "a delta name that differs from the permanent one only in case or punctuation matches nothing" (:803): `["requirement-shared"]` becomes `[]`, since that rename's FROM matches no permanent name and archive would refuse it.

- **a. Approve.** BL-81 ships.
- **b. Not now:** BL-81 parks; a rename from a misspelled name stays citable until archive throws.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-17)

### 3. BL-84 — fold it into this batch

Found by the BL-82 investigator in triage. Same functions, same approval as Decision 1. Validate catches every BL-84 shape on push, so the gain is the commit-to-push window and one place where the gate's reading of a delta matches archive's pre-validate.

- **a. Include.** Five fixes, the batch ceiling.
- **b. Leave in the backlog:** four fixes.

**Recommendation:** a.

**Answer:** a — include (Oleg, 2026-10-17)

### 4. Drop what a conflict names, not the whole delta

A technical call, made in triage under CLAUDE.md ("Decide technical choices yourself"); recorded, not asked. Archive refuses a whole spec file on any refused shape. The gate could make a refused delta contribute nothing, but `backlog-10` already drops only the offending MODIFIED requirement, and a per-name drop keeps the failure pointed at the line to fix, while still failing closed on everything archive would refuse. Both sides of a conflict are dropped, so neither half fails open.

### 5. `deltaProof` checks TO, not FROM, and takes the permanent names optionally

A technical call, recorded. FROM-missing pairs are harmless in `gone` (they name no permanent requirement), and checking FROM there would empty `gone` in the existing `deltaProof` calls that rename without permanent names, edits Decision 1 does not cover. TO-present is the only rename refusal that changes the proof check (BL-83), and with the default empty set it changes no existing result.

## Risks / Trade-offs

- [The gate mirrors private parsers of a global CLI, which a later release can change.] → The rules are pinned here with their source lines. Re-read `requirement-blocks.js`, `specs-apply.js` and `validator.js` when the CLI is upgraded.
- [BL-80's anchor rule applies to the permanent specs through the shared `parseRequirements`.] → Every permanent heading is canonical today, so no anchor moves; the repo-level gate `it`s prove it in `pnpm test:unit`.
- [The spec delta describes these shapes in prose and is itself parsed by the live gate.] → No line of the delta starts with a fixture shape; every such shape sits inside a sentence.
