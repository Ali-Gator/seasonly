## Context

See proposal.md for why. Triage ran on `origin/main` at `feb21ea`. Five read-only Plan investigators ran in parallel: BL-71, BL-72 and BL-70 (pass 1), BL-49 and BL-51 (pass-2 buffer). Both approvals were given by Oleg on 2026-10-15. No canvas design is involved: BL-70 renders the same HTML.

| Id    | Lane | Why                                                                             |
| ----- | ---- | ------------------------------------------------------------------------------- |
| BL-71 | B    | The gate lives in an existing test file (Decision 1).                           |
| BL-72 | B    | A new `it` in the same file (Decision 2).                                       |
| BL-70 | A    | Pure refactor, byte-identical DOM, no test changes.                             |
| BL-49 | D    | Needs four clean weekly CI runs; 0 so far, first scheduled 2026-10-19.          |
| BL-51 | D    | Needs about 50 production photo checks at the eye-white step; 3 so far, 0 null. |

## Goals / Non-Goals

**Goals:** a rename the archive accepts never blocks its change; the negative side of `backlog-7`'s unenforced-in-a-delta rule is pinned; the last hand-built `sn-slot` in app code goes.

**Non-Goals:**

- No code-fence skip in the rename readers (OpenSpec's archive parser skips fenced lines): no delta has a fenced rename example; add it if one ever appears.
- No new test for BL-70: no test renders `Analyzing`, the DOM does not change, and `slot.test.tsx` already proves `Slot` passes `alt` through and adds no `loading` unasked.
- BL-71's bullet claims `*`/`+` bullets fail; they do not (see BL-71). Not a goal, recorded as a correction.

## Members

### BL-71 — rename readers use OpenSpec's archive pattern

OpenSpec's archive path (`@fission-ai/openspec` 1.13.0, `dist/core/parsers/requirement-blocks.js:293-294`, `parseRenamedPairs`) reads rename lines with a start-anchored pattern: optional leading spaces, an optional `-`, `*` or `+` bullet, `FROM:`/`TO:`, flexible spaces, optional backticks around `### Requirement: <name>`, and captures the bare name lazily up to an optional closing backtick; the name is trimmed. The archive path is the one copied, not the validate path (`change-parser.js:144-145`, `-?` only), since archive decides what the main spec becomes.

`scripts/__tests__/spec-citations.test.ts`: the `TO:` regex in `deltaAnchors` (:100) and the `FROM:` regex in `deltaProof` (:133) become that shape, multiline; the slug becomes `slugify("Requirement: " + name.trim())`. One shared pattern builder (keyword in, regex out) keeps the two from drifting again. Existing tests at :428, :464 and :474 give the same slugs under the new pattern (checked by the investigator against OpenSpec's regex). New rule test: a RENAMED delta whose lines are written without backticks, with extra spaces, and with a `*` bullet makes the new name citable via `deltaAnchors` and the old one gone via `deltaProof`; an `INTO: …` line is not read as a rename ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-written-in-another-spelling-openspec-accepts}). It fails before the fix on the no-backtick and extra-space lines. Files: `spec-citations.test.ts` (approved).

**Correction to the bullet:** the current regexes have no start anchor, so `*`/`+` bullets and bullet-less lines already match; what fails is no backticks, extra spaces, and no space after the colon. The unanchored regex also over-accepts (`INTO:`), which the fix closes.

### BL-72 — pin the negative side of a delta's unenforced flag

`spec-citations.test.ts`: a new `it` right after "a requirement an open change marks unenforced needs no citing test" (:503-513), same shape: the shared `specs`, no citations, an open-change map holding `deltaProof` of a MODIFIED "Untested" delta whose body names the flag only inside a sentence. It expects "Untested" and the `plan_shared` requirement both reported. Cites the existing scenario {@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-whose-prose-only-names-the-flag}, whose WHEN covers a body a delta supplies; no new scenario. Build the flag token by concatenation if the file's own scan would read it. It passes on today's code (it is a regression guard); verify it by temporarily reverting `deltaProof`'s MODIFIED branch to a body-level substring check and seeing it fail, then restore. Files: `spec-citations.test.ts` (approved).

### BL-70 — the analyzing step uses `Slot`

`apps/web/src/app/(flow)/analyze/_reveal/steps.tsx`: add `Slot` to the `@/components/ds` import (:6); replace the hand-built `div.sn-slot`, its eslint-disable comment and the `img` (:37-40) with `<Slot src={cropUrl} alt="Your face crop" className="h-44 w-33 self-center rounded-full" />`, keeping the `cropUrl &&` guard so the quiz-only path renders nothing instead of the "Photo" placeholder. The class string, `alt` and absent `loading`/`style` give the same HTML. The slot is in the `Analyzing` step (artboard 07), not the reveal itself. Governing requirement: season-reveal "The analyzing step follows the canvas and fails visibly", unchanged. Files: `steps.tsx`.

## Decisions

### 1. BL-71 — approve the edit to `scripts/__tests__/spec-citations.test.ts`

Both rename readers take OpenSpec's archive pattern; one new rule test. No existing `it` or fixture changes. Copying the archive pattern and leaving out the code-fence skip are technical calls (above).

- **a. Approve.**
- **b. Not now:** stays open; a valid rename in another spelling keeps blocking its change.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-15)

### 2. BL-72 — approve a new test in `scripts/__tests__/spec-citations.test.ts`

One new `it`; no existing `it` or fixture changes; no spec change.

- **a. Approve.**
- **b. Not now:** a regression local to `deltaProof` would fail open unseen.

**Recommendation:** a.

**Answer:** a — approved (Oleg, 2026-10-15)

## Risks / Trade-offs

- [The lazy capture with an optional closing backtick strips a trailing backtick from an unquoted name ending in a code span] → OpenSpec's archive does the same, so the gate and the archived heading agree.
