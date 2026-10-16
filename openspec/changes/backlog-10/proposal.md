## Why

The `backlog-9` triage and review left four places where the citation gate still reads an open delta differently from OpenSpec's archive. A requirement removed as a list bullet keeps needing a test (BL-76, fails closed). A scenario heading in another letter case or spacing is not citable (BL-77, fails closed). Delta names meet the permanent spec by slug, so a name that differs only in case or punctuation exempts the real requirement while the change is open (BL-78, fails open). And section bodies are joined and re-split before `parseRequirements`, so the fence-mask alignment rests on a round trip (BL-79).

## What Changes

- **BL-79:** `parseRequirements` takes lines plus an optional fence mask. Section bodies go in as lines, with no join and re-split. No behavior change.
- **BL-77:** a scenario heading is read as archive reads it: `####`, any spacing, `Scenario:` in any letter case. Its anchor is the slug of the heading text as written. Where a requirement ends does not change (design.md, BL-77).
- **BL-78:** where a delta meets the permanent spec (MODIFIED existence, REMOVED, RENAMED, unenforced and added-scenario proof) names are compared trimmed, whole and case-sensitive, as archive does. Anchors stay slugs for citation lookup.
- **BL-76:** a REMOVED section's bullet form (`- ### Requirement: X`, any `-`/`*`/`+` bullet, optional backticks) removes the requirement from the proof check, as archive does.

## Members

| Id    | Title                                                                   | Lane                                                               |
| ----- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| BL-79 | Section bodies round-trip through a string before `parseRequirements`   | B — test-file edit approved (Oleg, 2026-10-16)                     |
| BL-77 | The gate ends a requirement body and reads scenarios unlike archive     | B — test-file edit approved (Oleg, 2026-10-16); scenario half only |
| BL-78 | The gate matches delta requirement names by slug, archive by exact name | B — assertion rewrite approved (Oleg, 2026-10-16)                  |
| BL-76 | The gate misses a REMOVED requirement written as a bullet               | B — test-file edit approved (Oleg, 2026-10-16)                     |

Selection: no argument, pass 1. The four members were the only `open` items in `docs/backlog.md`. Every other item is `gated` (BL-13, BL-39, BL-50 on more labeled people; BL-54 on Oleg's paid phone run; BL-61 on a Light Spring canvas board) or `deferred` with a trigger that has not fired (BL-49, BL-51, BL-68, BL-18, BL-19, BL-02, BL-04, BL-27, BL-28, BL-32, BL-33, BL-34). Investigated: BL-76, BL-77, BL-78, BL-79.

## Parked

_None._ No investigated item is lane D.

## Base branch

`origin/main` at `a7cc9d9` (`backlog-9` merged). It carries every member's bullet and `_Next id:_ BL-80`. Triage logged BL-80 and bumped the counter to BL-81.

## Approved test edits

All in `scripts/__tests__/spec-citations.test.ts`:

- **BL-79, BL-77, BL-76** (design.md Decision 1): helper code; the three `parseRequirements` fixture call sites listed there pass lines instead of a string; new `it`s. No assertion changes.
- **BL-78** (design.md Decision 2): the `existing` fixtures, `gone` lists and one `proof.scenarios` key in the five `it`s listed there become requirement names instead of slugs. New `it`s.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `spec-workflow`: the citation gate reads REMOVED bullets and scenario headings as OpenSpec's archive does, and compares delta names to the permanent spec by exact name.

## Impact

- `scripts/__tests__/spec-citations.test.ts` only (approved). No app, package, route or CI file changes.
- `openspec/specs/spec-workflow/spec.md` through the delta.
- `docs/backlog.md`: BL-76, BL-77, BL-78 and BL-79 are deleted when they ship. Triage logged BL-80 (the gate folds spaces inside a requirement name that GitHub keeps; found while checking BL-77's slug rule, outside the approved edit).
