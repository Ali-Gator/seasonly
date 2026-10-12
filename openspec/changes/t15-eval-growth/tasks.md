## 0. Rules

Cite scenarios at `openspec/specs/analysis-eval/spec.md#…`. Add new test cases only. An existing test changes only with the user's approval, listed here.

## 1. The photo list (user approval)

- [ ] 1.1 Search Wikimedia Commons for 18 medium and deep people (design D1). For each photo note the file page, original URL, license, author, light and proposed `expect`; for each person a proposed season with a one-line reason and a skin band. Done when the list is drafted.
- [ ] 1.2 Publish the list as a private review page, with the holdout each person would get under D2. Ask the user, in one message, to approve or edit the people, photos, labels and `expect`, the holdout rule, and resetting `baseline.json` to the grown set's first untuned run (D5). Done when the user says yes; record the date and any edits here.

## 2. Holdout and trait spread (tests first)

- [ ] 2.1 `manifest.test.ts`: new cases for `holdout` — valid `true`, an invalid value, and a person split across both sets ({@link openspec/specs/analysis-eval/spec.md#requirement-a-holdout-set-judges-what-the-rest-tuned}).
- [ ] 2.2 `metrics.test.ts`: new cases for trait spread — two photos, and one passing photo ({@link openspec/specs/analysis-eval/spec.md#requirement-trait-spread-is-measured-across-one-persons-photos}).
- [ ] 2.3 `results.test.ts`: new cases — two people, one held out; no holdout; no single photo's trait in the output ({@link openspec/specs/analysis-eval/spec.md#requirement-results-are-recorded-with-the-inputs-they-came-from}).
- [ ] 2.4 Code: `manifest.ts` (`holdout`), `metrics.ts` (`traits` on `PhotoOutcome`, `traitSpread`), `pipeline.ts` (pass traits through), `results.ts` (split, `holdout` per person). Existing tests that need `traits` added to an outcome literal are listed for approval before they change. Done when `pnpm test:unit` passes.

## 3. The grown set

- [ ] 3.1 Download the approved photos, compute SHA-256, and write the manifest entries (`p17`…), with `holdout: true` per D2 in the same commit. Done when `pnpm eval:fetch` reports nothing missing and the manifest test passes.
- [ ] 3.2 `pnpm eval:run`. Record the tuning and holdout metrics and trait spread, the false rejects by problem and by skin band, and any person left unmeasured. Write `baseline.json` from the tuning set's metrics (approved in 1.2). Done when `pnpm test:eval` passes.
- [ ] 3.3 If `dark` false rejects fall mostly on deep skin, add a backlog item with the counts.

## 4. White-balance re-run (design D6)

- [ ] 4.1 In a scratch worktree at `1d28b3d` with this branch's manifest and evals code, sweep `k` on the tuning set and on the holdout. Record agreement, family agreement, accuracy, false-reject rate, catch rate and trait spread per `k` in a table here.
- [ ] 4.2 Apply D6's rule. Rewrite BL-13 with the tables and the verdict: either "ready for a follow-up change with `k` = …" or "parked again, because …". Done when BL-13 is updated.

## 5. Docs and gate

- [ ] 5.1 `evals/README.md`: holdout, trait spread, the baseline reset. Delete BL-14 from `docs/backlog.md`.
- [ ] 5.2 `pnpm fix`, `pnpm test`. Done when both pass.
- [ ] 5.3 Phase review, archive (re-add Public Interface, Behavior and Edge Cases to `analysis-eval` with the new numbers), Tracker T15 row, push, PR with auto-merge (merge commit).
