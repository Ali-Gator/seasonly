## Why

The `backlog-8` review found that the citation gate still reads open deltas differently from OpenSpec's archive. A `FROM:` line with no `TO:` exempts a requirement archive never renames, so it fails open (BL-73). A section heading in another case is dropped, so it fails closed (BL-74). A rename line inside a code fence counts, so it fails open again (BL-75). Separately, the abuse-controls scenario "Two requests at once" claims a test proof it does not have (BL-08).

## What Changes

- **BL-73:** the gate reads rename lines as `FROM:`/`TO:` pairs per RENAMED section, with archive's pairing rules. A lone `FROM:` exempts nothing, and a lone `TO:` makes nothing citable.
- **BL-74:** delta section headings are matched as archive matches them: trimmed, case-insensitive, by equality rather than prefix. `### Requirement:` headings are matched case-insensitively too.
- **BL-75:** one fence mask, built to archive's rules (indented fences, `~~~`, close by length), hides fenced lines from the section split, the rename reader and `parseRequirements`.
- **BL-08:** the requirement "A report gets at most 3 emails" is marked `**Unenforced:**` for its race, like the daily cap. One test database connection cannot race two sessions, and the row lock carries the guarantee.

## Members

| Id    | Title                                                            | Lane                                           |
| ----- | ---------------------------------------------------------------- | ---------------------------------------------- |
| BL-73 | A lone `FROM:` line exempts its requirement from the proof check | B — test-file edit approved (Oleg, 2026-10-16) |
| BL-74 | The gate reads delta section headers in one spelling only        | B — test-file edit approved (Oleg, 2026-10-16) |
| BL-75 | The gate reads rename lines inside code fences                   | B — test-file edit approved (Oleg, 2026-10-16) |
| BL-08 | Two concurrent email stores are never raced in a test            | A — marked Unenforced (technical call)         |

Selection: no argument, pass 1. Only BL-73 and BL-74 were `open`, below the floor of three, so the batch was topped up from pass 2. The pass-2 sweep took the Testing section, the through-line of the two open items, ahead of the earlier sections. Analysis was re-swept in `backlog-8` triage on 2026-10-15 with its gates unchanged. Privacy BL-18 and BL-19 are deferred by Oleg's own choice. BL-68 waits for launch. Code quality BL-02 is a watch task. Investigated: BL-73, BL-74, BL-75, BL-08, BL-54.

## Parked

- **BL-54** TikTok's and Instagram's in-app browsers are untested against the bot check. Its trigger has fired: t18 has been live on seasonly.me since 2026-10-13. What is left is Oleg's manual phone run: one photo inside each app, which means two paid vision calls. Status line corrected to `gated`.

## Base branch

`origin/main` at `335c669` (`backlog-8` merged). It carries every member's bullet and `_Next id:_ BL-76`.

## Approved test edits

- `scripts/__tests__/spec-citations.test.ts`: gate helper code only. That means the rename pair reader (BL-73); heading equality in `deltaAnchors`/`deltaProof` and case-insensitive `### Requirement:` in `parseRequirements` (BL-74); and one shared fence mask used by the section split, the rename reader and `parseRequirements` (BL-75). Three new rule tests, one per item. No existing `it` or fixture changes (design.md Decision 1, Oleg, 2026-10-16).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `spec-workflow`: the citation gate reads rename pairs, section headings and code fences in a delta as OpenSpec's archive does.
- `abuse-controls`: the per-report email limit says its race is not exercised by a test.

## Impact

- `scripts/__tests__/spec-citations.test.ts` (BL-73, BL-74, BL-75; approved).
- `openspec/specs/abuse-controls/spec.md` through the delta (BL-08). No code or test changes.
- `docs/backlog.md`: BL-73, BL-74, BL-75 and BL-08 are deleted when they ship. Triage corrected the BL-75, BL-08 and BL-54 status lines. Triage logged BL-76 (the REMOVED bullet spelling, found while reading archive's parser; outside the approved edit).
