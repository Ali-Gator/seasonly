## Context

See proposal.md for why. Triage ran on `origin/main` at `a7cc9d9`. Four read-only Plan investigators ran in parallel, one per member. The reference parser is `@fission-ai/openspec` 1.13.0, the global CLI at `/usr/local/lib/node_modules/@fission-ai/openspec` (pinned in CI at `.github/workflows/openspec.yml:26`, not a repo dependency): `dist/core/parsers/requirement-blocks.js`, `requirement-text.js`, `markdown-parser.js`, `dist/core/specs-apply.js` and `dist/core/validation/validator.js`. No canvas design is involved.

| Id    | Lane | Why                                                                                                    |
| ----- | ---- | ------------------------------------------------------------------------------------------------------ |
| BL-79 | B    | Pure refactor of the gate, which lives in an existing test file; three call sites change (Decision 1). |
| BL-77 | B    | Same file (Decision 1). Scope narrowed to the scenario heading (Decision 3, a technical call).         |
| BL-78 | B    | Same file, and existing assertions change from slugs to names (Decision 2).                            |
| BL-76 | B    | Same file (Decision 1).                                                                                |

## Goals / Non-Goals

**Goals:** the gate reads REMOVED bullets and scenario headings as archive does, and compares a delta's names with the permanent spec's as archive does. `parseRequirements` takes lines, so a section body's fence mask lines up by construction.

**Non-Goals:**

- No change to where a requirement ends (BL-77's first half; Decision 3).
- No `####` heading other than a scenario heading counts as a scenario (Decision 3, option c).
- No fix for inner spaces in a requirement name (`### Requirement:  X`). The gate anchors it `requirement-x`, GitHub `requirement--x`. Found while checking BL-77's slug rule; outside the approved edit, so logged as BL-80.
- No "did you mean" report for near-miss names, as archive's `foldRequirementName` gives. Comparing exact names already fails closed with the outcome archive reaches.
- No extraction of the gate helpers to a module.

## Members

All four change file-local helpers in `scripts/__tests__/spec-citations.test.ts`. Order matters: BL-79 first (the others build on its signature), then BL-77 (inside `parseRequirements`), then BL-78 (re-keys `gone`, `scenarios` and `existing`), then BL-76 (adds to `gone` in BL-78's keys).

### BL-79 — `parseRequirements` takes lines

Signature becomes `parseRequirements(lines: string[], mask: boolean[] = fenceMask(lines))`; the internal `splitLines` call goes away. Callers:

- `deltaAnchors` (:192) and `deltaProof` (:216, :220) pass `body` and `mask` with no `join`.
- `mainSpecs` (:311) passes `splitLines(fs.readFileSync(...))`, so a permanent spec still gets archive's BOM and CRLF normalisation.
- The three fixture call sites listed in Decision 1. No assertion changes.

The only behavioral difference: a section body whose first line starts with U+FEFF was stripped by the re-split, which archive (normalising only at file start) does not do. Passing lines removes that difference. No test needed for it; the existing suite, unchanged, is the proof.

### BL-77 — scenario headings read as archive reads them

The scenario regex at :103 becomes `/^####\s+(scenario:.*\S.*)$/i`-shaped: `####`, one or more whitespace, `Scenario:` in any letter case, some text. The anchor is `slugify` of the captured text as written, so `####  scenario:  X` anchors `scenario--x`, GitHub's slug of the heading archive writes into the main spec verbatim. `#####` never matches (its fifth character is not whitespace). The `/^#{1,3} /` block end and the requirement regex stay as they are.

This applies to the permanent specs too, through the shared `parseRequirements`. Every permanent scenario heading is canonical today (checked: no `####` heading other than `#### Scenario: `), so no anchor moves.

New rule test: a spec and a delta whose scenario headings are `#### scenario: Lower case` and `####   Scenario:  Wide`. Both are citable (`scenario-lower-case`, `scenario--wide`) through `deltaAnchors` and through `parseRequirements(...).scenarios`; a `#### Notes` heading inside the requirement adds no scenario ({@link openspec/specs/spec-workflow/spec.md#scenario-a-scenario-heading-in-another-letter-case}). It fails before the fix.

### BL-78 — exact names where the delta meets the permanent spec

Anchors stay slugs for citation lookup. Every comparison between a delta and the permanent spec moves to the requirement's `name` (`Requirement: <trimmed>`, built the same way on both sides):

- `renamedPairs` returns names (`Requirement: ${captured.trim()}`), not slugs. `deltaAnchors` slugs the `to` names for the anchors it returns, and checks MODIFIED requirements against the `to` names.
- `deltaAnchors`' `existing` becomes the main spec's names. `resolvableAnchors` (:336) builds it from `r.name`.
- `OpenDelta.gone` and the `scenarios` map are keyed by name (:216, :218, :221, :222). `unprovenRequirements` (:264, :265) looks up `r.name`.
- Doc comments at :5-10, :178-183 and :203 say names, not anchors.

Existing assertions that change are listed in Decision 2.

New rule test: main has `Untested` and "`plan_shared` fires on a slug-mint, never: on open". A delta REMOVEs `untested`, RENAMEs FROM the second name without its backticks and colon, and MODIFIEs `UNTESTED` with an `**Unenforced:**` line and a new scenario. No test cites the main requirements. Both stay reported by the proof check, the MODIFIED scenario does not resolve through `deltaAnchors` with the main names as `existing`, and a test citing it proves nothing ({@link openspec/specs/spec-workflow/spec.md#scenario-a-delta-name-that-differs-from-the-permanent-one-only-in-case-or-punctuation}). It fails before the fix.

**Bullet corrections** (from archive's source):

- `Un-tested` does not collide with `Untested`: `slugify` keeps hyphens (`requirement-un-tested`).
- A case-only REMOVED mismatch does not leave the requirement in place silently: archive throws "REMOVED failed … fix the header to match it exactly" (`specs-apply.js:321-323`). MODIFIED and RENAMED mismatches throw too (`:337-338`, `:285`).
- The silent case is a REMOVED name that differs only in punctuation `slugify` drops (backticks, colon, comma, period, apostrophe, parentheses): archive only warns "treating it as already removed" (`:325`) and keeps the requirement.
- In every case the gate is wrong while the change is open: it exempts or proves main's requirement, so a test citing it can be deleted with every gate green. `openspec validate` does not catch it: archive's throws come back as INFO "Archive would refuse this delta", which never fails a report, and the REMOVED warning runs silent (`validator.js:337-347`, `:697-743`). The fail-open ends at archive, when the proof check sees the untouched requirement.

### BL-76 — REMOVED bullet form

In `deltaProof`'s REMOVED branch, besides the requirements `parseRequirements` reads, collect each unmasked line matching archive's bullet pattern from `parseRemovedNames` (`requirement-blocks.js:248-270`): ``/^\s*[-*+]\s*`?###\s*Requirement:\s*(.+?)`?\s*$/`` — `Requirement:` case-sensitive, as archive has it, though the header form is not. Add `Requirement: ${m[1].trim()}` to `gone`. Archive skips fenced lines here too (`if (fenceMask[i]) continue`), so skipping masked lines matches it exactly. REMOVED makes nothing citable, so `deltaAnchors` does not change.

New rule test: a REMOVED section listing `- ### Requirement: Untested`, ``* `### Requirement: Second` `` and a fenced `+ ### Requirement: Third`. No test cites any of them. The proof check reports only `Third`, and `deltaProof(...).gone` holds the first two names ({@link openspec/specs/spec-workflow/spec.md#scenario-a-removal-written-as-a-list-bullet}). It fails before the fix.

Write every fixture's bullet, heading and fence lines inside template strings in the test file, as the existing ones are. Never put such a line into a real delta under `openspec/changes/`.

## Decisions

### 1. BL-79, BL-77, BL-76 — approve the edit to `scripts/__tests__/spec-citations.test.ts`

Helper code: the lines-in `parseRequirements` (BL-79), the scenario regex (BL-77), the REMOVED bullet reader (BL-76). Two new rule tests (BL-77, BL-76). No assertion changes.

The three `parseRequirements` call sites pass lines instead of a string (line numbers at `a7cc9d9`, a hint only):

- the shared `specs` fixture of `describe("spec citation rules")` (:414): `parseRequirements(splitLines(SPEC))`;
- "a requirement whose prose only names the unenforced flag still needs a citing test" (:446): `parseRequirements(prose)`, already an array;
- "a repeated scenario name within a capability is reported" (:696): `parseRequirements(splitLines(SPEC + …))`.

- **a. Approve all three.**
- **b. Not now:** all three stay open, and the batch drops below three fixes.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-16)

### 2. BL-78 — approve rewriting existing assertions from slugs to names

The comparison key changes on purpose, so these change with it. One new rule test.

Assertions that change from slugs to requirement names (line numbers at `a7cc9d9`, a hint only):

- "a change delta makes its ADDED, MODIFIED and RENAMED headings citable" (:525): `existing` becomes `new Set(["Requirement: Old thing"])`;
- "a MODIFIED requirement missing from the main spec makes nothing citable" (:543): the same `existing` set;
- "a rename in any spelling OpenSpec's archive accepts is read, and only at line start" (:575-579): the `gone` list;
- "a rename line with no partner is neither citable nor gone, as archive pairs them" (:664): the `gone` list;
- "a delta section heading is matched trimmed, in any letter case, and whole" (:686, :687, :691): both `gone` lists and the `proof.scenarios` key (`requirement-after` becomes `Requirement: After`; its scenario slugs stay).

Assertions of `[]` (:725, :745) stay.

- **a. Approve the rewrite.** Closes the fail-open while a change is open.
- **b. Not now:** BL-78 parks; the batch ships three fixes, and the fail-open stays until the archive commit catches it.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-16). The `proof.scenarios` key in "a delta section heading is matched trimmed, in any letter case, and whole" was missed in the first list and approved separately (Oleg, 2026-10-16).

### 3. BL-77 — widen the scenario heading only, keep the block end

A technical call, made in triage under CLAUDE.md ("Decide technical choices yourself"); recorded, not asked. OpenSpec's own parsers disagree on where a requirement ends: archive's splitter (`parseRequirementBlocksFromSection`) runs a block on to the next requirement header or `## ` line, while the main-spec parser (`markdown-parser.js:59-141`) makes a `### Notes` its own node and gives a following scenario to it. Archive warns that such a heading "goes with" the requirement (`specs-apply.js:395-403`), and the validator says it "would pass validate <change> while failing archive/validate <spec>" (`validator.js:160-175`).

- **a. Scenario heading only** (chosen). Any spacing after `####`, `Scenario:` in any case, slug as written. It is the one reading archive, the main-spec parser and GitHub's slugs all agree on. The gate's block end already gives the same answer before and after archive, and fails closed on a layout OpenSpec itself flags.
- **b. Also archive's block end**, for deltas and main specs. A scenario or `**Unenforced:**` line after `### Notes` would then count for the requirement above, which the main-spec parser disputes.
- **c. Any `####` heading is a scenario**, as archive's `SCENARIO_HEADER` (`/^####\s+/`) counts them. `#### Edge case` would become a citable anchor, and the constitution's Behavior prose ("the GitHub heading slug of a `### Requirement:` or `#### Scenario:` heading") would need a rewrite outside any delta.

The constitution prose still reads `#### Scenario:`. Under (a) a lower-case `#### scenario:` heading is the same heading in another case, so the prose stays true; no edit.

## Risks / Trade-offs

- [The gate mirrors private parsers of a global CLI, which a later release can change.] → The rules are pinned here with their source lines. Re-read `requirement-blocks.js`, `requirement-text.js` and `specs-apply.js` when the CLI is upgraded.
- [BL-77's wider scenario regex and BL-79's signature apply to the permanent specs too.] → Every permanent heading is canonical today, so no anchor moves. `pnpm test:unit` proves it on the real repo through the repo-level gate `it`s.
- [BL-78 keys on `Requirement: <trimmed>`; a mismatch in how the two sides build that string would fail open or closed.] → Both sides build it from the same capture-then-trim shape (`parseRequirements` and `renamedPairs`, as archive's `normalizeRequirementName` does). The new rule test pins case and punctuation mismatches.
