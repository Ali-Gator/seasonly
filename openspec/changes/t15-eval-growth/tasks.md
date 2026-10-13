## 0. Rules

Cite scenarios at `openspec/specs/analysis-eval/spec.md#…`. Add new test cases only. An existing test changes only with the user's approval, listed here.

## 1. The photo list (user approval)

- [x] 1.1 Search Wikimedia Commons for 18 medium and deep people (design D1). For each photo note the file page, original URL, license, author, light and proposed `expect`; for each person a proposed season with a one-line reason and a skin band. Done when the list is drafted.
- [x] 1.2 Publish the list as a private review page, with the holdout each person would get under D2. Ask the user, in one message, to approve or edit the people, photos, labels and `expect`, the holdout rule, and resetting `baseline.json` to the grown set's first untuned run (D5). Done when the user says yes; record the date and any edits here.
  - Approved by the user on 2026-10-12, with no edits: the list on the review page (18 people, 88 photos; Janelle Monáe's orange stage photo `expect: tint`), the holdout rule (8 people), resetting `baseline.json` to the grown set's first untuned run, and the `traitSpread: null` line in `metrics.test.ts` "an empty set". Review page: https://claude.ai/artifact/CpTfVgieKdzFuG6jzejpmQ

## 2. Holdout and trait spread (tests first)

- [x] 2.1 `manifest.test.ts`: new cases for `holdout` — valid `true`, an invalid value, and a person split across both sets ({@link openspec/specs/analysis-eval/spec.md#requirement-a-holdout-set-judges-what-the-rest-tuned}).
- [x] 2.2 `metrics.test.ts`: new cases for trait spread — two photos, and one passing photo ({@link openspec/specs/analysis-eval/spec.md#requirement-trait-spread-is-measured-across-one-persons-photos}).
- [x] 2.3 `results.test.ts`: new cases — two people, one held out; no holdout; no single photo's trait in the output ({@link openspec/specs/analysis-eval/spec.md#requirement-results-are-recorded-with-the-inputs-they-came-from}).
- [x] 2.4 Code: `manifest.ts` (`holdout`), `metrics.ts` (`traits` on `PhotoOutcome`, `traitSpread`), `pipeline.ts` (pass traits through), `results.ts` (split, `holdout` per person). `traits` is optional on `PhotoOutcome`, so existing outcome literals need no change. One existing test needs an edit, pending the user's approval in 1.2: `metrics.test.ts` "an empty set" gains `traitSpread: null` in its expected metrics. Done when `pnpm test:unit` passes.

## 3. The grown set

- [x] 3.1 Download the approved photos, compute SHA-256, and write the manifest entries (`p17`…), with `holdout: true` per D2 in the same commit. Done when `pnpm eval:fetch` reports nothing missing and the manifest test passes.
  - Done 2026-10-13: 87 photos, p17–p34, 8 people held out. Vetted at full size before any run: every photo shows the right person. Dropped `p33/4` (Pressley), a second crop of the same moment as `p33/2`, so the set has 87 of the 88 approved. A download bug wrote a previous photo's bytes when Commons throttled past every retry; 7 such files were caught by hash and re-fetched before the manifest was written.
- [x] 3.2 `pnpm eval:run`. Record the tuning and holdout metrics and trait spread, the false rejects by problem and by skin band, and any person left unmeasured. Write `baseline.json` from the tuning set's metrics (approved in 1.2). Done when `pnpm test:eval` passes.
  - Run 2026-10-13 (34 people, 180 photos, 330 variants). Tuning set (26 people): agreement 0.5687, family agreement 0.7027, accuracy 0.1322, false-reject rate 0.281 (dark 14, tint 8, filter 8, several-faces 3, no-face 1), catch rate 0.8812; trait spread temperature 0.3241, value 0.2389, clarity 0.1929. Holdout (8 people): agreement 0.5312, family agreement 0.6458, accuracy 0.0811, false-reject rate 0.3784, catch rate 0.8841; trait spread temperature 0.1943, value 0.2466, clarity 0.1007. Unmeasured: p19 (one passing photo). False rejects by band, usable photos: original 13 of 72, medium new 17 of 45, deep new 18 of 41. `baseline.json` reset to the tuning set's numbers, as approved on 2026-10-12.
- [x] 3.3 If `dark` false rejects fall mostly on deep skin, add a backlog item with the counts.
  - Yes: 22% of new deep photos against 8–9% elsewhere. Logged as BL-45; unexpected several-faces on 5 vetted photos as BL-46.

## 4. White-balance re-run (design D6)

- [ ] 4.1 In a scratch worktree at `1d28b3d` with this branch's manifest and evals code, sweep `k` on the tuning set and on the holdout. Record agreement, family agreement, accuracy, false-reject rate, catch rate and trait spread per `k` in a table here.
- [ ] 4.2 Apply D6's rule. Rewrite BL-13 with the tables and the verdict: either "ready for a follow-up change with `k` = …" or "parked again, because …". Done when BL-13 is updated.

## 5. Docs and gate

- [ ] 5.1 `evals/README.md`: holdout, trait spread, the baseline reset. Delete BL-14 from `docs/backlog.md`.
- [ ] 5.2 `pnpm fix`, `pnpm test`. Done when both pass.
- [ ] 5.3 Phase review, archive (re-add Public Interface, Behavior and Edge Cases to `analysis-eval` with the new numbers), Tracker T15 row, push, PR with auto-merge (merge commit).
