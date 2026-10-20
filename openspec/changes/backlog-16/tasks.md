## 1. Spec deltas

- [x] 1.1 `capture-flow` delta — "The landing's camera link opens the flow on the camera" keeps the rest of the address and requires Next's router to hold it; written in triage
- [x] 1.2 `spec-workflow` delta — "Citations are gated at every commit" names the numbers an anchor keeps; written in triage

## 2. Fixes — one subagent at a time, serially

- [x] 2.1 BL-105 — failing rule `it` in `scripts/__tests__/spec-citations.test.ts`, beside "slugs keep combining marks": a heading holding ² and ½ is anchored without them, a citation with them kept does not resolve, and Ⅻ stays ({@link openspec/specs/spec-workflow/spec.md#scenario-a-heading-that-holds-a-superscript-or-a-fraction}). Approved gate-file edit, design.md Decision 3
- [x] 2.2 BL-105 — `slugify`'s kept class `\p{N}` → `\p{Nd}\p{Nl}` and its JSDoc, same file, until 2.1 passes. No existing `it`, fixture or call changes
- [x] 2.3 BL-95 — failing tests: in `apps/web/src/app/(flow)/analyze/flow.dom.test.tsx`, `/analyze?start=camera&utm_source=tiktok#guide` leaves `/analyze?utm_source=tiktok#guide` ({@link openspec/specs/capture-flow/spec.md#scenario-other-parameters-and-the-hash-are-kept}); in `e2e/analysis-flow.spec.ts`, for the landing tap and for a fresh load, `window.next.router.refresh()` keeps the address at `/analyze` and the capture step shown ({@link openspec/specs/capture-flow/spec.md#scenario-a-router-refresh-after-opening-on-the-camera}), and the fresh-load case with extra query and hash. Confirm the router-refresh e2e cases fail before 2.4. New tests only
- [x] 2.4 BL-95 — `apps/web/src/app/(flow)/analyze/flow.tsx`: strip target keeps path, other query and hash; after the strip, sync Next's router with a `replaceState` whose state drops `__NA`, `_N` and `__PRIVATE_NEXTJS_INTERNALS_TREE`, once Next has patched history (design.md "BL-95"); comment above the effect loses its BL-95 sentence. Until 2.3 passes and every existing `flow.dom.test.tsx`, `e2e/analysis-flow.spec.ts` and `e2e/funnel.spec.ts` case still passes unchanged
- [x] 2.5 BL-95 — rewrite the `?start=camera` Behavior bullet in `openspec/specs/capture-flow/spec.md` (:70) to describe the kept address and the router sync, without "(BL-95)"
- [x] 2.6 BL-18 — in `openspec/specs/data-retention/spec.md` (:50), replace "(BL-18, deferred until Vercel Pro or before paid promotion)" with "(accepted, 2026-10-20)"

## 3. Verify, delete, review, archive, ship

- [ ] 3.1 `pnpm fix`, then `pnpm test`, then `pnpm test:eval`; all green. Run the BL-95 e2e cases locally (`pnpm test:e2e`) since only the browser proves the router sync
- [ ] 3.2 delete shipped and dropped bullets BL-18, BL-19, BL-95 and BL-105 from `docs/backlog.md`
- [ ] 3.3 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [ ] 3.4 archive (`/opsx:archive` flow, no Tracker), preflight, push, PR, auto-merge
