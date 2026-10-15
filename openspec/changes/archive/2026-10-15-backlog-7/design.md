## Context

See proposal.md for why. Triage ran on `origin/main` at `e440268`. Four read-only Plan investigators ran in parallel: BL-66, BL-67, BL-26 and BL-64. All four are real and fixable. The BL-67 investigator found BL-69; the BL-26 investigator found BL-70. Both were logged; BL-69 joins as the fifth fix. Every approval was given by Oleg on 2026-10-15. No canvas design is involved: BL-26 changes no pixels.

| Id    | Lane         | Why                                                                                                            |
| ----- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| BL-69 | B            | The gate lives in an existing test file (Decision 1).                                                          |
| BL-66 | B            | Same file (Decision 2).                                                                                        |
| BL-67 | B            | Same file (Decision 3).                                                                                        |
| BL-26 | A            | A listed port difference, a technical call; no existing test changes, no canvas change. See the BL-26 section. |
| BL-64 | B            | Two existing tests change (Decision 4).                                                                        |
| BL-70 | not in batch | Found in triage; `season-reveal`, and the batch is at its ceiling of five. Logged `open`.                      |

## Goals / Non-Goals

**Goals:** the gate reads the unenforced flag only where it is a flag; a rename's new name resolves whatever it holds; a change can mark a requirement unenforced and drop its last citing test before archive; the season page's famous photos go through the design system's `Slot`; one footer helper in `view.test.tsx`.

**Non-Goals:**

- No shared delta-section parser (BL-66's "best done as"): the double parse costs nothing with a handful of open deltas, and the `TO:` regex alone fixes the defect. The `FROM:` and `TO:` readers then use the same pattern shape.
- No inverse of BL-67 (a delta that _removes_ the flag still counts as unenforced from the main spec until archive): it fails safe, blocking at archive under "Archiving a requirement nobody tests".
- No per-scenario unenforced flag: a flag anywhere in a requirement's body marks the whole requirement, before and after archive alike.
- No design-system (`bundle.js`) change for `Slot`: see BL-26.
- "ends with the footer's three lines" in `view.test.tsx` keeps reading the whole page (Decision 4, option b declined).
- BL-70 waits for the next batch.

## Members

Order matters: BL-69 lands before BL-67. Once `deltaProof` reads the flag from deltas, a delta line that only names the flag would mark its requirement gone until the line-start match lands. That fails open, so nothing blocks, but the gate is wrong in between.

### BL-69 — only a line-start flag counts

`scripts/__tests__/spec-citations.test.ts:81`: `parseRequirements` sets `unenforced` when a line _starts with_ the flag instead of when it _contains_ it. Today constitution "Every requirement is proven by a test that cites it" is flagged by its body (:64) and a WHEN line (:83); it stays green because tests cite it. Every one of the 30 real flags across 18 specs starts its line, so nothing else moves. The fixture at :323 (a flag after the section closes) is unaffected. New rule test: a requirement whose body names the flag mid-sentence and that nobody cites is reported unproven ({@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-whose-prose-only-names-the-flag}); it fails before the fix. Files: `spec-citations.test.ts` (approved).

### BL-66 — read a `TO:` name to the end of its line

`spec-citations.test.ts:99`: `deltaAnchors`'s `TO:` regex (`[^`]+`, stops at the first backtick) becomes the `FROM:` reader's shape (`.+`anchored by a closing backtick at end of line, multiline), as`deltaProof`reads`FROM:`at :132. Existing "a change delta makes its ADDED, MODIFIED and RENAMED headings citable" (:415) keeps passing: its`TO:`has no inner backtick. New rule test: a RENAMED delta whose`TO:`name holds a backticked word makes the full slug citable ({@link openspec/specs/spec-workflow/spec.md#scenario-a-test-citing-a-new-name-that-holds-a-code-span}); it fails before the fix. No open change exists today, so the bug is latent. Files:`spec-citations.test.ts` (approved).

### BL-67 — an open change can mark a requirement unenforced

`spec-citations.test.ts:135-138`: in `deltaProof`'s MODIFIED branch, a requirement whose delta body carries the flag (`r.unenforced`) is added to `into.gone`, as REMOVED and RENAMED-FROM are. The `OpenDelta.gone` doc comment (:116) and the header comment (:7-9) add "or marks unenforced". `unprovenRequirements` (:176-182) needs no change: it already skips `gone`. New rule test: a delta that modifies an uncited requirement and marks it unenforced removes it from the report, while another uncited requirement is still reported ({@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-an-unarchived-change-marks-unenforced}); it fails before the fix. Existing `deltaProof` tests (:451, :467) keep passing: none of their deltas carries the flag. Files: `spec-citations.test.ts` (approved).

The spec-workflow delta never writes the flag token itself, only "marked unenforced" in prose; with BL-69 in place a mention would be harmless anyway.

### BL-26 — `Slot` takes `loading`, is exported, and the season page uses it

The design system's `bundle.js` (version `1792008391-e50a`, read 2026-10-15) has `Slot` as an internal helper: it is not in `index.d.ts` or the `window.Seasonly` export, and it takes `src`, `alt`, `label`, `className`, `style`. The port at `apps/web/src/components/ds/slot.tsx` matches it. The fix:

- `slot.tsx`: `SlotProps` gains optional `loading?: "lazy" | "eager"`, passed to the `img`; unset leaves no attribute. The four internal callers (`photo-tip-card.tsx`, `camera-frame.tsx`, `draping-pair.tsx`, `quiz-option.tsx`) pass nothing and render byte-identical.
- `index.ts`: export `Slot` and `type SlotProps`.
- `apps/web/src/app/(site)/seasons/[season]/page.tsx:124-127`: the hand-built `sn-slot` div and `img` become `<Slot src={f.image} className="aspect-3/4" loading="lazy" />`; the eslint-disable line goes. `alt` stays empty (Slot's default), as the caption names the photo. `content.test.tsx:105-110` and `:237-257` must pass unchanged (no `sn-slot__label`, empty alts, `sn-slot` class kept).
- `openspec/specs/ui-components/spec.md`, by hand (archive replaces requirements only): the Public Interface block adds `SlotProps` and `function Slot`; Behavior's "Two things differ" becomes three, the third bullet: "`Slot` is public here, while the bundle keeps it internal, and takes an optional `loading` passed to its `img`, which the bundle's has not."
- New `apps/web/src/components/ds/slot.test.tsx` (a new file, no approval needed) cites the three new scenarios.

Why a listed port difference and not a design-system change first: `loading` has no pixels, so a bundle change would show nothing on the canvas, and the bundle does not export `Slot` at all — the port already departs from it by making it reachable. The spec already lists departures of this kind (`next/link` in Button, the core `Swatch` type). Always-lazy inside `Slot` was rejected: it would lazy-load `DrapingPair`, `QuizOption` and `PhotoTipCard` images that can sit above the fold. Files: `slot.tsx`, `index.ts`, `slot.test.tsx` (new), `page.tsx`, `openspec/specs/ui-components/spec.md`.

### BL-64 — one footer helper

`apps/web/src/lib/report/view.test.tsx`: a file-scope `footer(markup)` helper (`words` of the `<footer>…</footer>` match, or `""`) sits beside `html`, `words`, `sections` and `grid` (~:43). "has no photo line in a quiz-only footer" (:168-175) loses its local declaration at :170; :171-174 stay byte-identical. "names Google's copy in a photo report's footer" (:177-184) calls `footer(out)` instead of its inline regex; its local `const footer` is renamed (for example `photo`) so it does not shadow the helper. Assertions and citations unchanged. `ReportView` renders exactly one `<footer>` (`view.tsx:76`). Files: `view.test.tsx` (approved).

## Decisions

### 1. BL-69 — approve the edit to `scripts/__tests__/spec-citations.test.ts`

The match at :81 changes from contains to starts-with; one new rule test. No existing `it` or fixture changes.

- **a. Approve.**
- **b. Not now:** BL-69 stays open; the batch drops to four fixes.

Trade-off: a closes a hole that BL-67 would widen; b keeps the constitution's proof requirement silently flagged.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-15)

### 2. BL-66 — approve the edit to `scripts/__tests__/spec-citations.test.ts`

The `TO:` regex at :99 reads to end of line; one new rule test. No existing `it` or fixture changes. The minimal regex fix, not the shared-parser refactor, is a technical call (Non-Goals).

- **a. Approve.**
- **b. Not now:** stays open; latent until a change renames to a backticked name.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-15)

### 3. BL-67 — approve the edit to `scripts/__tests__/spec-citations.test.ts`

One branch in `deltaProof`, two comments, one new rule test. No existing `it` or fixture changes. Spec: MODIFIED "Citations are gated at every commit".

- **a. Approve.**
- **b. Not now:** a change that marks a requirement unenforced keeps citing it until archive.

**Recommendation:** a — the same deadlock `backlog-6` fixed for removed and renamed requirements.

**Answer:** a — approved (Oleg, 2026-10-15)

### 4. BL-64 — approve the edit to two tests in `apps/web/src/lib/report/view.test.tsx`

"has no photo line in a quiz-only footer" and "names Google's copy in a photo report's footer" call a hoisted `footer()` helper; assertions unchanged.

- **a. The two footer tests.**
- **b. Also scope "ends with the footer's three lines" (:101-110) to `footer(out)`:** stricter, a third existing-test edit.
- **c. Not now.**

Trade-off: a is exactly the item; b tightens a passing test that deserves its own line.

**Recommendation:** a.

**Answer:** a — the two footer tests (Oleg, 2026-10-15)

## Risks / Trade-offs

- [A future spec writes a real flag mid-line, e.g. indented in a list] → it would stop counting; the proof check then reports the requirement, which fails safe and names it.
- [BL-67 trusts a delta's flag before archive] → archive copies the same body into the main spec, where the flag already exempts it; the window adds nothing archive would not.
