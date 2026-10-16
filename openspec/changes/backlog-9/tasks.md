## 1. Spec deltas

- [x] 1.1 spec-workflow delta ("Citations are gated at every commit": archive-shaped delta reading, three new scenarios) — written in triage
- [x] 1.2 abuse-controls delta ("A report gets at most 3 emails": `**Unenforced:**` line) — written in triage

## 2. Fixes — one subagent at a time, serially

Each of 2.1–2.6 leaves the suite green before the next starts. All of them edit `scripts/__tests__/spec-citations.test.ts`, as approved in design.md Decision 1: helper code plus three new `it`s, no existing `it` or fixture changes.

- [x] 2.1 BL-73 — new failing rule test: a lone new-name line first, then an old-name line followed only by a misspelled new-name line (`T0:`/`TOO:`); archive emits zero pairs. The old requirement stays reported, and the lone new name is not citable ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-line-with-no-partner}). Verify it fails.
- [x] 2.2 BL-73 — the rename pair reader per RENAMED section (design.md BL-73 rules). `deltaAnchors` cites paired new names only, `deltaProof` marks paired old names gone only. Done when 2.1 passes and every existing `it` passes unchanged.
- [ ] 2.3 BL-74 — new failing rule test: `## Renamed Requirements` and `##   modified requirements  ` are read, and `## ADDED Requirements (draft)` adds nothing ({@link openspec/specs/spec-workflow/spec.md#scenario-a-delta-section-heading-in-another-letter-case}). Verify it fails.
- [ ] 2.4 BL-74 — one section reader (trimmed, lowercased, whole-title equality) replaces both splits, the four `startsWith` checks and both header strips, and feeds 2.2's pair reader one body at a time. `parseRequirements` takes archive's `REQUIREMENT_HEADER_REGEX` (case-insensitive). Done when 2.3 passes and every other `it` still passes.
- [ ] 2.5 BL-75 — new failing rule test: renames inside a ``` fence and an indented `~~~` fence are neither citable nor gone; a fenced `## RENAMED Requirements` line opens no section; a fenced `### Requirement:` line in an ADDED section makes nothing citable ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-example-inside-a-code-fence}). Verify it fails.
- [ ] 2.6 BL-75 — port archive's fence mask (design.md BL-75), built once per delta. Skip masked lines in the section reader and the pair reader, and replace `parseRequirements`' column-0 toggle with it. Done when 2.5 passes and every other `it` still passes.
- [ ] 2.7 BL-08 — no code or test edit. Confirm `store.test.ts`'s citation of `#scenario-two-requests-at-once` still resolves under `pnpm test:unit`; the delta applies at archive.

## 3. Verify, delete, review, archive, ship

- [ ] 3.1 `pnpm fix`, then `pnpm test`; both green
- [ ] 3.2 delete shipped bullets BL-73, BL-74, BL-75, BL-08 from `docs/backlog.md`
- [ ] 3.3 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [ ] 3.4 archive (`/opsx:archive` flow, no Tracker), preflight, push, PR, auto-merge
