## 1. Spec deltas

- [x] 1.1 spec-workflow delta ("Citations are gated at every commit": REMOVED bullets, scenario headings, exact-name matching; three new scenarios) — written in triage

## 2. Fixes — one subagent at a time, serially

Each task leaves the suite green before the next starts. All of them edit `scripts/__tests__/spec-citations.test.ts`, as approved in design.md Decisions 1 and 2. Order is fixed: BL-79, BL-77, BL-78, BL-76 (design.md Members).

- [x] 2.1 BL-79 — `parseRequirements(lines, mask = fenceMask(lines))`; `deltaAnchors` and `deltaProof` pass `body`/`mask` with no `join`; `mainSpecs` passes `splitLines(...)`. Edits the three fixture call sites listed in design.md Decision 1 to pass lines (no assertion changes). Done when every existing `it` passes.
- [x] 2.2 BL-77 — new failing rule test: `#### scenario: Lower case` and `####   Scenario:  Wide` are citable as `scenario-lower-case` and `scenario--wide`, and a `#### Notes` heading adds no scenario ({@link openspec/specs/spec-workflow/spec.md#scenario-a-scenario-heading-in-another-letter-case}). Verify it fails.
- [x] 2.3 BL-77 — scenario regex: `####`, whitespace, `Scenario:` in any case, anchor = slug of the text as written; block end unchanged (design.md Decision 3). Done when 2.2 passes and every other `it` passes.
- [ ] 2.4 BL-78 — new failing rule test: REMOVED `untested`, RENAMED FROM a punctuation-stripped name, MODIFIED `UNTESTED` with `**Unenforced:**` and a new scenario; main's requirements stay reported and the MODIFIED scenario does not resolve ({@link openspec/specs/spec-workflow/spec.md#scenario-a-delta-name-that-differs-from-the-permanent-one-only-in-case-or-punctuation}). Verify it fails.
- [ ] 2.5 BL-78 — key `renamedPairs`, `existing`, `gone` and `scenarios` by `Requirement: <trimmed>` name; anchors stay slugs. Rewrites exactly the assertions listed in design.md Decision 2 from slugs to names, found by `it` title. Done when 2.4 passes and every other `it` passes.
- [ ] 2.6 BL-76 — new failing rule test: REMOVED `- ### Requirement: Untested`, ``* `### Requirement: Second` `` and a fenced `+ ### Requirement: Third`; only `Third` stays reported ({@link openspec/specs/spec-workflow/spec.md#scenario-a-removal-written-as-a-list-bullet}). Verify it fails.
- [ ] 2.7 BL-76 — `deltaProof`'s REMOVED branch also reads archive's bullet pattern (case-sensitive `Requirement:`), skipping masked lines, into `gone` by name. Done when 2.6 passes and every other `it` passes.

## 3. Verify, delete, review, archive, ship

- [ ] 3.1 `pnpm fix`, then `pnpm test`; both green
- [ ] 3.2 delete shipped bullets BL-76, BL-77, BL-78, BL-79 from `docs/backlog.md`
- [ ] 3.3 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [ ] 3.4 archive (`/opsx:archive` flow, no Tracker), preflight, push, PR, auto-merge
