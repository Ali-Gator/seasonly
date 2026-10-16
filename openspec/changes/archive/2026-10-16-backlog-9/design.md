## Context

See proposal.md for why. Triage ran on `origin/main` at `335c669`. Five read-only Plan investigators ran in parallel: BL-73 and BL-74 (pass 1), and BL-75, BL-08 and BL-54 (pass-2 Testing sweep). The reference parser is `@fission-ai/openspec` 1.13.0, the global CLI at `/usr/local/lib/node_modules/@fission-ai/openspec` (not a repo dependency). It lives in `dist/core/parsers/requirement-blocks.js` and `code-fence.js`. `openspec validate` reads deltas with the same `parseDeltaSpec` (`validator.js:158`), and archive applies them through it (`specs-apply.js:111`). No canvas design is involved.

| Id    | Lane | Why                                                                                     |
| ----- | ---- | --------------------------------------------------------------------------------------- |
| BL-73 | B    | The gate lives in an existing test file (Decision 1).                                   |
| BL-74 | B    | Same file (Decision 1).                                                                 |
| BL-75 | B    | Same file (Decision 1). Reopened from `deferred` (see BL-75 below).                     |
| BL-08 | A    | Spec-only: an `**Unenforced:**` line, like the daily cap. No code or test changes.      |
| BL-54 | D    | Trigger fired (t18 live since 2026-10-13); waits on Oleg's paid phone run in both apps. |

## Goals / Non-Goals

**Goals:** the gate reads an open delta the way archive will apply it: section headings, rename pairs and code fences. The email limit's spec stops implying a test proves its race.

**Non-Goals:**

- No REMOVED bullet spelling. Archive's `parseRemovedNames` also takes a requirement written as a bullet (`- ### Requirement: …`, optional backticks); the gate does not, so the requirement keeps needing a citing test (fails closed). That was not part of the approved edit, so it is logged as BL-76.
- No folding of interior whitespace in headings. Archive compares the trimmed title exactly, so `## RENAMED  Requirements` with two spaces is no section to archive either. Folding would make the gate fail open.
- No extraction of the gate helpers to a module: that is a bigger diff that still edits the test file.
- No real-Postgres race test for BL-08 (Decision 2).

## Members

All three gate items change the file-local helpers in `scripts/__tests__/spec-citations.test.ts` (approved, Decision 1). One shared walk serves `deltaAnchors` and `deltaProof`, so the two readers cannot drift.

### BL-75 — one fence mask, archive's rules

Port `buildCodeFenceMask` (`code-fence.js`) as a file-local helper: lines in, `boolean[]` out. A fence opens on a line matching `^\s*(`{3,}|~{3,})`, recording the marker character and its length. It closes on a line matching `^\s*(`{3,}|~{3,})\s*$` with the same marker and at least that length. The opening and closing lines are themselves masked. Three readers use it:

- the section split in `deltaAnchors` and `deltaProof` (BL-74 below), so a fenced `## …` line opens no section;
- the rename pair reader (BL-73 below), so a fenced rename line is neither citable nor gone;
- `parseRequirements` (:66-87), whose own toggle (`line.startsWith("```")`, column 0, backticks only) it replaces.

Archive's `splitTopLevelSections` slices the mask with each body, so a body's lines keep the mask of the whole file. Do the same: build the mask once per delta, not once per section.

**Why this reverses `backlog-8`'s Non-Goal.** `backlog-8` left the fence skip out until a delta carried a fenced rename. That trigger can never visibly fire, because the miss is a silent fail-open: the gate passes. And the permanent spec already says a non-rename line is never read as one. Its cost is one condition in a loop BL-73 rewrites anyway.

New rule test, written last (the mask is purely additive, wired into the section reader, the pair reader and `parseRequirements` once BL-73 and BL-74 have landed): a delta with a RENAMED section whose only rename sits inside a ``` fence, and another inside a `~~~` fence indented two spaces, leaves the old requirement reported by the proof check and the new name not citable. In the same `it`, a fenced `## RENAMED Requirements` line opens no section, and a `### Requirement:` line inside an indented `~~~` fence within an ADDED section makes nothing citable ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-example-inside-a-code-fence}). It fails before the fix.

### BL-74 — headings matched as archive matches them

Replace both `text.split(/^(?=## )/m)` splits, the four `section.startsWith("## … Requirements")` checks and the two `/^## .*\n/` header strips with one section reader:

- Walk the delta's lines. A line not masked by a fence that matches `^##\s+(.+)$` starts a new section, its title `m[1].trim()`. `###` never matches, because its third character is not whitespace.
- The kind is the title lowercased and compared **whole** against `added requirements`, `modified requirements`, `removed requirements` and `renamed requirements`. Any other title is a section of no kind, which still ends the one before it. This also closes the opposite hole: `startsWith` read `## ADDED Requirements (x)`, which archive ignores (fails open).
- Return each section's kind, its body lines and their fence-mask slice, in document order. Repeated and case-variant headings stay separate bodies; archive merges them for lookup but pairs renames body by body.

`parseRequirements`' requirement line becomes archive's `REQUIREMENT_HEADER_REGEX`, `/^###\s*Requirement:\s*(.+)\s*$/i`. The stored name and the slug use `Requirement: ${m[1].trim()}`, so the anchor matches archive's normalised name whatever case the keyword was written in. `parseRequirements` also reads the permanent specs. Every permanent heading is already canonical, so their anchors do not move.

New rule test: a delta whose sections are headed `## Renamed Requirements` and `##   modified requirements  ` makes the renamed-to name and the modified requirement's new scenario citable via `deltaAnchors`, and the old name gone via `deltaProof`. A `## ADDED Requirements (draft)` section adds nothing ({@link openspec/specs/spec-workflow/spec.md#scenario-a-delta-section-heading-in-another-letter-case}). It fails before the fix.

### BL-73 — rename lines read as pairs

Replace `renamedAnchors(section, keyword)` with a pair reader over one RENAMED body (lines plus mask), which mirrors `parseRenamedPairs` (`requirement-blocks.js:280-306`) and keeps backlog-8's line patterns (start of line, optional `-`/`*`/`+` bullet, optional backticks, spaces as `[^\S\n]`, name captured lazily). Pairing rules:

- Skip masked lines.
- An old-name line sets the pending old name, overwriting an unpaired earlier one.
- A new-name line sets the pending new name. When an old name is pending, it emits the pair `{from, to}` and clears both.
- A new-name line with no old name pending emits nothing. Its name stays pending, but archive only pairs on a new-name line, so a later old name pairs with the _next_ new-name line, not this one.
- State starts empty for each RENAMED body. Never concatenate bodies and then pair.

`deltaAnchors` makes only paired `to` anchors citable, and its MODIFIED check (`renamed.includes`) uses that list. `deltaProof` adds only paired `from` anchors to `gone`. Slugs stay `slugify("Requirement: " + name.trim())`.

New rule test: a RENAMED body whose lines run in this order — first a lone new-name line (archive drops it: no old name is pending), then an old-name line followed only by a misspelled new-name line (`T0:` or `TOO:`, which neither pattern reads). Archive emits zero pairs for it; trace its loop over the fixture to confirm. The old requirement stays reported by the proof check, and the lone new name is not citable ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-line-with-no-partner}). It fails before the fix. The existing rename tests (:437, :473, :483, :509) all use paired lines, and their assertions hold.

Write every fixture's rename and fence lines inside template strings in the test file, as the existing ones are. Never put a line-start rename line or a fenced rename example into a real delta under `openspec/changes/`.

### BL-08 — the email limit's race is marked unenforced

The delta adds an `**Unenforced:**` line on its own line to "A report gets at most 3 emails", before the first scenario. It is worded like the daily cap's (`abuse-controls/spec.md:47`): the race is not exercised, because the in-process test database has one connection; the row lock carries it; the scenarios prove the counting; a test pins that the lock is in the SQL. `store.test.ts` is not touched. Its JSDoc at :106-108 stays, and its citation of `#scenario-two-requests-at-once` still resolves, because the scenario name does not change. The requirement is already proven by its three "fourth address" citations, so the gate's result does not move. Files: none beyond the delta, which archive applies.

## Decisions

### 1. BL-73, BL-74, BL-75 — approve the edit to `scripts/__tests__/spec-citations.test.ts`

Helper code only:

- the rename pair reader (BL-73);
- heading equality in `deltaAnchors`/`deltaProof`, and case-insensitive `### Requirement:` in `parseRequirements`, which also reads the permanent specs (BL-74);
- one shared archive-style fence mask, used by the section split, the rename reader and `parseRequirements` (BL-75).

Three new rule tests; no existing `it` or fixture changes. Copying archive's rules exactly is a technical call (above).

- **a. Approve all three.**
- **b. Approve BL-73 and BL-74 only:** BL-75 goes back to deferred, and a fenced example rename still silently exempts a requirement.
- **c. Not now:** all three stay open, and the batch drops to one fix.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-16)

### 2. BL-08 — mark the race unenforced rather than race it on real Postgres

A technical call, made in triage under CLAUDE.md ("Decide technical choices yourself"); recorded, not asked.

- **a. `**Unenforced:**` line** (chosen). It follows the daily-cap precedent, needs no new infrastructure, and keeps the pre-commit hook offline. Ceiling: the regex test at `store.test.ts:112-116` is the only guard against someone removing `for update`.
- **b. Two-session race against a real Postgres** (a `pg` devDependency, a `services: postgres` job in `ci.yml`, a `skipIf` when no database URL is set). It is a true proof, but it adds a dependency and a CI service, and runs only in CI. PGlite cannot do it: each instance is a single-connection database.

Revisit (b) if either lock is ever lost in a refactor. It would enforce the daily cap's race too.

## Risks / Trade-offs

- [The gate now mirrors a private parser of a global CLI. OpenSpec can change its rules in a later release.] → The rules are pinned here with their source lines. The rule tests fail if the gate drifts from what they pin, but not if OpenSpec moves. Re-read `requirement-blocks.js` and `code-fence.js` when the CLI is upgraded.
- [Case-insensitive `### Requirement:` matching applies to the permanent specs too.] → Every permanent heading is canonical today, so no anchor moves. `pnpm test:unit` proves it on the real repo through the two gate `it`s at :281 and :289.
