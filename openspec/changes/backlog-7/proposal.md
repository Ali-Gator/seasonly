## Why

The citation gate still has three holes around open changes and the unenforced flag: a rename to a name with a backtick slugs wrong (BL-66), a change that marks a requirement unenforced must keep citing it until archive (BL-67), and prose that only names the flag marks a requirement unenforced (BL-69, found in this triage). Two small cleanups ride along: the season page hand-builds a photo slot only to lazy-load it (BL-26), and `view.test.tsx` writes its footer helper twice (BL-64).

## What Changes

- **BL-69:** the gate counts a requirement unenforced only when a line of its body starts with the flag, not when prose mentions it.
- **BL-66:** a RENAMED `TO:` name is read to the end of its line, as `FROM:` already is, so a new name with a backtick slugs right.
- **BL-67:** a requirement an open change modifies and marks unenforced no longer needs a citing test before archive.
- **BL-26:** the ported `Slot` takes an optional `loading` passed to its `img`, is exported from `@/components/ds`, and the season page's famous photos use it.
- **BL-64:** one file-scope `footer()` helper in `view.test.tsx`; both footer tests call it, assertions unchanged.

## Members

| Id    | Title                                                               | Lane                                           |
| ----- | ------------------------------------------------------------------- | ---------------------------------------------- |
| BL-69 | Prose that names the unenforced flag marks a requirement unenforced | B — test-file edit approved (Oleg, 2026-10-15) |
| BL-66 | A RENAMED `TO:` name with a backtick slugs wrong                    | B — test-file edit approved (Oleg, 2026-10-15) |
| BL-67 | A change that marks a requirement unenforced still has to cite it   | B — test-file edit approved (Oleg, 2026-10-15) |
| BL-26 | The famous photos bypass `Slot`                                     | A — listed port difference (design.md)         |
| BL-64 | `view.test.tsx` writes its footer helper twice                      | B — two-test edit approved (Oleg, 2026-10-15)  |

Selection: no argument, pass 1. BL-66, BL-67, BL-26 and BL-64 were the only `open` items; every gated and deferred item was skipped because pass 1 was not empty. BL-69 was found by the BL-67 investigator, logged, and joins as the fifth fix (same file, same approval). BL-70 (the season reveal hand-builds its own photo slot, found by the BL-26 investigator) was logged `open` and waits: the batch is at its ceiling of five, and it belongs to `season-reveal`.

## Parked

_None._ No member landed in lane D.

## Base branch

`origin/main` at `e440268`; it carries every member's bullet. Triage added BL-69 and BL-70 and set `_Next id:_` to BL-71. At fix time `main` had taken BL-68 (t19), so triage's two ids were renumbered BL-69 and BL-70 and the counter set to BL-71.

## Approved test edits

- `scripts/__tests__/spec-citations.test.ts` — gate helper code only: the flag match in `parseRequirements` (BL-69), the `TO:` regex in `deltaAnchors` (BL-66), the MODIFIED branch of `deltaProof` and two comments (BL-67); one new rule test each. No existing `it` or fixture changes (design.md Decisions 1–3, Oleg, 2026-10-15).
- `apps/web/src/lib/report/view.test.tsx` — "has no photo line in a quiz-only footer" and "names Google's copy in a photo report's footer" call a file-scope `footer()` helper; assertions unchanged (design.md Decision 4, Oleg, 2026-10-15).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `spec-workflow`: the citation gate reads only line-start unenforced flags, reads a rename's new name to the end of its line, and honors an open change that marks a requirement unenforced.
- `ui-components`: a photo slot is a public component that can lazy-load its image.

## Impact

- `scripts/__tests__/spec-citations.test.ts` (BL-69, BL-66, BL-67; approved).
- `apps/web/src/components/ds/slot.tsx`, `apps/web/src/components/ds/index.ts`, a new `apps/web/src/components/ds/slot.test.tsx`, `apps/web/src/app/(site)/seasons/[season]/page.tsx`; `openspec/specs/ui-components/spec.md` Public Interface and Behavior prose by hand (BL-26).
- `apps/web/src/lib/report/view.test.tsx` (BL-64; approved).
- `docs/backlog.md`: BL-69, BL-66, BL-67, BL-26, BL-64 deleted when they ship.
