## 1. Tracker

- [x] 1.1 Add a Tracker Log line naming `t4-report-text` and the branch, and say that BotID moved to `t5-analysis-flow` (proposal.md). T4 stays In progress until this change archives. Done when the Log shows the line.

## 2. Copy approval (user gate)

- [x] 2.1 Draft `SEASON_COPY` for the 11 seasons other than Soft Autumn, and `AGREEMENT_COPY` for `agree`, `differ`, `photo-only` and `quiz-only`.
  - Soft Autumn is the canvas copy verbatim, from `project/Report.dc.html` on https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3. The `agree` title is "Photo and quiz agree".
  - Each field stays within design.md decision 2's limits.
  - Each season's `neutralsIntro` matches its own neutrals in `PALETTES`, so no Winter is told to swap black away.
  - The `drapingLine` names the season's own draping pair.

  Publish it as a review page with each season's swatches beside its copy. Done when the user approves it in chat; record the date. Approved 2026-10-03 on https://claude.ai/artifact/TDo1Ca824cof8DpfkFMdLz.

## 3. Setup

- [x] 3.1 Add the dependencies:
  - `ai` and `@supabase/supabase-js` to `apps/web`;
  - `@electric-sql/pglite` as a root dev dependency.

  Check `generateText`, `Output.object`, the no-object error class, `maxRetries`, `abortSignal`, `providerOptions.gateway` and the mock language model in `ai/test` against `node_modules/ai/docs`, and fix design.md decisions 3 and 4 wherever a name differs. Done when `pnpm install` succeeds and design.md matches the installed API.

- [x] 3.2 Add `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `AI_GATEWAY_API_KEY` and `DAILY_ANALYSIS_CAP` (design.md decision 10) to:
  - `apps/web/.env.example`;
  - the catalogue table in `openspec/specs/env/spec.md`, edited directly because it sits in Purpose;
  - `PROBES` in `scripts/verify-env.ts`.

  First look in the Supabase dashboard for the project's key format, and set `SUPABASE_SECRET_KEY`'s shape to match. Done when `pnpm verify:env 1` lists all four and `scripts/__tests__/env.test.ts` passes.

## 4. Tests first

- [x] 4.1 Write `packages/analysis/src/report-text/report-text.test.ts`, citing `openspec/specs/report-text/spec.md` scenarios:
  - all 12 seasons have every field, non-empty and within limits;
  - the Soft Autumn strings equal the canvas;
  - all four agreement notes are within their limits, and the `agree` title is right.

  Done when the tests fail for the missing module.

- [x] 4.2 Write `apps/web/src/lib/report-text/report-text.test.ts`, citing the report-text scenarios. Use the `ai/test` mock model and `vi.mock("@sentry/nextjs")`. Cover:
  - one call for a valid answer;
  - one call and `invalid` for an over-long summary and for an unknown verdict;
  - one call and `failed` on a throw;
  - `timeout` after 20 s with fake timers;
  - no call for `capped` or `cap-unavailable`;
  - `rejected` for `several-faces`, and `personal` with `heavy-makeup`;
  - the request names Soft Autumn, carries exactly the given face crop as its one image, and sets `zeroDataRetention: true`;
  - one Sentry report naming the reason, followed by an awaited flush, for `invalid`; neither for `capped`.

  Done when the tests fail for the missing module.

- [x] 4.3 Write `apps/web/src/lib/abuse/daily-cap.test.ts`, citing `openspec/specs/abuse-controls/spec.md` scenarios. Use PGlite with the migration file, as in design.md decision 8. Cover:
  - claim 200 is granted and claim 201 refused, at cap 200;
  - yesterday's full row does not block today's first claim;
  - `anon` is refused both the claim and a select on the table, after Supabase's default grants are replayed (design.md decision 8);
  - a client call that never answers gives `unavailable` after 3 s;
  - `DAILY_ANALYSIS_CAP` unset or `lots` gives 200, and `350` gives 350;
  - a failing client gives `unavailable`.

  Done when the tests fail for the missing migration and module.

## 5. Code

- [x] 5.1 Add `packages/analysis/src/report-text/index.ts` and `copy.ts` with the approved copy from 2.1 (design.md decisions 1–2), and re-export from `packages/analysis/src/index.ts`. Done when 4.1 passes and the architecture-boundaries tests, including "loads in plain node", pass.
- [x] 5.2 Add `supabase/migrations/<timestamp>_daily_cap.sql` and `apps/web/src/lib/abuse/daily-cap.ts` (design.md decision 7). Done when 4.3 passes.
- [x] 5.3 Add `apps/web/src/lib/report-text/index.ts` with `generateReportText`, the prompt, the output schema and `REPORT_TEXT_MODEL` (design.md decisions 3–6). Re-check the model id against `https://ai-gateway.vercel.sh/v1/models` first. Done when 4.2 passes.
- [x] 5.4 Add `vitest.config.smoke.ts`, the root script `test:smoke` and `apps/web/src/lib/report-text/report-text.smoke.ts` (design.md decision 9). The config loads `apps/web/.env.local` with `process.loadEnvFile` (design.md decision 9). Do not run it. Done when `pnpm test:unit` does not pick up the smoke file.
- [x] 5.5 Run `pnpm fix` then `pnpm test`. Done when both are green.

## 6. External (each needs the user's yes in chat)

- [x] 6.1 Ask the user to:
  - put `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in Vercel (all environments) and in `apps/web/.env.local`;
  - enable AI Gateway on the Vercel project;
  - create a local `AI_GATEWAY_API_KEY`, optionally with a budget.

  Done when `pnpm verify:env 1` shows them `ok` locally.

- [x] 6.2 With the user's confirmation, apply the migration to the Supabase project `seasonly` (ref `qisseuermrrwvvnfyjet`) through the Supabase connector. Then run `select public.claim_analysis_slot(200)` once, expect `true`, and delete the row. Also run `set role anon; select public.claim_analysis_slot(1)` and expect a permission error. Done when the connector lists the migration, the table is empty and `anon` was refused.
- [ ] 6.3 With the user's confirmation and `evals/photos/smoke.jpg` in place, run `pnpm test:smoke` (three paid calls). Report to the user the kinds, verdicts, both strings and latencies, and whether the excluded topics stay out. If the model has no ZDR provider, pick the next vision model (design.md decision 6) and re-run with approval. Done when the user has seen the output and a Tracker Log line records it.
