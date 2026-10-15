## 1. Spec deltas

- [x] 1.1 `spec-workflow` delta (MODIFIED "Citations are gated at every commit": line-start flag only, rename's new name read whole, a change can mark a requirement unenforced; three new scenarios) — written in triage
- [x] 1.2 `ui-components` delta (ADDED "A photo slot shows its image or a labeled placeholder") — written in triage

## 2. Fixes — one subagent at a time, serially

- [x] 2.1 BL-69 — new rule test in `scripts/__tests__/spec-citations.test.ts`: a requirement whose body names the flag mid-sentence, with no line starting with it and no citing test, is reported unproven ({@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-whose-prose-only-names-the-flag}). Build the flag token by concatenation if the file's own scan would read it. Verify it fails on the current code.
- [x] 2.2 BL-69 — edit the existing test file (approved, design.md Decision 1): `parseRequirements` (:81) sets `unenforced` only when the line starts with the flag. No existing `it` or fixture changes. Until 2.1 passes and `pnpm test:unit` is green (constitution's proof requirement must stay proven by its citing tests).
- [x] 2.3 BL-66 — new rule test: a RENAMED delta whose `TO:` name holds a backticked word makes the full slug citable via `deltaAnchors` ({@link openspec/specs/spec-workflow/spec.md#scenario-a-test-citing-a-new-name-that-holds-a-code-span}). Verify it fails on the current code.
- [x] 2.4 BL-66 — edit the existing test file (approved, design.md Decision 2): the `TO:` regex in `deltaAnchors` (:99) takes the `FROM:` reader's shape (`.+`, closing backtick at end of line, multiline). Until 2.3 passes and the existing delta tests (:415, :441) pass unchanged.
- [x] 2.5 BL-67 — new rule test next to :451/:467: a delta that modifies an uncited requirement and marks it unenforced removes it from `unprovenRequirements`' report, while an unrelated uncited requirement is still reported ({@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-an-unarchived-change-marks-unenforced}). Verify it fails on the current code.
- [x] 2.6 BL-67 — edit the existing test file (approved, design.md Decision 3): `deltaProof`'s MODIFIED branch (:135-138) adds `r.anchor` to `into.gone` when `r.unenforced`; the `OpenDelta.gone` comment (:116) and header comment (:7-9) add "or marks unenforced". Until 2.5 passes and `pnpm test:unit` is green.
- [x] 2.7 BL-26 — new `apps/web/src/components/ds/slot.test.tsx` (imports `Slot` from `./index`): an image asked to load lazily carries its alt and `loading="lazy"` ({@link openspec/specs/ui-components/spec.md#scenario-a-slot-asked-to-load-lazily}); with no loading it has no `loading` attribute ({@link openspec/specs/ui-components/spec.md#scenario-a-slot-with-no-loading-asked}); with no image it shows "Photo" (or its label) and no `img` ({@link openspec/specs/ui-components/spec.md#scenario-a-slot-with-no-image}). Verify it fails on the current code (no export, no prop).
- [x] 2.8 BL-26 — `apps/web/src/components/ds/slot.tsx`: optional `loading?: "lazy" | "eager"` passed to the `img`; `index.ts` exports `Slot` and `type SlotProps`; `apps/web/src/app/(site)/seasons/[season]/page.tsx:124-127` uses `<Slot src={f.image} className="aspect-3/4" loading="lazy" />` and drops its eslint-disable. Hand-edit `openspec/specs/ui-components/spec.md`: Public Interface adds `SlotProps` and `function Slot`; Behavior "Two things differ" becomes three, the third bullet per design.md BL-26. Until 2.7 passes and `content.test.tsx` and the DS tests pass unchanged.
- [x] 2.9 BL-64 — edit the existing tests (approved, design.md Decision 4): `apps/web/src/lib/report/view.test.tsx` gets a file-scope `footer(markup)` helper beside `grid` (~:43); "has no photo line in a quiz-only footer" drops its local declaration (:170); "names Google's copy in a photo report's footer" calls `footer(out)` and renames its local so it does not shadow the helper. Assertions and citations unchanged; "ends with the footer's three lines" untouched. Until `view.test.tsx` passes.

## 3. Verify, delete, review, archive, ship

- [x] 3.1 `pnpm fix`, `pnpm test` (and `pnpm test:eval`)
- [x] 3.2 delete shipped bullets BL-69, BL-66, BL-67, BL-26, BL-64 from `docs/backlog.md`; BL-70 stays
- [x] 3.3 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [ ] 3.4 archive (`/opsx:archive` flow, no Tracker), preflight, push, PR naming new ids BL-69 and BL-70, auto-merge
