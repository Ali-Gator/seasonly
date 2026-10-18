## 1. Spec deltas

- [x] 1.1 site-content delta (two added requirements: "The sample face is labeled an example" and "The GPT-alternative page names only the filters the photo check catches") — written in triage
- [x] 1.2 spec-workflow delta ("Citations are gated at every commit": a rename archive aborts on makes nothing it names citable or exempt; a name a rename writes another block over is proven through that block; two new scenarios) — written in triage
- [x] 1.3 canvas v62 boards 18 and 19 approved (design.md Canvas) — done in triage

## 2. Fixes — one subagent at a time, serially

Each task leaves the suite green before the next starts. Tasks 2.1–2.4 touch the site pages and add `it`s to `apps/web/src/lib/site-content/content.test.tsx`; no existing test changes. Tasks 2.5–2.10 edit `scripts/__tests__/spec-citations.test.ts`, as approved in design.md Decisions 3–5, in the fixed order BL-99, BL-98, BL-97. No existing `it`'s assertion, fixture or call changes; if one would, stop and ask Oleg.

- [ ] 2.1 BL-101 — failing test: `/sample-report` and `/color-analysis-gpt-alternative` each render "An AI-made example face, to show how draping looks. These colors are not her analyzed result." after the sample face's draping pair ({@link openspec/specs/site-content/spec.md#scenario-the-sample-draping-pair-is-captioned}). Verify it fails.
- [ ] 2.2 BL-101 — add the caption as a muted `<p className="caption">` after each `DrapingPair` on the sample face: inside the `draping` slot in `apps/web/src/app/(site)/sample-report/page.tsx`, and after the pair in `apps/web/src/app/(site)/color-analysis-gpt-alternative/page.tsx` (design.md BL-101, canvas v62), until 2.1 passes. The banner and the phone's first screen do not change.
- [ ] 2.3 BL-100 — failing test: the GPT-alternative page's photo check section says "low light, tinted light, strong color filters, a missing face and more than one face" and holds no "tinted light, filters," ({@link openspec/specs/site-content/spec.md#scenario-the-photo-checks-filter-claim}). Verify it fails.
- [ ] 2.4 BL-100 — change "filters" to "strong color filters" in `apps/web/src/app/(site)/color-analysis-gpt-alternative/page.tsx` (design.md BL-100), until 2.3 passes.
- [ ] 2.5 BL-99 — new pinning rule test, passing before and after: permanent A with a scenario, a delta renaming A to B then B to C and modifying C with a new scenario; `deltaProof`'s `carried` holds A, and a test citing A's permanent scenario is stale, since archive writes the modified block over A's ({@link openspec/specs/spec-workflow/spec.md#scenario-a-chain-of-renames-in-one-delta}). Verify it passes on the unchanged helpers.
- [ ] 2.6 BL-99 — `appliedRenames` also returns, for every name an accepted pair produced (held at the end or not), its chain first name first; `nearMisses` drops the whole chain from it instead of walking pairs backward; `deltaProof` reads the chain's first name for `carried` and drops its `origin` map; JSDoc of all three updated (design.md BL-99). Done when every `it` passes unchanged.
- [ ] 2.7 BL-98 — failing rule tests: (a) permanent {Foo, Bar}, `foo` to `Bar` plus MODIFIED `Bar` adding a scenario a test cites: the citation is stale and Bar and Foo are reported unproven; (b) permanent {A, B}, A to B plus MODIFIED B adding a cited scenario: stale, A and B unproven; (c) negative: permanent Foo, `foo` to `Foo` with no other fold stays a no-op; (d) the scenario of (a) when a later rename moves the folded name away (permanent {A, Bar}: A to X, X to Foo, `foo` to Bar, Foo to Qux) still drops ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-archive-aborts-on}). Verify (a), (b) and (d) fail.
- [ ] 2.8 BL-98 — `appliedRenames` detects both throwing shapes at the pair's turn against the running held set and reports FROM, TO and the folded held name; `nearMisses` adds them to its dropped set, drops every chain ending at one of them via 2.6's record, and loops to its fixed point; JSDoc cites `specs-apply.js:275-288` (design.md BL-98, Decision 4). Done when 2.7 passes and every other `it` passes.
- [ ] 2.9 BL-97 — failing rule test: permanent A and C, each with a scenario, delta A to B then C to A; a test citing only A's old scenario resolves and leaves A unproven; a test citing C's scenario proves A; with C marked unenforced and A not, A needs no citing test, and with A marked and C not, A does ({@link openspec/specs/spec-workflow/spec.md#scenario-a-rename-onto-a-name-the-same-delta-frees}). Verify it fails.
- [ ] 2.10 BL-97 — a new `OpenDelta` field mapping a written-over name to its chain's first name, filled by `deltaProof` under design.md BL-97's four conditions, read by `unprovenRequirements` for proof (own heading's anchor plus the first name's permanent scenarios) and the `unenforced` flag; `replaced`, `carried`, `resolvableAnchors` and `deltaAnchors` unchanged (design.md BL-97, Decision 5). Done when 2.9 passes and every other `it` passes.

## 3. Verify, delete, review, archive, ship

- [ ] 3.1 `pnpm fix`, then `pnpm test`; both green
- [ ] 3.2 delete shipped bullets BL-97, BL-98, BL-99, BL-100, BL-101 from `docs/backlog.md`
- [ ] 3.3 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [ ] 3.4 archive (`/opsx:archive` flow, no Tracker), preflight, push, PR, auto-merge
