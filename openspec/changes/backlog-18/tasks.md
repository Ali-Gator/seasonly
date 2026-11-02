## 1. Spec deltas

- [x] 1.1 `chat-plugin`, `quiz-page`, `report-text`, `capture-flow` deltas — written in triage

## 2. Fixes — one subagent at a time, serially

- [x] 2.1 BL-114 — failing test in `apps/web/src/app/api/mcp/route.test.ts`: a 2026-07-28 `subscriptions/listen` (with its `_meta` envelope and `mcp-protocol-version` and `mcp-method` headers) ends at once and honors neither flag ({@link openspec/specs/chat-plugin/spec.md#scenario-a-subscription-request-ends-at-once})
- [x] 2.2 BL-114 — pass `capabilities` with `listChanged: false` for tools and resources in `apps/web/src/app/api/mcp/route.ts`, update its doc comment, until 2.1 passes
- [x] 2.3 BL-111 — failing test for the two new sentences ({@link openspec/specs/quiz-page/spec.md#scenario-the-selfie-section-names-the-button-that-keeps-the-answers})
- [x] 2.4 BL-111 — change the line and the FAQ answer in `apps/web/src/app/(site)/color-analysis-quiz/page.tsx`, until 2.3 passes
- [x] 2.5 BL-112 — failing test with `usePathname` mocked: no quiz row on `/color-analysis-quiz`, the row on any other path ({@link openspec/specs/quiz-page/spec.md#scenario-the-footer-on-the-quiz-page})
- [x] 2.6 BL-112 — client leaf beside `apps/web/src/components/site-chrome.tsx`, wrapping only the quiz row, until 2.5 passes; confirm in `pnpm build` output that `/color-analysis-quiz` stays static
- [x] 2.7 BL-110 — failing test for both exact lines ({@link openspec/specs/report-text/spec.md#scenario-the-soft-seasons-makeup-lines-name-shades})
- [x] 2.8 BL-110 — change both lines in `packages/analysis/src/report-text/copy.ts`; edit the existing test `packages/analysis/src/report-text/report-text.test.ts:45` to the new Soft Autumn line (approved, Decision 3), until 2.7 passes
- [x] 2.9 BL-108 — failing test in `apps/web/src/app/(flow)/analyze/flow.dom.test.tsx`: the sync's `replaceState` has run after one microtask turn following mount ({@link openspec/specs/capture-flow/spec.md#scenario-the-router-sync-runs-before-a-replayed-tap})
- [x] 2.10 BL-108 — `queueMicrotask` with a cancel flag in `apps/web/src/app/(flow)/analyze/flow.tsx` and its comment, until 2.9 passes and the StrictMode test stays green; edit only the comment at `e2e/analysis-flow.spec.ts:220-222` (approved, Decision 4)

## 3. Verify, delete, review, archive, ship

- [x] 3.1 `pnpm fix`, `pnpm test`, `pnpm test:eval`; only if it says `results.json is stale`, run `pnpm eval:run`, commit `evals/results.json`, re-run
- [x] 3.2 Delete shipped bullets BL-114, BL-111, BL-112, BL-110, BL-108 from `docs/backlog.md`
- [x] 3.3 `/code-review high` in a fresh subagent; fix, log the rest as new BL items
- [ ] 3.4 Update the permanent specs' non-requirement text, which archive leaves alone: `chat-plugin` Contract endpoint line; `quiz-page` edge cases (remove BL-112; restate BL-111 as "Find my colors in the selfie section is a plain `/analyze` link and keeps no answers"); `site-content` edge case (remove BL-110); `capture-flow` Behavior (`setTimeout(sync, 0)` becomes the microtask, with its reasoning)
- [ ] 3.5 Archive (`/opsx:archive` flow, no Tracker), preflight, push, PR, auto-merge with a merge commit; in the PR, say the `/api/mcp` check is the `get_runtime_errors` cluster staying empty for about nine days
