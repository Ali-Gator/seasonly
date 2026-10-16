## 1. Spec deltas

- [x] 1.1 `spec-workflow` delta (MODIFIED "Citations are gated at every commit": rename lines read in every spelling OpenSpec's archive accepts; new scenario "A rename written in another spelling OpenSpec accepts") — written in triage

## 2. Fixes — one subagent at a time, serially

- [x] 2.1 BL-71 — new rule test in `scripts/__tests__/spec-citations.test.ts`: a RENAMED delta written without backticks, with extra spaces and with a `*` bullet makes the new name citable via `deltaAnchors` and the old one gone via `deltaProof`; an `INTO: …` line is not read as a rename ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-written-in-another-spelling-openspec-accepts}). Verify it fails on the current code.
- [x] 2.2 BL-71 — edit the existing test file (approved, design.md Decision 1): one shared rename-line pattern in OpenSpec's archive shape (start of line, optional `-`/`*`/`+`, flexible spaces, optional backticks, bare name, multiline) used by `deltaAnchors` (:100) and `deltaProof` (:133); slug `slugify("Requirement: " + name.trim())`. No existing `it` or fixture changes. Until 2.1 passes and the existing rename tests (:428, :464, :474) pass unchanged.
- [x] 2.3 BL-72 — new `it` after :513 (approved, design.md Decision 2): a MODIFIED delta of "Untested" whose body names the flag only mid-sentence, through `deltaProof` and `unprovenRequirements`, leaves "Untested" and the `plan_shared` requirement reported ({@link openspec/specs/spec-workflow/spec.md#scenario-a-requirement-whose-prose-only-names-the-flag}). Verify it guards: temporarily make `deltaProof`'s MODIFIED branch use a body-level substring check, see it fail, restore.
- [ ] 2.4 BL-70 — `apps/web/src/app/(flow)/analyze/_reveal/steps.tsx`: import `Slot` (:6); replace the hand-built slot (:37-40) with `<Slot src={cropUrl} alt="Your face crop" className="h-44 w-33 self-center rounded-full" />` inside the existing `cropUrl &&` guard; the eslint-disable line goes. No new test (design.md BL-70). Until `pnpm typecheck`, `pnpm lint` and `pnpm test:unit` pass and the e2e funnel hold test passes unchanged.

## 3. Verify, delete, review, archive, ship

- [ ] 3.1 `pnpm fix`, `pnpm test` (and `pnpm test:eval`)
- [ ] 3.2 delete shipped bullets BL-71, BL-72, BL-70 from `docs/backlog.md`; BL-49 and BL-51 stay
- [ ] 3.3 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [ ] 3.4 archive (`/opsx:archive` flow, no Tracker), preflight, push, PR, auto-merge
