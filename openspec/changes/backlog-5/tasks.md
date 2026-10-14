## 1. Spec deltas

- [x] 1.1 `report-text` delta (the crop is sent as a file; no deprecation warning) — written in triage
- [x] 1.2 `photo-check` delta (the result type refuses a traitless pass and a traited rejection) — written in triage

## 2. Fixes — one subagent at a time, serially

- [x] 2.1 BL-16 — new failing `it` in `apps/web/src/lib/report-text/report-text.test.ts`: with `globalThis.AI_SDK_LOG_WARNINGS` set to a spy (restored after; a function logger is called on every call, no dedup, with `{ warnings, provider, model }`), no logged warning has `type: "deprecated"` ({@link openspec/specs/report-text/spec.md#scenario-no-deprecation-warning}). No existing test changes. Verify it fails on the current code.
- [x] 2.2 BL-16 — `apps/web/src/lib/report-text/index.ts:170` becomes `{ type: "file", data: faceCrop, mediaType: "image/jpeg" }`, until 2.1 passes and "carries exactly the face crop" stays green.
- [ ] 2.3 BL-60 — new `it` in `packages/analysis/src/photo-check/photo-check.test.ts` with two `// @ts-expect-error <reason>` lines (a description is required by `ban-ts-comment`) assigned to `_`-prefixed `PhotoCheck` bindings: `{ problem: null, measures }` (no traits) and `{ problem: "dark", measures, traits }` ({@link openspec/specs/photo-check/spec.md#scenario-the-type-refuses-a-pass-without-traits}). Verify `pnpm typecheck` fails on the current code (unused directives).
- [ ] 2.4 BL-60 — edit the existing test (approved, design.md Decision 2): `evals/pipeline.test.ts:123`'s stand-in becomes `vi.fn<typeof checkPhoto>((input) => ({ measures: checkPhoto(input).measures, problem: "dark" }))`; its assertions and citation stay.
- [ ] 2.5 BL-60 — `packages/analysis/src/photo-check/index.ts:46-51` becomes the union (pass: `problem: null`, `traits: Traits`; rejection: `problem: PhotoProblem`, `traits?: never`), keeping the doc comment's sense; the `result` helper (`:94`) takes `PhotoProblem`. Drop the `?? null` at `apps/web/src/lib/capture/photo.ts:93` and `evals/pipeline.ts:113`. Hand-edit the `PhotoCheck` block in `openspec/specs/photo-check/spec.md` Public Interface to the union. Until 2.3 typechecks and `pnpm test:unit` is green.
- [ ] 2.6 BL-12 — edit the existing test (approved, design.md Decision 3): in `e2e/report-delivery.spec.ts` "answers a report it cannot read with 500 and the reload page", only the `cache-control` assertion (`:111`) runs when `process.env.CI` is set, with a one-line comment naming Next dev's header override; status, heading and Reload stay unconditional; the citation stays.
- [ ] 2.7 BL-31 — edit the existing test (approved, design.md Decision 4): in `e2e/site-structure.spec.ts`'s `not found` loop (`:66-73`), the `/seasons/Soft-Autumn` case calls `test.skip(process.platform === "darwin", …)` with a reason naming site-structure's Edge Case (a case-insensitive disk serves the prerendered page); the other three paths and the citations stay.
- [ ] 2.8 BL-59 — `playwright.config.ts`: `workers: PREBUILT ? undefined : 2`, with a one-line comment (one `next dev` compiles on demand). Fallback per design.md BL-59: still flaky at 2 → 1; the 30 s reveal assertion still failing at 1 → keep 1, log a new BL item, never loosen it.

## 3. Verify, delete, review, archive, ship

- [ ] 3.1 `pnpm fix`, `pnpm test` (local, dev mode: expect E2E green on a Mac; apply the BL-59 fallback if not)
- [ ] 3.2 delete shipped bullets BL-16, BL-60, BL-12, BL-31, BL-59, BL-22, BL-47, BL-21 from `docs/backlog.md`
- [ ] 3.3 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [ ] 3.4 archive (`/opsx:archive` flow, no Tracker), preflight, push, PR, auto-merge
