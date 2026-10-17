## Why

The citation gate still reads some headings and deltas differently from GitHub and from OpenSpec's archive. A requirement heading with inner spaces, a closing `#` run or no space after `###` gets an anchor GitHub does not render (BL-80). A rename stays citable, and its old name exempt, even when archive would refuse the rename (BL-81, BL-83). A requirement modified under a name the same delta removes or renames away still resolves (BL-82). Other cross-section and repeated names that archive's pre-validate refuses also pass (BL-84). Each fails open until push or archive, so a test can be deleted with every local gate green.

## What Changes

- **BL-80:** a requirement's anchor is the slug of its heading as GitHub renders it: interior spaces kept, a closing `#` run dropped, no anchor when `###` is not followed by a space or tab. A scenario heading needs a space or tab after `####`, and its closing run is dropped. Requirement names, which archive matches, do not change.
- **BL-81, BL-83:** renames are walked in order against the permanent spec's names, as archive applies them. A rename counts only when its old name exists at that point and its new name does not; only then is the new name citable and the old one exempt.
- **BL-82:** a requirement the same delta modifies and also removes, or renames away from, is neither citable nor exempt, and neither is the other side of that pair.
- **BL-84:** a name in both ADDED and MODIFIED, an ADDED name equal to a rename's new name, a rename's old name that a REMOVED name folds to, a repeated old or new name in RENAMED, and a repeated name inside ADDED, MODIFIED or REMOVED make nothing they name citable or exempt, as archive refuses them.

## Members

| Id    | Title                                                                       | Lane                                                             |
| ----- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| BL-80 | The gate folds spaces inside a requirement name that GitHub keeps           | B — gate edit approved (Oleg, 2026-10-17)                        |
| BL-81 | A rename's new name is citable even when archive would refuse the rename    | B — gate edit and six existing tests approved (Oleg, 2026-10-17) |
| BL-83 | A rename archive refuses for an existing target still exempts its old name  | B — gate edit approved (Oleg, 2026-10-17)                        |
| BL-82 | A MODIFIED requirement under a renamed-away or removed name still resolves  | B — gate edit approved (Oleg, 2026-10-17)                        |
| BL-84 | The gate accepts delta names archive's pre-validate refuses across sections | B — gate edit and inclusion approved (Oleg, 2026-10-17)          |

Selection: no argument, pass 1. BL-80, BL-81 and BL-82 were the only `open` items in `docs/backlog.md`. Every other item is `gated` (BL-13, BL-39, BL-50 on more labeled people; BL-54 on Oleg's paid phone run; BL-61 on a Light Spring canvas board) or `deferred` with a trigger that has not fired (BL-49, BL-51, BL-68, BL-18, BL-19, BL-02, BL-04, BL-27, BL-28, BL-32, BL-33, BL-34). The investigators of BL-81 and BL-82 found BL-83 and BL-84; triage logged them and Oleg chose to fold both in.

## Parked

_None._ No investigated item is lane D. Triage also logged BL-85 (`slugify` drops combining marks GitHub keeps) as `deferred` — no spec heading holds one, so it is not a member.

## Base branch

`origin/main` at `a3ecf55` (`backlog-10` merged). It carries BL-80, BL-81, BL-82 and `_Next id:_ BL-83`. Triage logged BL-83, BL-84 and BL-85 and bumped the counter to BL-86.

## Approved test edits

All in `scripts/__tests__/spec-citations.test.ts`:

- **All members** (design.md Decision 1): helper code (`parseRequirements`, `deltaAnchors`, `deltaProof` and new file-local helpers) and new rule `it`s. No assertion changes.
- **BL-81** (design.md Decision 2): six existing `it`s, named there. Five add the rename's old name to their main-spec fixture; one assertion flips from `["requirement-shared"]` to `[]`.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `spec-workflow`: the citation gate anchors requirement and scenario headings as GitHub renders them, and counts a delta's renames, modifications, removals and additions only where OpenSpec's archive would accept them.

## Impact

- `scripts/__tests__/spec-citations.test.ts` only (approved). No app, package, route or CI file changes.
- `openspec/specs/spec-workflow/spec.md` through the delta.
- `docs/backlog.md`: BL-80, BL-81, BL-82, BL-83 and BL-84 are deleted when they ship. Triage logged BL-83, BL-84 and BL-85.
