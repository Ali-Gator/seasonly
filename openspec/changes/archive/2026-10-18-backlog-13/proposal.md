## Why

The citation gate still fails open in two corners archive treats differently. A rename round trip in one delta (A to B, then B back to A) leaves A in place, but the gate counts A as renamed away, so `Requirement: A` needs no citing test until archive (BL-93). A removed name that matches a held name only once letter case and spacing are folded (a rename's new name `B` against a removal of `b`, or a modified `Foo` against a removal of `foo`) makes archive abort the whole change, but the gate keeps the names involved citable and the old name exempt (BL-91). Underneath, the citation side and the proof side each build the open changes' `OpenDelta` map with their own copy of one loop (BL-94). Separately, the e2e test for starting on the camera counts the `/analyze` page view by path only, so it cannot tell whether that page view was captured on the camera entry's address before the `start` parameter was stripped (BL-96).

## What Changes

- **BL-94:** `openChanges` takes a trailing optional `deltas` (default `openDeltas()`), and `resolvableAnchors` builds its `OpenDelta` map by calling it. The gate's output does not change.
- **BL-93:** a rename's old name joins `gone` only when the delta's rename walk no longer holds it at the end, so a round trip, or a rename onto a name the same delta frees, leaves the old name needing a citing test.
- **BL-91:** a removed name that is not held exactly at its turn, but folds onto a name held at that point (archive's near-miss abort), makes nothing it or that held name names citable or exempt; the renames are walked again without a rename the drop names. Removals are taken in order against a running set, as archive takes them.
- **BL-96:** the camera-start e2e test also asserts that the one `/analyze` page view's `$current_url` ends in `/analyze?start=camera`.

## Members

| Id    | Title                                                          | Lane                                                                  |
| ----- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| BL-94 | `resolvableAnchors` repeats `openChanges`' per-capability loop | B — gate helper edit approved (Oleg, 2026-10-18)                      |
| BL-93 | A rename round trip in one delta exempts the name it ends on   | B — gate helper edit approved (Oleg, 2026-10-18)                      |
| BL-91 | A removal that folds onto a rename's new name aborts archive   | B — gate helper edit approved (Oleg, 2026-10-18)                      |
| BL-96 | The camera pageview test cannot see a second strip             | B — one assertion in an existing e2e test approved (Oleg, 2026-10-18) |

Selection: no argument, pass 1. BL-91, BL-93, BL-94 and BL-96 were the only `open` items in `docs/backlog.md`. Every other item is `gated` (BL-13, BL-39, BL-50 on more labeled people; BL-61 on a Light Spring canvas board) or `deferred` on a trigger that has not fired (BL-49, BL-51, BL-68, BL-18, BL-19, BL-02, BL-95, BL-92, BL-85, BL-54, BL-04, BL-27, BL-28, BL-32, BL-33, BL-34), so pass 2 did not run.

## Parked

_None._ No investigated item is lane D. Triage logged one new item, not a member: BL-97 (a rename onto a name the same delta frees keeps the old block's scenarios as proof; `open`, found by the BL-93 investigator and not investigated).

## Base branch

`origin/main` at `77c8b8d` (`t20-camera-from-home` merged). It carries BL-91 to BL-96 and `_Next id:_ BL-97`. Triage logged BL-97 and bumped the counter to BL-98.

## Approved test edits

- **BL-94, BL-93, BL-91** (design.md Decisions 1–3): helper code in `scripts/__tests__/spec-citations.test.ts` and new rule `it`s. No existing `it`'s assertion, fixture or call changes.
- **BL-96** (design.md Decision 4): one assertion added inside `e2e/funnel.spec.ts`'s "sends one /analyze page view when the landing opens the camera". No existing assertion changes.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `spec-workflow`: "Citations are gated at every commit" — a rename's old name is exempt only when the delta no longer holds it, and a removal archive aborts on as a near-miss makes nothing it touches citable or exempt.
- `analytics`: "Each funnel step fires one event" — the camera start's one `/analyze` page view carries the `start` parameter in its URL.

## Impact

- `scripts/__tests__/spec-citations.test.ts` and `e2e/funnel.spec.ts` only (approved). No app, package, route or CI file changes.
- `openspec/specs/spec-workflow/spec.md` and `openspec/specs/analytics/spec.md` through the deltas.
- `docs/backlog.md`: BL-91, BL-93, BL-94 and BL-96 are deleted when they ship. Triage logged BL-97.
