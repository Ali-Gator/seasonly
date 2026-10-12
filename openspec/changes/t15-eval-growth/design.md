## Context

The eval set has 16 people (10 light, 3 medium, 3 deep), 93 photos, 72 usable. `t6-eval-set` tuned the photo check and `SKIN_C` on all of them, so they cannot also judge later tuning (BL-14). `t15-white-balance` showed the set is too coarse: one photo moves agreement about 0.018, and the balance's whole effect was −0.03 to +0.03. Its code is parked in commit `1d28b3d`.

## Goals / Non-Goals

**Goals:**

- Grow the set with 18 people, 9 medium and 9 deep, approved by the user.
- Keep a holdout that no tuning sees.
- Report a continuous stability measure, trait spread, next to agreement.
- Re-run the white-balance sweep on the grown set and record whether it now earns its place.

**Non-Goals:**

- Shipping the white balance (a follow-up change to `color-sampling` if the sweep passes).
- Retuning the photo check, the trait midpoints or the reference points.
- Finding a warm/cool cue other than skin hue (BL-39).

## Decisions

### D1. Candidates: Commons, as in `t6-eval-set` design decision 5

Public figures with three to six free-licensed Commons photos in clearly different light (daylight, indoor, flash, stage, red carpet), each face at least about a tenth of the photo's long side, because the app scales to 1280 px and `MIN_FACE_WIDTH` is 120. Prefer event photos and candids to studio portraits. Seasons are proposed with a one-line reason, as these people are usually typed; all four families appear, autumn most. The user approves people, photos, labels and `expect` on a private review page that links each Commons file page. Hashes are computed only after approval.

Deep-skin photos are vetted by eye for exposure. The `dark` check produced most false rejects in `t6-eval-set`. If it rejects deep skin more than light skin on the grown set, that is a finding for the backlog. It is not tuned here.

### D2. Holdout: fixed by rule before the first run

New people only. Within each skin band (Monk-scale light, medium, deep, as judged on the review page), with the band's people sorted by surname, the 2nd, 4th, 6th… person is held out. The rule is written here and the `holdout` flags are written into the manifest in the same commit as the photos, before `eval:run` first sees them. A person never leaves the holdout because of a result.

The flag lives on each manifest entry (`holdout: true`), checked for consistency per person like `season`. A per-person list would need a second file or a manifest version bump for one boolean.

### D3. Metrics split, gate unchanged

`results.ts` calls `metricsOf` twice: on the tuning set's outcomes for `metrics`, and on the holdout's for `holdout`. The gate keeps reading `metrics`, so `gate.ts` and `baseline.json`'s shape do not change. Each person row gains `holdout: boolean`; `counts` stay over the whole set.

### D4. Trait spread

`PhotoOutcome` gains `traits: Traits | null`, set for a pass. `metricsOf` adds `traitSpread: { temperature, value, clarity } | null`: per measured person, the population standard deviation of each trait over their passing usable photos; then the mean over those people, rounded to four decimals. Population SD (divide by n) matches the "temperature SD" column in `t15-white-balance` task 4.2. `results.ts` never copies `traits` into the person table, so no single photo's trait reaches `results.json`.

### D5. Baseline reset

The first untuned run of the grown set's tuning set becomes `baseline.json`, with the user's approval asked together with the photo list. After that the usual ratchet holds.

### D6. The white-balance re-run

Check out the balance from `1d28b3d` into a scratch worktree, never onto this branch. Sweep `k ∈ {0, 0.25, 0.5, 0.75, 1}` on the tuning set with one-off runs (`EVAL_MANIFEST`/`EVAL_RESULTS`). A setting earns a follow-up change only if, on the tuning set, agreement rises by at least two photos' worth (2 × 0.29 / measured people) and temperature spread falls, with the false-reject and catch rates unchanged, and if on the holdout temperature spread falls and agreement falls by no more than one photo's worth (0.29 / measured holdout people, about 0.036 on 8). The holdout is too small for a stricter agreement test. The tables go into the tasks and into BL-13.

## Risks / Trade-offs

- **Celebrity seasons are contested.** → Agreement and trait spread need no label. The user approves every label.
- **Deep-skin photos may fail `dark` and leave people unmeasured.** → Vet exposure when picking. Drop wide shots where the face is under about a tenth of the frame, and second faces near the subject.
- **Commons files change.** → `eval:fetch` checks the hash and fails loudly, as today.
- **The holdout is small (8 people).** → It is a check against overfitting, not a precise score. Trait spread on it is continuous and still informative.
- **The baseline drops.** → Expected and approved up front. Today's numbers stay in `t6-eval-set`'s tasks for reference.
