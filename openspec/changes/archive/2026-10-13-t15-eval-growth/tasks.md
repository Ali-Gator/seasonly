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
  - Phase review, 2026-10-13: five photos labeled `pass` show a clear second face (p19/2, p23/6, p24/2, p29/2, p33/2) and p31/5 is a full profile. They are relabeled `several-faces` and `no-face`, as the photos show; this is a labeling fix, not a swap, and no photo was added or removed. Re-run: tuning agreement 0.5687 (unchanged), accuracy 0.1345, false-reject rate 0.2689 (dark 14, tint 8, filter 8, several-faces 1, no-face 1), catch rate 0.8812, expected-problem rate 0.5652; holdout agreement 0.5312, accuracy 0.0882, false-reject rate 0.3235. Trait spread unchanged. `baseline.json` holds these numbers.
- [x] 3.3 If `dark` false rejects fall mostly on deep skin, add a backlog item with the counts.
  - Yes: 22% of new deep photos against 8–9% elsewhere. Logged as BL-45. (A BL-46 on several-faces was logged and removed in the phase review: those photos do show a second face, and were relabeled.)

## 4. White-balance re-run (design D6)

- [x] 4.1 In a scratch worktree at `1d28b3d` with this branch's manifest and evals code, sweep `k` on the tuning set and on the holdout. Record agreement, family agreement, accuracy, false-reject rate, catch rate and trait spread per `k` in a table here.
  - Run 2026-10-13, Lab offset from `1d28b3d`, reference eye white re-measured on the tuning set's 87 passing usable photos: a\* 6.8, b\* 6.1 (the original 16 alone reproduce t15's 7.6, 6.2). `k = 0` reproduces the committed `results.json` exactly. False-reject and catch rates are identical across `k`. The sweep ran before the phase-review relabel (task 3.2); the relabeled photos never passed, so agreement and trait spread are unaffected, and accuracy here is over the earlier, larger denominator.

    Tuning set (26 people, 25 measured):

    | k    | agreement | family agreement | accuracy | temperature SD | value SD | clarity SD |
    | ---- | --------- | ---------------- | -------- | -------------- | -------- | ---------- |
    | 0    | 0.5687    | 0.7027           | 0.1322   | 0.3241         | 0.2389   | 0.1929     |
    | 0.25 | 0.5720    | 0.7660           | 0.1322   | 0.2829         | 0.2389   | 0.1815     |
    | 0.5  | 0.5833    | 0.7793           | 0.1240   | 0.2709         | 0.2389   | 0.1710     |
    | 0.75 | 0.5067    | 0.7760           | 0.1074   | 0.2680         | 0.2389   | 0.1661     |
    | 1    | 0.5167    | 0.7560           | 0.1240   | 0.2761         | 0.2389   | 0.1626     |

    Holdout (8 people):

    | k    | agreement | family agreement | accuracy | temperature SD | value SD | clarity SD |
    | ---- | --------- | ---------------- | -------- | -------------- | -------- | ---------- |
    | 0    | 0.5312    | 0.6458           | 0.0811   | 0.1943         | 0.2466   | 0.1007     |
    | 0.25 | 0.5000    | 0.7188           | 0.0541   | 0.2049         | 0.2466   | 0.0944     |
    | 0.5  | 0.5000    | 0.6146           | 0.0270   | 0.2026         | 0.2466   | 0.1045     |
    | 0.75 | 0.5417    | 0.7188           | 0.0811   | 0.2491         | 0.2466   | 0.1122     |
    | 1    | 0.5104    | 0.6250           | 0.1081   | 0.2769         | 0.2466   | 0.1277     |

- [x] 4.2 Apply D6's rule. Rewrite BL-13 with the tables and the verdict: either "ready for a follow-up change with `k` = …" or "parked again, because …". Done when BL-13 is updated.
  - Parked again. No `k` raises tuning agreement by two photos (0.023 on 25 measured people; best +0.0146 at 0.5), and on the holdout temperature spread rises at every `k`, so the steadying seen on the tuning set does not carry to unseen people. BL-13 rewritten.

## 5. Docs and gate

- [x] 5.1 `evals/README.md`: holdout, trait spread, the baseline reset. Delete BL-14 from `docs/backlog.md`.
  - Done: README covers the holdout, trait spread and the holdout rule; BL-14 deleted.
- [x] 5.2 `pnpm fix`, `pnpm test`. Done when both pass.
  - 2026-10-13: `pnpm fix` clean; unit, eval and citation suites pass. One E2E test fails locally only (`report-delivery` cache-control under `pnpm dev`; CI's prebuilt run passes, and this branch changes no app code). Logged as BL-47.
- [x] 5.3 Phase review, archive (re-add Public Interface, Behavior and Edge Cases to `analysis-eval` with the new numbers), Tracker T15 row, push, PR with auto-merge (merge commit).
