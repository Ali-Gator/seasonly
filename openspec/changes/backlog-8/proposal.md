## Why

The `backlog-7` review left two gaps in the citation gate and triage left one cleanup. The gate reads a rename only in one spelling, so a valid rename written without backticks or with extra spaces blocks its own change (BL-71). Nothing pins that a delta which only mentions the unenforced flag exempts nothing, so a regression there would fail open (BL-72). And the analyzing step still hand-builds the photo slot the design system's `Slot` now covers (BL-70).

## What Changes

- **BL-71:** both rename readers in the gate use OpenSpec's archive pattern: start of line, optional `-`/`*`/`+` bullet, optional backticks, flexible spaces, the bare name captured. A line that is not a rename line (`INTO: …`, a mid-sentence `TO:`) no longer counts.
- **BL-72:** one new rule test: a MODIFIED delta whose body only mentions the flag mid-sentence leaves its uncited requirement reported.
- **BL-70:** the analyzing step renders its face crop through `Slot`; the rendered HTML is unchanged.

## Members

| Id    | Title                                                                             | Lane                                           |
| ----- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| BL-71 | The gate's rename readers accept only one `FROM:`/`TO:` spelling                  | B — test-file edit approved (Oleg, 2026-10-15) |
| BL-72 | No test pins that a delta naming the unenforced flag mid-sentence exempts nothing | B — test-file edit approved (Oleg, 2026-10-15) |
| BL-70 | The season reveal builds its own photo slot                                       | A                                              |

Selection: no argument, pass 1. BL-71, BL-72 and BL-70 were the only `open` items, exactly the floor of three, so the first section of pass 2 (Analysis) was investigated alongside as a buffer: BL-49 and BL-51 by investigators; BL-13, BL-39 and BL-50 share one gate (more labeled people, or quiz answers), checked directly — `evals/manifest.json` holds 34 people, unchanged since 2026-10-13, with no quiz answers — so they were not taken. All three pass-1 items are fixable; the buffer was not needed.

## Parked

- **BL-49** Gate the eval on the CI run — deferred: 0 of 4 clean weekly runs (the one manual run, 2026-10-13, failed its fetch before the BL-52 retry fix); first scheduled run 2026-10-19. The analysis-eval spec's cross-machine drift also needs a number before it can close. Status line updated.
- **BL-51** A squint can pass the light checks unmeasured — deferred: 3 of about 50 production `photo_checked` events reach the eye-white step, 0 null (PostHog, 2026-10-15). Status line updated.

## Base branch

`origin/main` at `feb21ea` (backlog-7 merged); it carries every member's bullet and `_Next id:_ BL-73`.

## Approved test edits

- `scripts/__tests__/spec-citations.test.ts` — gate helper code only: the `TO:` reader in `deltaAnchors` and the `FROM:` reader in `deltaProof` (BL-71), one new rule test each for BL-71 and BL-72. No existing `it` or fixture changes (design.md Decisions 1–2, Oleg, 2026-10-15).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `spec-workflow`: the citation gate reads a rename in every spelling OpenSpec's archive accepts.

## Impact

- `scripts/__tests__/spec-citations.test.ts` (BL-71, BL-72; approved).
- `apps/web/src/app/(flow)/analyze/_reveal/steps.tsx` (BL-70).
- `docs/backlog.md`: BL-71, BL-72, BL-70 deleted when they ship; BL-49 and BL-51 status lines corrected in triage.
