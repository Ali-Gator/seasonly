## Context

See proposal.md for why. Triage ran on `origin/main` at `e13386f`. Five read-only Plan investigators ran in parallel, one per member. The BL-100 investigator measured the example photos with the eval's own extractor and `checkPhoto` through `node -e`, writing nothing. The reference parser for the gate members is `@fission-ai/openspec` 1.13.0, the global CLI at `/usr/local/lib/node_modules/@fission-ai/openspec`: `dist/core/specs-apply.js` (pre-validate :140-174, renames :268-308, removals :310-330).

| Id     | Lane  | Why                                                                                                 |
| ------ | ----- | --------------------------------------------------------------------------------------------------- |
| BL-101 | B + C | Three fixes, one Oleg's choice (Decision 1); the caption is copy no board had, drawn on canvas v62. |
| BL-100 | B + C | Three fixes, one Oleg's choice (Decision 2); the narrowed line is board copy, drawn on canvas v62.  |
| BL-99  | B     | Helper edit in the approved-only gate test file (Decision 3). No new behavior, no delta of its own. |
| BL-98  | B     | Same file (Decision 4). New `it`s only.                                                             |
| BL-97  | B     | Same file (Decision 5). New `it`s only.                                                             |

## Goals / Non-Goals

**Goals:** the sample pages stop presenting Soft Autumn draping as the sample face's result; the GPT-alternative page claims only the filters the check catches; the gate follows rename chains in one place, refuses what archive's RENAMED step aborts on, and proves a name a rename writes over through the moved block.

**Non-Goals:**

- No change to the sample season, its palette, its banner ("This is a sample Soft Autumn report"), the landing's Soft Autumn sample, or `SEASON_COPY`.
- No change to the photo check, `filter.webp`, the guide copy ("Filters shift skin tone"), `tips.ts`, or `/how-it-works`: its retake list names the `filter` reason, which exists.
- No beauty-filter detection: logged as BL-102, gated on data.
- No whole-change refusal for an aborting rename, matching the near-miss removal (`backlog-11` Decision 4, `backlog-13`): only the names the abort involves are dropped. Archive's "source not found" throw needs nothing, since the gate already makes nothing citable for such a rename.
- No change to `deltaAnchors(text, existing)` or `deltaProof(text, into, existing)` signatures, and no extraction of the helpers to a module.

## Members

Line numbers are at `e13386f`, a hint only; find helpers and `it`s by name or title. The gate members land in a fixed order, one editor at a time: BL-99, BL-98, then BL-97. If any existing `it`'s assertion, fixture or call turns out to need an edit, stop and ask Oleg; do not make it. Write every fixture's heading, rename and removal lines inside template strings in the test file, as the existing ones are.

### BL-101 — the sample face is labeled an example

`sample-report/page.tsx:11` drapes `SAMPLE_FACE` on `PALETTES["soft-autumn"].draping`, and `color-analysis-gpt-alternative/page.tsx:128-135` does the same under "Your face crop on your best and your worst color". The core reads the face Deep Autumn (`marketing/out/faces/faces.json`: `ex-face` deep-autumn 0.35; the file is byte-identical to `apps/web/public/images/examples/face.webp`, and the classifier has not changed since Oct 13). Add the approved caption after each `DrapingPair`, as a `<p className="caption">` in muted ink, matching boards 18 and 19. On `/sample-report` it goes inside the `draping` slot passed to `ReportSections`, so it sits in section 6; the phone's first screen (banner, season, palette, guarded by `e2e/design-review.spec.ts`) does not move. Cover both pages with one new `it` in `apps/web/src/lib/site-content/content.test.tsx`.

**Bullet correction:** the GPT-alternative page has the same defect; the bullet named only `/sample-report`.

### BL-100 — the GPT page claims only strong color filters

The `filter` check flags only skin no natural skin has (C\*ab below 2 or above 45, or hue outside −10° to 100° from C\*ab 6). `filter.webp` brightens skin by 21 L\*, drops C\*ab 20 to 13 and moves hue 56° to 50°: a lighter natural skin, next to real pale eval photos (p03/1 daylight, p14/1 flash). In `color-analysis-gpt-alternative/page.tsx:111`, change "tinted light, filters, a missing face" to "tinted light, strong color filters, a missing face". One new `it` in `content.test.tsx` asserts the new line and the absence of "tinted light, filters,".

**Bullet correction:** the photo guide promises no filter retake; it says only "Filters shift skin tone" (`steps.tsx:67-91`). The overclaim was the GPT page's line. Launch clip 07 (`scripts/marketing/render.ts:461-487`) relies on `filter.webp` passing with another season, so this fix keeps it.

### BL-99 — one record of each rename chain

`nearMisses` (:278) walks `appliedRenames`' pairs backward to drop a chain, and `deltaProof` (:395-400) builds its own forward `origin` map from the same pairs for `carried`. `appliedRenames` (:293-308) returns `{ pairs, held }`. Have it also return, for every name an accepted pair produced (held at the end or not), the chain of names that led to it, first name first. `nearMisses` drops the whole chain from it; `deltaProof` reads its first element for `carried`, and its `origin` map goes. Update the JSDoc of all three. Before the refactor, add one pinning `it`: a chain A to B to C plus a MODIFIED C leaves none of A's permanent scenario anchors proving A, and `carried` holds A. The existing suite, plus that `it`, proves no output changes.

**Bullet correction:** returning only the first name would match today's output only because `conflicts` drops any other entry naming a middle link; the whole chain keeps that from resting on `conflicts`. The chain must cover names a later rename moves away, which BL-98 needs.

### BL-98 — a rename archive aborts on makes nothing citable

Archive's RENAMED step (`specs-apply.js:275-288`) throws, aborting the archive, when the FROM is not held, the TO is held, and a held name other than the TO folds onto the FROM; and when both FROM and TO are held ("target already exists"). The FROM-not-held, TO-held case with no fold is the early-sync skip and stays a no-op. `appliedRenames` treats every refused pair as that skip. Detect both throws at the pair's own turn, against the running held set, and report the names involved (FROM, TO and, for the fold, the held name it found). `nearMisses` adds them to its dropped set, drops every chain ending at one of them back to its first name (BL-99's record), and loops to its fixed point as it does for a near-miss removal. A case-only rename (`foo` to `Foo`, `Foo` held, no other fold) stays a no-op. New rule `it`s: the fold shape (main {Foo, Bar}, `foo` to `Bar`, MODIFIED `Bar` with a new scenario), the target-exists shape (main {A, B}, A to B, MODIFIED B), and the case-only negative.

A check after the walk would miss a later rename moving the folded name away (main {A, Bar}: A to X, X to Foo, `foo` to Bar, Foo to Qux), so it runs at the pair's turn.

**Bullet correction:** the sibling "target already exists" throw fails open the same way and ships here (Decision 4). The bullet's line range is :275-283, not :274-282.

### BL-97 — a name a rename writes over is proven through the moved block

For A to B then C to A, archive leaves A holding C's block, but `deltaProof` sends only C to `gone` and adds no A entry to `replaced`, so `unprovenRequirements` proves A through A's permanent scenarios and takes A's permanent `unenforced` flag. Add a new `OpenDelta` field (per capability, a written-over name mapped to its chain's first name). `deltaProof` records a chain end when the name is in `existing`, its chain's first name is another name (a round trip never counts), it is still held, and no MODIFIED block names it (that case already goes through `replaced` and `carried`). `unprovenRequirements` proves such a name through its own heading's anchor plus the first name's permanent scenarios, and uses the first name's `unenforced` flag. Do not reuse `replaced` or `carried`: `resolvableAnchors` would then drop A's permanent scenario anchors, which still resolve after archive under B. `resolvableAnchors` and `deltaAnchors` do not change. One new rule `it`: citing only A's old scenario leaves A unproven, citing C's scenario proves A, and the flag follows C.

**Bullet correction:** the citation side is already right; the `resolvableAnchors` ref in the bullet is wrong.

## Canvas

Canvas https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3, version 62 (`1792321963-9b7e`), edited in place by the agent:

- **18 Sample report** (`SampleReport.dc.html`, 375): caption after the draping pair in section 6.
- **19 GPT alternative** (`GptAlternative.dc.html` 375, `GptAlternative-1280.dc.html` 1280): the same caption after the draping pair, and the photo-check line "…tinted light, strong color filters, a missing face and more than one face…".

**Approved:** Oleg, 2026-10-18, "as drawn".

## Decisions

### 1. BL-101 — how the sample stops claiming a season

- **Options:** (a) caption the draping pair as an example; (b) switch the sample to Deep Autumn: SampleReport board redrawn, new agreement note, landing copy rethought, six existing tests edited, and Deep Autumn copy ("dark hair, high contrast") that fits the light-brown-haired model poorly; (c) generate a new face the core reads Soft Autumn: paid (about $0.04 a try), new canvas approval, new mask.
- **Trade-off:** (a) is honest with no color, layout or test change but keeps a face whose real result differs; (b) is truthful and costly; (c) keeps everything but costs money and an unknown number of tries.
- **Recommendation:** (a), the smallest change that makes both pages honest.
- **Answer:** (a), caption "An AI-made example face, to show how draping looks. These colors are not her analyzed result." on both pages (Oleg, 2026-10-18).

### 2. BL-100 — what the filter example and claim mean

- **Options:** (a) narrow the GPT page's claim to "strong color filters" and log beauty-filter detection as gated; (b) tune the check: a three-way box (about L\* ≥ 75, C\*ab ≤ 15, hue ≤ 55) fitted to one synthetic photo, about 1 L\* from a real pale photo, unmeasurable by the eval, and it drops clip 07; (c) regenerate `filter.webp` with a stronger edit: paid, new canvas approval, and likely trips `tint` before `filter`; it drops clip 07 too.
- **Trade-off:** (a) changes one line and leaves detection for later; (b) and (c) make the example caught at the cost of overfitting or money.
- **Recommendation:** (a).
- **Answer:** (a); BL-102 logged (Oleg, 2026-10-18).

### 3. BL-99 — approve the chain refactor in the gate's helpers

- **What:** `appliedRenames` returns each produced name's whole chain; `nearMisses` and `deltaProof` read it; one new pinning `it`. Helper code and JSDoc only in `scripts/__tests__/spec-citations.test.ts`; no existing `it` changes.
- **Options:** approve; not now.
- **Shape (technical, decided in triage):** the whole chain rather than the bullet's first name only, for the reason under BL-99.
- **Recommendation:** approve.
- **Answer:** approved (Oleg, 2026-10-18).

### 4. BL-98 — approve the aborting-rename drop

- **What:** `appliedRenames` reports the names of both throwing shapes; `nearMisses` drops them and their chains; three new rule `it`s. No existing `it` changes; the one fixture with a target-exists pair (`Untested` to `Taken`, about :1190) keeps its assertions.
- **Options:** approve; not now.
- **Scope (technical, decided in triage):** widened to "target already exists" beside the bullet's fold shape, since both abort archive at the same site.
- **Recommendation:** approve.
- **Answer:** approved (Oleg, 2026-10-18).

### 5. BL-97 — approve the written-over proof

- **What:** a new `OpenDelta` field, read by `unprovenRequirements`; one new rule `it`. No existing `it` changes; `moveOnto` (about :1174) has no scenarios or citations and keeps its result.
- **Options:** approve; not now.
- **Shape (technical, decided in triage):** a new field, not `replaced`, for the reason under BL-97.
- **Recommendation:** approve.
- **Answer:** approved (Oleg, 2026-10-18).

## Risks / Trade-offs

- The caption keeps a face whose real result is another season; it says so instead of hiding it. A future sample face the core reads Soft Autumn would let the caption go.
- The spec-workflow delta is a whole-requirement MODIFIED: every existing scenario heading is copied verbatim, so the gate's own `replaced` rule keeps every `#scenario-…` citation of spec-workflow resolving while the change is open.
- BL-98 and BL-97 change which names the live gate holds, but `openspec/changes/` holds no other open change, so no live citation flips.
