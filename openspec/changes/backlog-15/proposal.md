## Why

Swatch names break on the most common phones. From 375 to about 403 px a 4-column grid's cell is too narrow for "Watermelon" or "Champagne", so the name runs into the gap or off the grid. "Light Warm Aqua" and "Light Warm Navy" take a third line, which pushes their hex codes below the rest of the row (BL-61). Reports cannot say how often the face is left uncut either: `outline()` returns null silently on every failure (BL-68).

The citation gate still fails open in one rename corner. Archive aborts on a rename whose old and new names are both missing at its turn, but the gate only refuses that pair. So a held name that folds onto the old name, or a later rename onto it, stays citable (BL-103). Two smaller gate gaps sit in the same file: `slugify` drops combining marks that GitHub keeps (BL-85), and requirement headings are read from the whole spec instead of only `## Requirements` (BL-92).

## What Changes

- **BL-61:** a 4-column swatch grid switches to 3 columns whenever a cell would be narrower than 76 px, which means a window under about 404 px. The rule follows the grid's own width, not the viewport, so the canvas and the app agree. Approved on canvas v64, board 16b.
- **BL-68:** for a photo that passes, `photo_checked` carries how the outline ended (`made`, `late`, `failed`, `mismatch` or `missed`) and, when one was made, how long it took. Tuning the 3 s wait is split out as BL-104, deferred until the data exists.
- **BL-103:** a rename whose old and new names are both unheld at its turn drops its old name, its new name and any held name folding onto the old name, the same way an aborting rename already does.
- **BL-85:** `slugify` keeps combining marks (`\p{M}`) and connector punctuation (`\p{Pc}`), as github-slugger does.
- **BL-92:** permanent requirements and scenarios are read only from the `## Requirements` section.

## Members

| Id     | Title                                                                         | Lane                                                                                         |
| ------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| BL-61  | "Watermelon" still runs into the gap at 375–399 px                            | C — canvas v64 board 16b approved; B — option 1 and the e2e flip approved (Oleg, 2026-10-19) |
| BL-68  | Outline misses on the phone go uncounted                                      | A — instrumentation half; the tuning half became BL-104 (D)                                  |
| BL-103 | A rename archive aborts on as "source not found" leaves a folded name citable | B — gate helper edit approved (Oleg, 2026-10-19)                                             |
| BL-85  | `slugify` drops combining marks that GitHub keeps                             | B — fix ahead of trigger approved (Oleg, 2026-10-19)                                         |
| BL-92  | The gate reads requirement headings outside `## Requirements`                 | B — fix ahead of trigger approved (Oleg, 2026-10-19)                                         |

Selection: no argument. Pass 1 found only BL-103 open, under the floor of 3, so the pass-2 sweep of gated and deferred items ran alongside it. Eleven items were investigated (BL-49 by direct check). Six turned out fixable today. The ceiling of 5 left out BL-95 (Next's router keeps `?start=camera`): it is lane A, but it fixes nothing today and leans on Next's private `__NA` history state. It stays `deferred`, untouched, as the next batch's first candidate.

Not investigated, with the reason:

- BL-13, BL-39, BL-50, BL-102: `evals/manifest.json` has not changed since 2026-10-13 (180 photos), and each one waits for more labeled photos.
- BL-18, BL-19: Oleg deferred them to paid promotion.
- BL-27 (December 11), BL-28, BL-32, BL-34, BL-54: their external triggers are plainly unmet.

## Parked

Statuses corrected in `docs/backlog.md`:

- **BL-49** (gate the eval on the CI run) is waiting for 4 clean weekly runs. 1 of 4 so far: the scheduled run `39233860137` on 2026-10-19, whose metric match was not checked.
- **BL-51** (squint passes unmeasured) is waiting for about 50 production `photo_checked` events. 9 so far, 0 with a null eye white.
- **BL-02** (hung crop upload) is waiting for Sentry events or a storage-js `upload()` signal. There are none in 90 days, and 2.118.0 and 3.0.0-next.29 still have no signal. The trigger now names the real Sentry title.
- **BL-33** (rate-limit `/api/mcp`) is waiting for signs of abuse. Sentry traces show about 15 calls in 14 days, and there is no firewall config.
- **BL-04** (ShareCard bundle drift) is waiting for a DOM card preview. The post-card sizes are already in the canvas `bundle.css`; only the story rows are left.
- **BL-104** (new, split from BL-68) is waiting for about 50 production passes that carry the outline outcome.

## Base branch

`origin/main` at `6946c76` (`backlog-14` merged). It carries BL-103 and `_Next id:_ BL-104`. Triage logged BL-104 and moved the counter to BL-105.

## Approved test edits

- **BL-61** (design.md Decision 4): `e2e/site-structure.spec.ts` "a 4-column grid keeps 4 columns at 375 px" flips to 3 columns at 375 px. A 4-column check moves to 414 px.
- **BL-103, BL-85, BL-92** (design.md Decisions 1–2): helper code and JSDoc in `scripts/__tests__/spec-citations.test.ts`, plus new rule `it`s. No existing `it`'s assertion, fixture or call changes.
- **BL-68:** new `it`s only. No existing test changes.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `ui-components`: "A swatch grid shows every color of a list in order". The narrow rule follows grid width (cells under 76 px), not a viewport under 375 px.
- `capture-flow`: "Each photo check is reported without photo data". A passing photo's event carries the outline outcome and time.
- `spec-workflow`: "Citations are gated at every commit". A rename with neither name held aborts like the others, slugs keep combining marks, and permanent names are read from `## Requirements` only.

## Impact

- **App:** `apps/web/src/components/ds/ds.css` and `swatch.tsx` (doc), `apps/web/src/lib/capture/photo.ts` and `events.ts`, and their tests. `e2e/site-structure.spec.ts` (approved flip, plus a new check).
- **Gate:** `scripts/__tests__/spec-citations.test.ts` (approved).
- **Specs:** `openspec/specs/ui-components/spec.md`, `capture-flow/spec.md` and `spec-workflow/spec.md`, through the deltas. Their Behavior and Public Interface text is edited by hand.
- **Off repo:** MVP canvas v64, where the canvas's design-system copy of `bundle.js` takes the same rule. The design-system artifact itself is not synced.
- **Backlog:** `docs/backlog.md` deletes BL-61, BL-68, BL-85, BL-92 and BL-103 when they ship. Triage split off BL-104 and corrected six statuses.
