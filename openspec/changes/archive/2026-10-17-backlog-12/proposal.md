## Why

The citation gate still lets a test lean on a name OpenSpec's archive will never write. A rename's new name stays citable when a later rename in the same delta moves it on, or when the delta removes it (BL-86). A name both added and removed in one delta keeps its added anchors citable and its removed name exempt, though archive's pre-validate refuses it (BL-87). A MODIFIED block whose heading GitHub anchors differently from the permanent one leaves the permanent anchor citable and proven until archive writes the delta's heading over it, and a modified block that drops `**Unenforced:**` stays exempt (BL-88). An ADDED requirement whose name the permanent spec already holds makes its anchors citable, though archive refuses it unless the block is identical (BL-89). Each fails open until push or archive. Underneath, every helper re-parses the same delta, and two rename walks disagree on a missing old name (BL-90), which is a trap for BL-86.

## What Changes

- **BL-90:** each delta is parsed once, and one rename walk checks the old name the way archive does, shared by the citation side and the proof side. `mainSpecs()` is memoized. The gate's output does not change.
- **BL-87:** a name in both ADDED and REMOVED joins the conflicts that make nothing they name citable or exempt.
- **BL-86:** a rename's new name is citable only when the delta still holds it after all its renames and its removals.
- **BL-89:** an ADDED requirement whose name the permanent spec still holds, after the delta's renames, makes nothing citable that the permanent spec does not.
- **BL-88:** a requirement an accepted MODIFIED block replaces resolves and is proven through the delta's own requirement and scenario headings and its own unenforced flag, in place of the permanent ones. A rename then modified is citable by the modified heading's anchor. When several open changes modify one requirement, all their headings count.

## Members

| Id    | Title                                                               | Lane                                                              |
| ----- | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| BL-90 | The gate re-parses each delta several times and walks renames twice | B — four existing tests' arguments approved (Oleg, 2026-10-17)    |
| BL-87 | A name both added and removed in one delta still counts             | B — gate edit approved (Oleg, 2026-10-17)                         |
| BL-86 | A rename's new name stays citable when the delta moves it on        | B — gate edit approved (Oleg, 2026-10-17)                         |
| BL-89 | An ADDED name the permanent spec already holds stays citable        | B — gate edit approved (Oleg, 2026-10-17)                         |
| BL-88 | A MODIFIED block's own heading never replaces the permanent anchor  | B — Oleg chose to include it over deferring it (Oleg, 2026-10-17) |

Selection: no argument, pass 1. BL-86 to BL-90 were the only `open` items in `docs/backlog.md`. Every other item is `gated` (BL-13, BL-39, BL-50 on more labeled people; BL-54 on Oleg's paid phone run; BL-61 on a Light Spring canvas board) or `deferred` on a trigger that has not fired (BL-49, BL-51, BL-68, BL-18, BL-19, BL-02, BL-85, BL-04, BL-27, BL-28, BL-32, BL-33, BL-34), so pass 2 did not run.

## Parked

_None._ No investigated item is lane D. Triage logged two new items, not members: BL-91 (a removal that folds onto a rename's new name aborts archive; `open`, next batch) and BL-92 (the gate reads requirement headings outside `## Requirements`; `deferred`, none exists).

## Base branch

`origin/main` at `d78324e` (`backlog-11` and the Pinterest verification file merged; triage read the backlog at `34d4c9a`, identical there). It carries BL-86 to BL-90 and `_Next id:_ BL-91`. Triage logged BL-91 and BL-92 and bumped the counter to BL-93.

## Approved test edits

All in `scripts/__tests__/spec-citations.test.ts`:

- **BL-86, BL-87, BL-89** (design.md Decision 1) and **BL-88** (Decision 3): helper code and new rule `it`s. No existing assertion, fixture or call changes.
- **BL-90** (design.md Decision 2): four existing `it`s pass the permanent names as `deltaProof`'s third argument, at five calls named there. No assertion value changes.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `spec-workflow`: the citation gate counts a rename's new name only when the delta still holds it, refuses a name added and removed, ignores an ADDED block for a name already held, and lets an accepted MODIFIED block's own headings and flag replace the permanent ones.

## Impact

- `scripts/__tests__/spec-citations.test.ts` only (approved). No app, package, route or CI file changes.
- `openspec/specs/spec-workflow/spec.md` through the delta.
- `docs/backlog.md`: BL-86 to BL-90 are deleted when they ship. Triage logged BL-91 and BL-92.
