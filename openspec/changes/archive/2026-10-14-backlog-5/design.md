## Context

See proposal.md for why. Triage ran on `origin/main` at `0c1d4d9`. Six read-only Plan investigators ran in parallel: BL-22, BL-53, BL-16, BL-60, the local-E2E cluster (BL-12, BL-47, BL-21, BL-31) and BL-59. Every decision was settled with Oleg on 2026-10-14. No canvas design is involved.

| Id    | Lane   | Why                                                                                                                                          |
| ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| BL-16 | A      | One content part in one file; the existing shape test already reads the converted `file` part. New test only.                                |
| BL-60 | B      | Two union shapes; the strict one edits one fixture line (Decision 2).                                                                        |
| BL-12 | B      | Next dev overwrites `Cache-Control` after config headers and proxy, so no app fix survives dev; the fix edits an existing test (Decision 3). |
| BL-31 | B      | The page cache answers before the page's case check on macOS; the fix edits an existing test (Decision 4).                                   |
| BL-59 | A      | Config only (`playwright.config.ts`, spec-exempt); a technical call with a pre-decided fallback.                                             |
| BL-22 | retire | Both of its questions are answered "no" from the code; no app cause for the 503 (below).                                                     |
| BL-47 | retire | Same defect as BL-12 (BL-12 is the original, 2026-10-09).                                                                                    |
| BL-21 | retire | Its two halves are BL-31 (case path) and BL-12 (header).                                                                                     |
| BL-53 | D      | Feature-sized; Oleg chose its own change (Decision 1). Its bullet's premise is wrong (below).                                                |

## Goals / Non-Goals

**Goals:** `pnpm test` reads green on a Mac (dev mode) while CI keeps enforcing every assertion it does today; the vision call stops logging a deprecation warning; the photo check's type stops a stand-in from passing a photo without traits.

**Non-Goals:**

- No app-side `Cache-Control` header for the report-500 page: in production Next already sends `private, no-cache, no-store, max-age=0, must-revalidate`, and a config header would only override that for nothing.
- No `proxy.ts` enforcing slug case: production and Linux CI already answer 404; the spec's Edge Cases already document the macOS `next start` quirk.
- No local E2E against a production build: a full build on every `pnpm test`, and BL-31 would fail on every Mac run.
- The 30 s reveal assertion (`e2e/analysis-flow.spec.ts:78`, season-reveal "Landing to reveal in under 30 seconds") is not loosened.
- BL-53 (background removal) is not in this batch.

## Members

### BL-16 — the face crop as a `file` part

`apps/web/src/lib/report-text/index.ts:170`: `{ type: "image", image: faceCrop, mediaType: "image/jpeg" }` → `{ type: "file", data: faceCrop, mediaType: "image/jpeg" }`. `ai@7.0.127` already converts the old part to exactly this (`convertImagePartToFilePart`), so what reaches the provider does not change; only the warning stops. `scripts/generate-photos.ts:137,158` already use the new form. The existing "carries exactly the face crop" test (`report-text.test.ts:207-219`) reads the converted prompt and passes before and after, so it cannot catch a regression: a new `it` sets `globalThis.AI_SDK_LOG_WARNINGS` to a spy (restored after) and asserts no logged warning mentions `deprecated`. It fails before the fix. Files: `index.ts`, `report-text.test.ts`.

### BL-60 — `PhotoCheck` as a union

`packages/analysis/src/photo-check/index.ts:46-51` becomes `type PhotoCheck = { problem: null; measures: PhotoMeasures; traits: Traits } | { problem: PhotoProblem; measures: PhotoMeasures; traits?: never }` (Decision 2). The `result` helper (`index.ts:94`) is only ever called with a real problem, so its parameter narrows to `PhotoProblem`; the pass return at `:107` already sets traits. `checkImage` (`apps/web/src/lib/capture/photo.ts:93`) and the eval's `analyze` (`evals/pipeline.ts:113`) narrow to the pass case after their problem guards, so their `?? null` goes. `photo-check.test.ts:229,236` still typecheck under `traits?: never`. New `it` in `photo-check.test.ts` with two `// @ts-expect-error` lines (a pass without traits, a `dark` with traits); `pnpm typecheck` fails before the fix because the directives are unused. `evals/pipeline.test.ts:123`'s `dark` stand-in spreads a passing check, traits included, which the strict type refuses: it becomes `({ measures: checkPhoto(input).measures, problem: "dark" })` (approved). The `PhotoCheck` block in `openspec/specs/photo-check/spec.md` Public Interface is edited by hand to the union (archive replaces requirements only). Files: `index.ts`, `photo-check.test.ts`, `photo.ts`, `evals/pipeline.ts`, `evals/pipeline.test.ts`, `openspec/specs/photo-check/spec.md`.

### BL-12 — the report-500 header only against the build

Next 16.3.8 in dev sets `Cache-Control: no-cache, must-revalidate` unconditionally (`app-page-runtime.js:1017-1018`, `if (routeModule.isDev)`), after `next.config` headers and any proxy. `e2e/report-delivery.spec.ts:111`, the header assertion in "answers a report it cannot read with 500 and the reload page", runs only when `process.env.CI` is set — the same switch `playwright.config.ts` uses for `PREBUILT`. The 500 status, the heading and Reload stay checked in both modes. CI (`e2e.yml` sets `CI: "1"`) still enforces `report-page` "A report is never kept by a shared cache". Files: `e2e/report-delivery.spec.ts`.

### BL-31 — the wrong-case slug on macOS

With a prebuilt server, Next reads the page cache by raw pathname before the `dynamicParams` 404; on case-insensitive APFS `seasons/Soft-Autumn.html` finds `soft-autumn.html` and answers 200. The `not found` loop in `e2e/site-structure.spec.ts:66-73` skips only the `/seasons/Soft-Autumn` case when `process.platform === "darwin"`, any server mode (Decision 4); `/pricing`, `/seasons/autumn` and `/r/unknown` still run everywhere, and Linux CI keeps the wrong-case case. The skip's reason names the spec's Edge Case. Files: `e2e/site-structure.spec.ts`.

### BL-59 — local E2E on at most 2 workers

`workers` is unset, so Playwright runs half the logical CPUs (4 on an 8-core Mac) against one on-demand-compiling `next dev`. `playwright.config.ts` sets `workers: PREBUILT ? undefined : 2`; CI is unchanged. The failures are in-test limits (the 30 s reveal assertion, `funnel.spec.ts`'s 20 s `POLL`), not the test timeout, so raising `timeout` would not help. **Fallback, decided now:** if the verify run (task 3.1) is still flaky at 2, use 1. If the 30 s reveal assertion still fails at 1, leave it, keep 1, and log a new BL item; do not loosen the assertion. Files: `playwright.config.ts`.

### Retire — BL-22

Both questions the bullet asks are answered from the code, and the answer to both is no.

- **No early fetch.** Nothing in `apps/web/src` prefetches `/r/`; the one navigation is `router.push` in `_email/step.tsx:157`, after `POST /api/reports/<id>/email` answers ok or 429. That route's RPC selects the report row `for update` and answers 404 (no navigation) when it is missing, so the row was readable when the RSC request ran.
- **The app cannot answer 503.** No middleware or proxy, no route builds a 503, Next 16.3.8 has none.
- **No visible error.** On a non-ok RSC response Next falls back to a full page load (`fetch-server-response.js:143-148`), which matches the capture: one 503, then the page loaded. Sentry has no `/r/` event on 2026-10-10.

The 503 most likely came from Vercel's platform on the preview; its logs are past Hobby's retention. **Reopen** as a new item if a 503 recurs, with the response's `x-vercel-id` and `x-vercel-error` headers.

### Retire — BL-47, BL-21

BL-47 is BL-12 again (same test, same header). BL-21's first half is BL-31 and its second half is BL-12. All three bullets go once BL-12 and BL-31 ship.

### Parked — BL-53, and its wrong premise

The bullet says "the hair segmenter the photo check loads can make the mask". It cannot: `hair_segmenter.tflite` is two-class (hair vs everything else), so face, neck, clothes and wall are one class. The mask has to come from MediaPipe's multiclass selfie segmenter, the face-oval landmark contour joined with the hair mask, or a second person segmenter. The crop path is JPEG-only end to end (`photo.ts` encoder, `request.ts` type and magic-byte checks, `crops.ts` content type, the bucket's `allowed_mime_types`, the face route, the Gemini `mediaType`), so a transparent background needs an alpha format. Its status line now names these blockers.

## Decisions

### 1. BL-53 — background removal on the draping crop: this batch or its own change

- (a) Own change later (Recommended): needs a privacy sign-off, a new mask source (the hair segmenter cannot separate face from wall), a crop format change (JPEG has no alpha), canvas boards 10/18 redrawn, existing test edits in 4 files, and a paid `pnpm eval:vision` run. Too big for a serial backlog batch and would push it past 5 fixes.
- (b) Fold into this batch: resolve all four sub-decisions and the canvas now; drops BL-31 to stay at 5 (lowest value once BL-12 makes dev-mode `pnpm test` green).

**Answer:** (a) Own change later (Oleg, 2026-10-14). BL-53 is parked as lane D with its real blockers on its status line.

### 2. BL-60 — shape of the PhotoCheck union

- (i) Strict (Recommended): pass `{problem: null; traits: Traits}`, fail `{problem: PhotoProblem; traits?: never}`. Type enforces both halves of "A photo that passes can be sampled". Costs a one-line edit to `evals/pipeline.test.ts:123`: its `dark` stand-in spreads a passing check (traits included); it drops the traits.
- (ii) Loose: fail keeps `traits?: Traits`. No test edit; a rejected result may still carry traits in the type.

**Answer:** (i) Strict, edit `evals/pipeline.test.ts:123` (Oleg, 2026-10-14).

### 3. BL-12 — report-500 Cache-Control under `pnpm dev`

Next 16 dev overwrites Cache-Control after config headers and proxy, so no app fix survives dev.

- (a) Guard only the header line in `e2e/report-delivery.spec.ts` ("answers a report it cannot read with 500 and the reload page", line 111) to prebuilt mode (`process.env.CI`) (Recommended): status, heading, Reload still checked locally; CI still enforces the header.
- (b) Run local E2E against a build: every `pnpm test` does a full `next build`, overwrites `apps/web/.next` with E2E env, and makes BL-31 fail on every Mac run.
- (c) `grepInvert` the whole test in dev via config: no spec-file edit, but loses the 500/heading checks locally.

**Answer:** (a) Guard only the header line to prebuilt mode (Oleg, 2026-10-14).

### 4. BL-31 — `/seasons/Soft-Autumn` 200 on macOS

Next's page cache reads `Soft-Autumn.html` from a case-insensitive disk before the page's case check; prod and CI answer 404. Spec site-structure already documents it (Edge Cases).

- (a) Skip only that one case in the `e2e/site-structure.spec.ts` loop (lines 66–73) on darwin, any server mode (Recommended). Linux CI still enforces it.
- (b) New `apps/web/src/proxy.ts` enforcing exact slug case: runtime code on every `/seasons/*` request in prod for a local-only quirk.

**Answer:** (a) Skip only the `/seasons/Soft-Autumn` case on darwin, any server mode (Oleg, 2026-10-14).

## Risks / Trade-offs

- [The header and wrong-case checks no longer run on a Mac] → CI runs both on every push; the guards name their reason.
- [2 workers makes a local run slower] → only locally; the fallback to 1 is pre-decided.
- [The `@ts-expect-error` test proves nothing if typecheck stops covering `packages/*/src/**/*.test.ts`] → the root `tsconfig.json` includes it today, and `pnpm typecheck` runs in the pre-commit hook and CI.
