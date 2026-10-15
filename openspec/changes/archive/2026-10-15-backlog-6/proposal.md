## Why

Five open backlog items can ship before the 2026-10-26 launch. The chat-plugin listing claims a tool call for case 5 that Claude does not make, so a Claude directory reviewer who runs it would see the listing fail (BL-35). The capture flow still guards a "pass with no photo" that the analysis core's union already rules out, and its reducer would turn one into a no-face retake (BL-65). The citation gate makes a change keep citing requirements it removes or renames until archive (BL-42). The swatch grid's inline column count forces `!important` rules that silently beat a future Tailwind override below 375 px (BL-63). And the E2E PostHog decoder exists twice, so a posthog-js body-format change has to be fixed in two places (BL-23).

## What Changes

- **BL-35:** positive case 5 splits per host. The Claude listing (`docs/chat-plugin-listing.md`) uses "Run the Seasonly quiz with all four answers as unsure.", which Claude was seen calling; the ChatGPT package (`docs/chat-plugin-openai/plugin.json`) keeps the original wording, which ChatGPT was seen calling. Docs only.
- **BL-65:** `CheckedPhoto` and the reducer's `checked` event become pass-or-rejection unions; `flow.tsx`'s `traits && crop` guard and the reducer's `|| !e.photo` / `?? "no-face"` fallback go. No runtime behavior changes.
- **BL-42:** the citation gate's proof check reads open changes: a requirement an unarchived change removes, or renames away from, is no longer required to be cited, and a modified requirement counts as proven when a test cites a scenario its delta adds.
- **BL-63:** `SwatchGrid` sets `--sn-cols` inline instead of `grid-template-columns`; `.sn-swatch-grid` reads it. The below-375 rule and the `lg:grid-cols-N!` overrides lose their `!important`. Layout is unchanged at every width.
- **BL-23:** `e2e/funnel.spec.ts` uses the shared recorder in `e2e/posthog.ts`, which now returns `{ events, bodies, errors }`, catches decode failures and keeps each event's timestamp.

## Members

| Id    | Title                                                           | Lane                                                                 |
| ----- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| BL-35 | Claude skips the tool for an all-unsure answer                  | B — split case 5 per host (Oleg, 2026-10-14)                         |
| BL-65 | A checked photo's pass shape is still loose one layer up        | A                                                                    |
| BL-42 | The citation gate ignores an open change's REMOVED requirements | B — test edit approved, widened scope (Oleg, 2026-10-14)             |
| BL-63 | The swatch grid's `!important` column rule beats Tailwind's `!` | B — test edit approved (Oleg, 2026-10-14)                            |
| BL-23 | Two copies of the E2E PostHog recorder                          | B — test edits approved, helper returns an object (Oleg, 2026-10-14) |

Selection: no argument, pass 1 (open items, importance then ease). Investigated BL-35, BL-65, BL-42, BL-63, BL-23, BL-64 and BL-26; all seven are fixable. BL-64 (`view.test.tsx` footer helper, lane B) and BL-26 (famous photos bypass `Slot`, lane B: spec exception or design-system change first) rank 6th and 7th and stay in the backlog untouched for the next batch (ceiling 5).

## Parked

_None._ No member landed in lane D.

## Base branch

`origin/main` at `0e824c5` (backlog-5 merged); it carries every member's bullet and `_Next id:_ BL-66`.

## Approved test edits

- `scripts/__tests__/spec-citations.test.ts` — `unprovenRequirements` takes the open changes, the real-repo proof call passes them, the header comment changes; existing rule-test assertions stay (design.md Decision 2, Oleg, 2026-10-14).
- `apps/web/src/components/ds/ds.test.tsx:68-78` — "lays out in the number of columns asked for" and "lays out in 4 columns by default" assert `--sn-cols` instead of the inline `grid-template-columns` (design.md Decision 3, Oleg, 2026-10-14).
- `e2e/funnel.spec.ts` — its local route, decode and recorder go; it wraps the shared helper (design.md Decision 4, Oleg, 2026-10-14).
- `e2e/sample-report.spec.ts:27` — destructures `events` and `errors` from the helper's new return and asserts `errors` is empty (design.md Decision 4, Oleg, 2026-10-14; the `errors` assertion 2026-10-15).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `capture-flow`: a passed check's type always carries its traits and crop.
- `spec-workflow`: the proof check honors an open change's removed, renamed and newly added scenarios.
- `ui-components`: a page's column utility on a swatch grid wins at every width without `!important`.

## Impact

- `docs/chat-plugin-listing.md`, `docs/chat-plugin-openai/plugin.json` (BL-35; if the Claude listing is already submitted, Oleg updates case 5 in the portal).
- `apps/web/src/lib/capture/photo.ts`, `apps/web/src/app/(flow)/analyze/flow.tsx`, `apps/web/src/app/(flow)/analyze/flow-state.ts`, a new type-level test (BL-65).
- `scripts/__tests__/spec-citations.test.ts` (BL-42, approved).
- `apps/web/src/components/ds/swatch.tsx`, `ds.css`, `ds.test.tsx` (approved); `apps/web/src/app/(site)/page.tsx`, `apps/web/src/lib/report/sections.tsx`, `apps/web/src/lib/site-content/season-link.tsx` (bangs dropped); `openspec/specs/ui-components/spec.md` Behavior note (BL-63).
- `e2e/posthog.ts`, `e2e/funnel.spec.ts`, `e2e/sample-report.spec.ts` (approved); `openspec/specs/analytics/spec.md` Behavior E2E bullet (BL-23).
- `docs/backlog.md`: BL-35, BL-65, BL-42, BL-63, BL-23 deleted.
