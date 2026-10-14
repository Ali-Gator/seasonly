## Why

Five backlog items can ship before the 2026-10-26 launch, and three can close. The local phase gate (`pnpm test`) never reads green on a Mac: one E2E case fails on every dev-mode run because Next's dev server overwrites the report-500 page's `Cache-Control` (BL-12), the wrong-case season path answers 200 from macOS's case-insensitive disk (BL-31), and four workers on one `next dev` server time out flow tests on a loaded machine (BL-59). Every vision call logs an AI SDK deprecation warning for its image part (BL-16), and the photo check's result type lets a stand-in check pass with no traits, so the eval records a pass with no season instead of failing (BL-60).

## What Changes

- **BL-16:** the vision call sends the face crop as a `file` part with `mediaType: "image/jpeg"`, so the AI SDK logs no deprecation warning.
- **BL-60:** `PhotoCheck` becomes a union: a pass (`problem: null`) requires `traits`, a rejection forbids them. The `?? null` fallbacks in `checkImage` and the eval's `analyze` go.
- **BL-12:** the report-500 E2E case checks its `Cache-Control` only against the production build (CI); locally it still checks the 500, the heading and Reload.
- **BL-31:** the `/seasons/Soft-Autumn` 404 case is skipped on macOS only; Linux CI keeps enforcing it.
- **BL-59:** local E2E runs on at most 2 workers; CI is unchanged.
- **Retire:** BL-22 (answered: no early fetch, the visitor got a silent full page load), BL-47 (duplicate of BL-12), BL-21 (covered by BL-12 + BL-31).

## Members

| Id    | Title                                                      | Lane                                                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| BL-16 | The vision call uses a deprecated AI SDK image part        | A                                                             |
| BL-60 | A passing check's traits are optional in the type          | B — strict union, one fixture line edited (Oleg, 2026-10-14)  |
| BL-12 | One report-delivery E2E case fails under `pnpm dev`        | B — guard the header line to prebuilt mode (Oleg, 2026-10-14) |
| BL-31 | `/seasons/Soft-Autumn` answers 200 in a full local E2E run | B — skip that one case on darwin (Oleg, 2026-10-14)           |
| BL-59 | Local E2E times out on a loaded Mac                        | A                                                             |
| BL-22 | A report page's RSC request answered 503 once              | retire — questions answered, no app cause (design.md)         |
| BL-47 | One E2E test fails in the local phase gate                 | retire — duplicate of BL-12                                   |
| BL-21 | Two e2e cases fail on a Mac                                | retire — BL-12 + BL-31                                        |

Selection: no argument, pass 1 (open items, importance then ease). Investigated BL-22, BL-53, BL-16, BL-60, BL-12/BL-47/BL-21/BL-31 (one investigator, one cluster) and BL-59.

## Parked

- **BL-53** The draping preview shows the photo's own background — lane D by Oleg's answer (own change later, 2026-10-14). It needs a privacy sign-off, a mask source (the bullet's hair segmenter is hair-vs-rest and cannot separate face from wall), an alpha crop format, canvas boards 10/18 redrawn, existing test edits in four files and an approved paid `eval:vision` run. Status set to `gated — its own change: …`.

## Base branch

`origin/main` at `0c1d4d9` (backlog-4 merged); it carries every member's bullet and `_Next id:_ BL-65`.

## Approved test edits

- `evals/pipeline.test.ts:123` — the `dark` stand-in check drops the traits it spreads from a passing check (design.md Decision 2, Oleg, 2026-10-14).
- `e2e/report-delivery.spec.ts:111` — the `Cache-Control` assertion in "answers a report it cannot read with 500 and the reload page" runs only when `process.env.CI` is set (design.md Decision 3, Oleg, 2026-10-14).
- `e2e/site-structure.spec.ts:66-73` — the `not found` loop skips the `/seasons/Soft-Autumn` case when `process.platform === "darwin"` (design.md Decision 4, Oleg, 2026-10-14).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `report-text`: the face crop is sent as a `file` part, and the call logs no deprecation warning.
- `photo-check`: the result type makes a traitless pass and a traited rejection unrepresentable.

## Impact

- `apps/web/src/lib/report-text/index.ts` (the content part), `report-text.test.ts` (new `it`).
- `packages/analysis/src/photo-check/index.ts` (the type, the `result` helper), `photo-check.test.ts` (new type-level `it`); `apps/web/src/lib/capture/photo.ts`, `evals/pipeline.ts` (dead `?? null`); `evals/pipeline.test.ts` (approved fixture line).
- `openspec/specs/photo-check/spec.md` Public Interface (the `PhotoCheck` block).
- `e2e/report-delivery.spec.ts`, `e2e/site-structure.spec.ts` (approved guards); `playwright.config.ts` (local `workers`).
- `docs/backlog.md`: BL-16, BL-60, BL-12, BL-31, BL-59, BL-22, BL-47, BL-21 deleted.
