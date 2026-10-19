## Context

See proposal.md for why. Triage ran on `origin/main` at `6946c76`. Ten read-only Plan investigators ran in parallel, one per candidate; BL-49 was checked directly (`gh run list`). Prod evidence was read only: PostHog HogQL (BL-51, BL-68), Sentry issues, errors and traces (BL-02, BL-33), Vercel firewall config (BL-33). BL-61's widths were measured in the built-in browser on the live `seasonly.me/seasons/light-spring` page with the real Instrument Sans: "Watermelon" 74.9 px and "Champagne" 74.1 px at 13 px. The reference parser for the gate members is `@fission-ai/openspec` 1.13.0, the global CLI that CI pins (`.github/workflows/openspec.yml`): `dist/core/specs-apply.js`, RENAMED block :268-288, where "source not found" is thrown at :285.

| Id     | Lane   | Why                                                                                                                                            |
| ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| BL-61  | C + B  | Every fix changes approved 375 boards. The fix was chosen (Decision 4) and drawn on canvas v64, and it flips one existing e2e test (approved). |
| BL-68  | A      | Instrumentation is fixable now and stays inside capture-flow's privacy rule. Tuning the wait needs data, so it was split out as BL-104 (D).    |
| BL-103 | B      | Helper edit in the gate test file, which only Oleg can approve (Decision 1).                                                                   |
| BL-85  | B      | Same file. Oleg chose to fix it before its trigger fires (Decision 2).                                                                         |
| BL-92  | B      | Same file, same choice (Decision 2).                                                                                                           |
| BL-95  | A, out | Fixable, but left out by the ceiling of 5: lowest ease, it relies on Next's private `__NA` state, and it fixes nothing today. Untouched.       |
| BL-49  | D      | 1 of 4 clean weekly runs.                                                                                                                      |
| BL-51  | D      | 9 of about 50 production events, 0 null.                                                                                                       |
| BL-02  | D      | No Sentry events, and no `upload()` signal in storage-js 2.118.0 or 3.0.0-next.29.                                                             |
| BL-33  | D      | About 15 calls in 14 days, no abuse.                                                                                                           |
| BL-04  | D      | No DOM ShareCard is rendered.                                                                                                                  |

## Goals / Non-Goals

**Goals:**

- No swatch name overflows its cell or takes a third line on any phone width.
- `photo_checked` says how often a passing photo's outline is missed, and why.
- The gate refuses every rename shape that archive's RENAMED step throws on, anchors headings as GitHub does, and reads only the section archive reads.

**Non-Goals:**

- No change to swatch name size (13 px), word breaking (BL-38), the gap, or palette names.
- No change to the 3 s wait (BL-104), the outline's own logic, or Sentry reporting for outline misses (a miss is not a crash).
- No sync of the design-system artifact's `bundle.js`/`bundle.css` (the canvas copy is synced, as with t19).
- No `NFC` or `NFD` normalisation in `slugify`: github-slugger does none.
- No change to `parseRequirements` itself, or to the delta reader (it already parses per section).

## Members

Line numbers are at `6946c76` and are hints only: find helpers and `it`s by name or title. One editor runs at a time, in task order. If an existing `it`'s assertion, fixture or call turns out to need an edit beyond the approved ones, stop and ask Oleg; do not make it.

### BL-61 — 4-column grids take 3 below a 76 px cell

`ds.css:184-191` holds the only narrow rule today, `@media (max-width: 374.98px)` on `.sn-swatch-grid[data-columns="4"]`. Replace it with one rule that has no media query:

```css
.sn-swatch-grid[data-columns="4"] {
  grid-template-columns: repeat(
    auto-fill,
    minmax(max(76px, calc((100% - 3 * var(--space-3)) / 4)), 1fr)
  );
}
```

- The track minimum is at least a quarter of the content box, so `auto-fill` never makes more than 4 columns. Below a 76 px cell it fits 3, and 1fr stretches them.
- With the 16 px screen and grid padding, 4 columns start at a 404 px window.
- The rule stays in `@layer components`, so a page's column utility (a Tailwind utility layer) still wins without `!important`, as BL-63 requires.
- `keepColumns` still drops the `data-columns` marker, and the markup does not change, so the `ds.test.tsx` `^<ul …data-columns` regexes hold.
- Update the comment above the rule and `swatch.tsx`'s `keepColumns` doc ("below 375 px" becomes "while a cell would be under 76 px").
- The rule also catches the 1024–1043 px desktop edge, where the Light Spring metals grid in the 2fr column has a 72 px cell. That grid takes 3 columns there, which is accepted.

Measured on the live page (rule injected): 3 columns at 320, 375, 390, 393, 399 and 400 px, and 4 at 404, 414 and 440 px. At no width does any name overflow or take a third line. Without the rule, at 375 px: Watermelon, Light Warm Aqua and Light Warm Navy (palette) and Champagne (metals) all fail.

Tests, in `e2e/site-structure.spec.ts`:

- The approved flip: "a 4-column grid keeps 4 columns at 375 px" becomes 3 columns at 375 px on `/seasons/light-spring`. It also asserts that no `.sn-swatch__name` in the palette list has `scrollWidth > clientWidth` and none is taller than 36 px. Keep the test's citation of `#scenario-a-4-column-grid-at-375-px` and rename its title to match.
- A new test: 4 columns at 414 px.
- `e2e/design-review.spec.ts` (first chip fully in view at 375×812) must still pass. Run it; do not edit it.

**Permanent-spec text** (exempt from the hook, edit by hand): `ui-components/spec.md` Behavior bullet and the BL-57/BL-63 paragraph (:150-154). They describe the old below-375 rule, the canvas `bundle.css` "keeps 4" note, and the BL-61 leftover sentence.

**Bullet correction:** the bullet's palette indices are off by one (Watermelon is Light Spring best #7, not #6). It also missed the 3-line wraps of "Light Warm Aqua" and "Light Warm Navy" at 375 px, which break the "Hex codes line up" promise for that row. That scenario's own example (Soft Autumn "Plum Brown" beside "Copper") still shares a row at 3 columns, so its requirement is unchanged.

### BL-68 — `photo_checked` carries the outline outcome

`apps/web/src/lib/capture/photo.ts` `outline()` (:71-99) has four silent exits. Give each one a name:

| Exit                                                            | Outcome    |
| --------------------------------------------------------------- | ---------- |
| The 3 s race is lost                                            | `late`     |
| The confidence mask is missing or a different size              | `mismatch` |
| Mean confidence over the middle third is below 0.5              | `missed`   |
| The catch (segmenter failed to load, threw, or `toBlob` failed) | `failed`   |
| A mask was made                                                 | `made`     |

- `outline()` returns `{ mask, outcome, ms }`. `ms` is whole milliseconds from the start of `outline()` to the made mask, and is set only on `made`.
- The pass branch of `CheckedPhoto` (:13-27) gains `outline: OutlineOutcome` and `outlineMs?: number`. The rejection branch gets `outline?: never`.
- `photoCheckedProps` (`events.ts:11-33`) takes both as optional input. It emits `outline` and `outline_ms` only when they are present: a rejection, or a missing time, omits the key rather than sending `null`.
- The keys must not match `/pixel|landmark|image|crop|mask/`, which `capture.test.ts` asserts. With `toEqual`, the dark-photo test then needs no edit.
- `flow.tsx:141` already spreads `checked` and needs no edit. Keep the outcome off `PassedPhoto` and `FlowEvent`.
- Drop the `ponytail:` note at :73-74. It names exactly this gap; the wait stays fixed until BL-104.

Tests, all new `it`s:

- In `capture.test.ts`: a passing photo's props carry `outline` `late` with no `outline_ms`, and `made` with `outline_ms`. A rejected photo's props carry neither key.
- A new mocked-`loadPerson` test for `outline()`'s mapping of each exit, since `outline()` has no unit test today. It goes in a new `photo.test.ts` (jsdom or a canvas stub).

**Permanent-spec text** (by hand): `capture-flow/spec.md` Public Interface `CheckedPhoto` (:33-36) and the `photoCheckedProps` signature (:47-53), plus the Behavior bullet on the 3 s wait (:62).

**Bullet correction:** the old trigger, "until reports with an uncut face are seen", could never fire, because nothing recorded an uncut face. `analytics/spec.md:59` defers `photo_checked`'s properties to capture-flow, so analytics needs no delta. `/privacy` says only "count anonymous steps", and an outcome enum and a duration are neither pixels nor landmarks.

### BL-103 — a rename with neither name held drops its names

`spec-citations.test.ts` `appliedRenames` (:304-335, the filter at :320-328) treats a pair whose old and new names are both unheld at its turn as a harmless refusal. Archive throws on that pair (`specs-apply.js:285`, 1.13.0; the npx-cached 1.14.1 throws at :320).

The fix: at that pair's turn, add its old name, its new name, and every held name that folds onto the old name (letter case and spacing folded) to `aborted`. Key this on "neither held" alone, not on a fold match, because archive throws either way. `nearMisses` (:265-288) already drops chains ending at an aborted name and loops to a fixed point, so its code does not change.

Update the JSDoc on `nearMisses`, `appliedRenames` and `deltaProof` (:410-419) to list the third shape.

New rule `it`s cite `#scenario-a-rename-archive-aborts-on-with-neither-name-held`:

- (a) Permanent {Foo}; the delta renames `foo` to `Bar` and modifies `Foo` with a cited new scenario. The citation is stale and Foo is unproven.
- (b) Permanent {A}; the delta renames `Ghost` to `Fresh`, then `A` to `Ghost`. A citation of `Ghost` is stale and A is unproven.
- (c) Negative: the existing case-only no-op (`foo` to `Foo`) is unchanged.

Existing `it`s with a pair that has neither name held (around :1123 and :1172, and :941, :1076 and :1449) produce the same output: their dropped names are neither held nor citable. The investigator traced this by hand; the fix lane runs them.

### BL-85 — `slugify` keeps combining marks

`spec-citations.test.ts:65`: the slug class `[\p{L}\p{N} _-]` gains `\p{M}` and `\p{Pc}`, matching github-slugger's kept set (letters, marks, numbers, connector punctuation, space, hyphen).

The existing `it` "slugs keep letters, digits, hyphens and underscores, and drop backticks and colons" (:696) stays as it is. One new `it` checks that a heading with `e` followed by U+0301 slugs with the mark kept, and that a `‿` (U+203F) is kept. It cites `#scenario-a-heading-that-holds-a-combining-mark`.

### BL-92 — permanent names come from `## Requirements` only

`mainSpecs` (:552-561) passes the whole file to `parseRequirements` at :558. Instead, pass only the `## Requirements` section's body, with its slice of the fence mask, the way the delta reader does per section (around :217). Find the section heading the way archive does: trimmed, in any letter case, whole title.

Triage found no `### Requirement:` or `#### Scenario:` heading outside `## Requirements` in any of the 29 specs. The four repo-wide gate `it`s (:634-664) therefore keep their results.

One new rule `it` builds a fixture spec with a `### Requirement:` under `## Behavior`. It asserts that the requirement is not held (an ADDED of the same name is not refused) and is not reported unproven, and that a citation of its anchor is stale. It cites `#scenario-a-requirement-heading-outside-the-requirements-section`.

## Decisions

### 1. BL-103 — edit the gate helper `appliedRenames` in `scripts/__tests__/spec-citations.test.ts`

The gate's code lives inside an existing test file with no exports, so no new file can pin the fix. The edit: when neither the FROM nor the TO of a rename is held at that pair's turn, `appliedRenames` adds FROM, TO and any held name that folds onto FROM to `aborted` (archive throws "source not found" on that pair). It also updates the JSDoc on `nearMisses`, `appliedRenames` and `deltaProof`, and adds new `it`s for the fold shape and the `Ghost`→`Fresh` then `A`→`Ghost` shape. No existing `it` changes. The scenario heading `A rename archive aborts on` stays byte-identical, because four `it`s cite it.

- Options: approve the edit / not now.
- Trade-off: not now leaves the gate passing a delta that archive aborts on.
- **Recommendation:** approve — the gate exists to fail before archive does.
- **Answer:** Approve the edit (Oleg, 2026-10-19).

### 2. BL-85 and BL-92 — fix ahead of their triggers, in the same file

- BL-85: add `\p{M}` and `\p{Pc}` to `slugify`'s class (`spec-citations.test.ts:65`), plus one new `it`.
- BL-92: `mainSpecs` parses only the `## Requirements` body, with its fence-mask slice as the delta path does, plus one new `it`.
- Neither changes any gate result today: no spec heading has a combining mark, and no requirement heading sits outside `## Requirements`.
- Options: fix both now / keep both deferred / BL-85 only.
- Trade-off: fixing now costs two small helper edits in a file the batch already opens, under the same review. Deferring keeps two latent traps that a future spec author would hit.
- **Recommendation:** fix both now — same file, same requirement, same review.
- **Answer:** Fix both now (Oleg, 2026-10-19).

### 3. BL-61 — who draws the Light Spring 375 board

- Options: the agent edits the MVP canvas in place / Oleg draws it.
- **Recommendation:** the agent draws it, and Oleg approves on the board.
- **Answer:** Agent draws it on the canvas (Oleg, 2026-10-19).

### 4. BL-61 — the narrow-phone swatch fix

- (1) 3 columns while the grid is too narrow for 76 px cells (a window under about 404 px), written as an intrinsic `minmax` column template on grid width: no viewport query, no wrapper element.
- (2) 4 columns, names at about 11.5 px.
- (3) 4 columns, breaks inside words (reverses BL-38).
- (4) 4 columns, a 2–4 px column gap.
- Trade-off: (1) keeps 13 px whole-word names and fixes both the overflow and the 3-line wrap, but 375/390/393 px iPhones get 3 columns (24 best colors in 8 rows). (2)–(4) keep 4 columns, but shrink the type, break words, or only push the limit a few pixels.
- **Recommendation:** (1).
- Existing test edit under (1): `e2e/site-structure.spec.ts` "a 4-column grid keeps 4 columns at 375 px" flips to 3 columns at 375, and a 4-column check moves to a width of at least 404 px.
- **Answer:** (1), 3 columns below ~404 px; this approves flipping the `e2e/site-structure.spec.ts` 375 px four-column test (Oleg, 2026-10-19).

### 5. BL-68 — outcome names and where they go (technical)

The outcome goes on `photo_checked` as a PostHog property, not to Sentry. The rate needs the pass count that `photo_checked` already gives, and capture-flow sends only crashes to Sentry.

The keys are `outline` and `outline_ms`, because `mask_*` would trip the privacy-key regex. The values are `made`, `late`, `failed`, `mismatch` and `missed`. The time is sent on `made` only, so BL-104 can read the spread of segmenter times against the 3 s wait. A `late` time would always read 3000.

## Canvas

- **Board:** "16b Swatch grids on narrow phones · Light Spring · 375, 390, 414" (`project/NarrowSwatches.dc.html`, x 10820, y 15780). It shows the Light Spring palette and metals at three widths, with copy from the live Light Spring page.
- **DS copy:** the canvas's design-system copy `project/ds/seasonly/components/bundle.js`, where `SwatchGrid` takes the same template for 4 columns and has a new `keepColumns` prop. Board 16 Season's neighbour strips pass that prop.
- **Redrawn boards:** every 375 board with a 4-column grid (10, 16, 18, 01, 19) now draws 3 columns.
- **Version:** canvas v64 (1792419375-a4ed).
- **Approved:** Oleg, 2026-10-19 ("as drawn"). The rule was checked on the live page, because the browser pane rendered the canvas blank at its size.

## Risks / Trade-offs

- **[A Safari quirk with `max()` inside `minmax()`]** → Both are supported since Safari 13.1/14. The e2e runs in WebKit too if the project config includes it; otherwise check on a real iPhone during `/backlog-fix` verify.
- **[3 columns make palettes on common iPhones 8 rows tall]** → Accepted in Decision 4. `design-review.spec.ts` guards the first screen.
- **[BL-92 could hide a mistyped spec]** → A requirement written under the wrong section stops being gated, which is what archive does with it anyway. Triage found none today.
- **[BL-68's outcome exits are browser-only]** → Pin the mapping with a mocked `loadPerson` unit test. The real segmenter path stays covered only by manual phone tests.
