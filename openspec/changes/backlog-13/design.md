## Context

See proposal.md for why. Triage ran on `origin/main` at `77c8b8d`. Four read-only Plan investigators ran in parallel, one per member; the BL-91 and BL-93 investigators probed OpenSpec in throwaway copies outside the repo. The reference parser is `@fission-ai/openspec` 1.13.0, the global CLI at `/usr/local/lib/node_modules/@fission-ai/openspec` (pinned in CI at `.github/workflows/openspec.yml:26`): `dist/core/specs-apply.js` (pre-validate :140-174, renames :268-308, removals :310-330). No canvas design is involved.

| Id    | Lane | Why                                                                         |
| ----- | ---- | --------------------------------------------------------------------------- |
| BL-94 | B    | The gate's helpers live in an existing test file (Decision 1). No new `it`. |
| BL-93 | B    | Same file (Decision 2). New `it` only.                                      |
| BL-91 | B    | Same file (Decision 3). New `it`s only.                                     |
| BL-96 | B    | One assertion added inside an existing e2e test (Decision 4).               |

## Goals / Non-Goals

**Goals:** the gate exempts a rename's old name only when archive will no longer hold it, and refuses what archive's REMOVED step aborts on; one loop builds the open changes' `OpenDelta` map; the camera-start e2e test ties its one `/analyze` page view to the camera entry's address.

**Non-Goals:**

- No whole-change refusal for a near-miss abort. Archive refuses the whole change when any spec file throws; the gate keeps dropping only the names the abort involves (`backlog-11` Decision 4).
- No fix for BL-97 (a rename onto a freed name keeps the old block's scenarios as proof): logged, not investigated.
- No change to `deltaAnchors(text, existing)` or `deltaProof(text, into, existing)` signatures, and no extraction of the helpers to a module. `openChanges` gains only a trailing optional parameter.
- No app code change for BL-96: `flow.tsx` and `posthog.ts` stay as they are.

## Members

Line numbers are at `77c8b8d`, a hint only; find helpers and `it`s by name or title. Order is fixed: BL-94, BL-93, BL-91, then BL-96. BL-94 comes first so the existing suite proves it changes no behavior, and BL-93 and BL-91 then land on one shared loop. If any existing `it`'s assertion, fixture or call turns out to need an edit, stop and ask Oleg; do not make it.

Write every fixture's heading, rename and removal lines inside template strings in the test file, as the existing ones are. Never put such a line at the start of a line in a real delta under `openspec/changes/`.

### BL-94 — one loop builds the `OpenDelta` map

`resolvableAnchors` (:515-542) builds its map at :519-521 with the same per-capability `deltaProof(text, map.get(cap), names)` loop `openChanges` (:544-551) runs at :546-548; only the input differs (`deltas` against `openDeltas()`). Give `openChanges` a trailing `deltas = openDeltas()`, loop over it, and have `resolvableAnchors` take its `open` map from `openChanges(specs, deltas)`. Keep the `names` helper at :519, which `deltaAnchors` still uses at :536. The one `openChanges()` call (:567) and every `resolvableAnchors` call stay as they are; the fixture `it`s that feed two deltas for one capability (:1478, :1494-1497) already guard the accumulation.

**Bullet correction:** BL-93's fix sits inside `deltaProof`, which both loops already call, and `resolvableAnchors` never reads `gone`, so BL-93 needs no mirroring by hand. What could drift is the loop itself: where the names come from and how results accumulate.

### BL-93 — `gone` holds only names the walk let go

`deltaProof` (:348-384) takes the accepted pairs from `appliedRenames` (:360) and adds every accepted FROM to `gone` (:372). For A to B then B to A, `conflicts` drops nothing (no FROM or TO repeats), the walk accepts both and ends holding A, and `gone` gets both A and B, so `unprovenRequirements` (:427) skips `Requirement: A`. A real 1.13.0 archive of that delta reports "2 renamed" and leaves A with its original block. The A to B plus C to A variant also archives, leaving A holding C's block, and is exempt the same way.

Take `held` from `appliedRenames` as well, and add an accepted FROM to `gone` only when `held` no longer has it. Update the `OpenDelta.gone` comment (:322-323) and the `deltaProof` JSDoc (:340-347). `appliedRenames`, `conflicts` and `deltaAnchors` do not change. No existing fixture flips: the chains at :1110 and :1278 end on C, :1292 ends on B and then removes it, :1126's pair is refused, the repeats in :1176 are dropped by `conflicts`, and in :1311 X is not held after the walk.

### BL-91 — a near-miss removal makes nothing citable or exempt

Archive's REMOVED step (`specs-apply.js:310-330`) takes removals in order against the running map left by the renames: an exact name is deleted; a name not held exactly whose folded form (letter case and interior spacing) matches a held key throws, aborting the archive; any other is warned about and skipped. Pre-validate folds a REMOVED name only against a rename's FROM (:174), so `openspec validate` reports the abort only as an INFO "Archive would refuse this delta" line. The gate models only pre-validate in `conflicts` (:224-250), so with permanent names {A, Foo}, A to B plus REMOVED `b` leaves `requirement-b` citable and A in `gone`; MODIFIED `Foo` plus REMOVED `foo` leaves `requirement-foo` and the block's new scenarios citable.

After the rename walk, take the removals in document order against a running copy of `held`: delete an exact match; on a near-miss, add the removed name and the held name it folds onto to the dropped set. Then, as `conflicts`' drops do today, run the rename walk again with every pair whose TO or FROM is dropped left out (so the dropped rename's FROM stays held and needs a citing test), and repeat until the dropped set stops growing. Apply the result in both `deltaAnchors` (:293-318, `const dropped = conflicts(plan)` at :295) and `deltaProof` (:359): no dropped name is citable, has its modified or added block resolve, or joins `gone`. Factor the step into one helper both call, next to `conflicts`, with JSDoc citing `specs-apply.js:318-324`. Fold with the `fold` local to `conflicts` (:239), lifted to file scope so both use one.

**Bullet correction:** the gap is wider than a rename's new name. It fails open on the proof side too (A is exempt), and the same throw fires for any held name, such as a requirement the delta modifies (MODIFIED `Foo` plus REMOVED `foo`). Both shapes ship here (Decision 5).

### BL-96 — the camera page view carries the camera address

`e2e/funnel.spec.ts`'s "sends one /analyze page view when the landing opens the camera" (:246-258) checks the named page-view list by `$pathname` and `toHaveURL(/\/analyze$/)`. `defaults: "2025-05-24"` (`posthog.ts:17`) means `capture_pageview: 'history_change'`, which compares pathnames only, so a same-path `replaceState` never sends a page view; the exact list already catches a second `/analyze` page view, and `toHaveURL` already catches a missing strip.

What it cannot see is whether the counted page view was captured on `?start=camera`. The ordering is deterministic: Next's `HistoryUpdater` pushes `/analyze?start=camera` in `useInsertionEffect`; `flow.tsx:107-112` strips in `useLayoutEffect`, after it; posthog-js defers the push's page view to a microtask, but its patched `replaceState` flushes a pending page view before running, so `$current_url` (read from `location.href`, `start` not masked) still holds the parameter. Add, after the poll, that the `/analyze` page view's `properties.$current_url` ends in `/analyze?start=camera` (as `:127` already checks `$current_url`), matched by suffix, not by the full `localhost:3100` URL. If a posthog-js update drops the flush, the test fails because the analytics really changed.

**Bullet correction:** "or none" is already caught by `toHaveURL(/\/analyze$/)`.

## Decisions

### 1. BL-94 — approve the shared loop in the gate's helpers

`openChanges` gains a trailing optional `deltas`; `resolvableAnchors` calls it. No `it`'s assertion, fixture or call changes, and no new `it` (the existing suite is the proof).

- **a. Approve.** One loop; the citation and proof sides cannot drift. Lands first, as `backlog-12`'s BL-90 refactor did.
- **b. Not now:** stays in the backlog. Low value on its own, per the bullet correction.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-18)

### 2. BL-93 — approve the `gone` fix and its rule test

Helper code in `deltaProof` and its doc comments, one new rule `it` covering the round trip and the C to A variant, and one new scenario in the delta. No existing `it` changes.

- **a. Approve.** Closes a fail-open gap confirmed against a real archive.
- **b. Not now:** stays in the backlog; no open change hits it today.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-18)

### 3. BL-91 — approve the near-miss drop and its rule tests

Helper code (a post-walk near-miss step next to `conflicts`, its use in `deltaAnchors` and `deltaProof`, JSDoc), new rule `it`s for both shapes, and one new scenario in the delta. No existing `it` changes.

- **a. Approve.** Closes the fail-open on the citation and proof sides, for both shapes.
- **b. Not now:** stays in the backlog; archive aborts, so the gap surfaces at the archive commit, late.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-18)

### 4. BL-96 — approve one assertion inside an existing e2e test

In `e2e/funnel.spec.ts`, "sends one /analyze page view when the landing opens the camera" gains one assertion: the `/analyze` page view's `$current_url` ends in `/analyze?start=camera`. No existing assertion changes. The analytics delta adds the matching THEN clause to "Starting on the camera"; its heading is unchanged, so the test's citation stays valid.

- **a. Approve.** Proves the page view is captured on the camera entry's address, before the strip.
- **b. Not now:** stays in the backlog; the exact list already catches a second page view.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-18)

### 5. BL-91 covers every held name and models archive's removal order

A technical call, made in triage under CLAUDE.md ("Decide technical choices yourself"); recorded, not asked. Archive's near-miss check runs against every held key, not only a rename's new name, so the gate drops a near-miss against a modified or plain permanent name too. Removals are taken in document order against a running set, because archive deletes an exact match before the next removal is checked: REMOVED `B` then REMOVED `b` removes B and only warns on `b`, and checking against the set after renames alone would over-drop it. Read from 1.13.0, the CI pin.

## Risks / Trade-offs

- The real-repo `it`s read the live `openspec/changes/`; while this change is open, its own spec-workflow delta is read by the gate it changes. The delta carries every permanent scenario heading of "Citations are gated at every commit" word for word, and its fixture-like names sit inside backticks, never at a line start; the suite ran green with the deltas in place (48/48).
- The analytics delta replaces "Each funnel step fires one event" wholesale at archive; it carries all four permanent scenario headings unchanged.
- BL-96 pins a posthog-js behavior (flush before `replaceState`). A dependency update that drops it fails the test, which is the intended signal.
