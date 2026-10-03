## Why

The core already gives a season and its palette. The approved full report also has words: a tagline, why this season fits, what the photo and the quiz said, section intros, a hair tip and a draping line. The concept plans one vision-model call to write the personal part and to double-check the photo. Each call costs money, so the concept also asks for a daily cap on free analyses. `t5-analysis-flow` and `t5-report-delivery` need both before the flow can show a report. The Tracker's exit check for this change is: one vision call per analysis, schema-valid output, daily cap enforced.

## What Changes

- **Static season copy in the analysis core.** Every season-level string on the canvas report becomes data per season, next to the palettes. That is the tagline, a summary paragraph, undertone, chroma, contrast, the neutrals, metals and makeup intros, the hair tip and the draping line. There is also a note title and fallback body for each of the four photo/quiz agreement cases. Soft Autumn is the canvas copy, verbatim. Claude drafts the other 11 seasons and the four agreement fallbacks, and the user approves them before they are committed, as was done for the palettes.
- **One vision call per analysis.** A server function in `apps/web` sends the face crop, the classifier's result and the quiz answers to one model through the Vercel AI Gateway. The model returns three things:
  - a personal summary of the person's visible coloring;
  - a personal agreement-note body;
  - a verdict on the photo.

  The output is validated against a zod schema. Retries are off and the call has a time limit. Zero data retention is not requested: the Gateway offers it only on Vercel Pro, and the project stays on Hobby (decided 2026-10-03, after the smoke run was refused). The model never picks or changes the season; the deterministic classifier owns it.

- **The photo double-check.** The verdict is one of `ok`, `no-face`, `several-faces`, `filter` or `heavy-makeup`.
  - `no-face` and `several-faces` reject the analysis, so no report is shown and the flow asks for a retake.
  - `filter` and `heavy-makeup` keep the report and are returned so `t5` can record them for `t6-eval-set`.
- **Static fallback, never a blocked result.** The static season copy and the agreement fallback are used instead of the personal text in these cases:
  - the daily cap is reached;
  - the counter cannot be reached;
  - the call fails or times out;
  - the output fails the schema.

  The user still gets their season and palettes. Failures (not the cap) are reported to Sentry, so a broken key or model id cannot silently turn every report static.

- **Daily cap in Postgres.** A Supabase migration adds a per-UTC-day counter and one SQL function that claims a slot atomically and refuses past the cap. A slot is claimed before every vision call. The cap is 200 a day by default. It can be overridden by an env var, and changing that value takes a Vercel redeploy, though not a code change.
- **Moved to `t5-analysis-flow`: Vercel BotID.** The Tracker lists BotID under `abuse-controls` here. It protects the analyze route, which `t5` creates, and needs a client-side init next to that route. `t5` adds it as a requirement to `abuse-controls`.

## Capabilities

### New Capabilities

- `report-text`: the report's words. This covers the static per-season and per-agreement copy in the core, plus the one vision call that writes the personal summary and agreement note and double-checks the photo. It also covers the fallback to static copy.
- `abuse-controls`: the daily cap on vision calls (a Postgres counter claimed before each call). `t5` adds BotID on the analyze route.

### Modified Capabilities

None. The `env` catalogue table sits in its spec's Purpose, not in a requirement, so the new variables are added to it directly. Its requirements already cover them. `architecture-boundaries` holds: the core gains only data and a zod schema, and the AI SDK and Supabase client live in `apps/web`.

## Impact

- **Code**
  - `packages/analysis/src/report-text/`: copy data and the personal-text schema, re-exported from `src/index.ts`.
  - `apps/web/src/lib/report-text/`: the vision call.
  - `apps/web/src/lib/abuse/`: the slot claim.
  - `supabase/migrations/<ts>_daily_cap.sql`.
  - At archive, README rows go in for `packages/analysis/src/report-text/**`, `apps/web/src/lib/report-text/**` and `apps/web/src/lib/abuse/**`.
- **Dependencies**
  - `apps/web` gains `ai` and `@supabase/supabase-js`. `t5` needs the Supabase client for Storage and report rows anyway.
  - The root gains `@electric-sql/pglite` as a dev dependency, so a unit test runs the real migration SQL in-process.
  - The core gains nothing.
- **Env** (phase 1): `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `AI_GATEWAY_API_KEY` (local only; Vercel uses OIDC) and `DAILY_ANALYSIS_CAP` (optional). Each is added to the code, `.env.example`, the `env` catalogue and `scripts/verify-env.ts`.
- **External**
  - The migration is applied to the Supabase project `seasonly`, after the user confirms.
  - One paid smoke run on a sample photo, also after the user confirms.
- **Privacy, a T8 item:** the face crop is sent to a third-party model provider, Google via the Gateway, without zero data retention. The provider does not train on it, but may keep it for a limited time for abuse monitoring. The privacy page (`t8-photo-privacy`) must say so. Upgrading to Vercel Pro and setting `providerOptions.gateway.zeroDataRetention` restores it.
- **Downstream**
  - **`t5-analysis-flow`**:
    - Calls `generateReportText` after the photo check passes.
    - Uses static copy for quiz-only results, so no call is made without a photo.
    - Shows a retake on `no-face` and `several-faces`. No canvas copy exists for several faces, so it needs a tip approved on the canvas.
    - Sends PostHog events for the photo verdict and for each fallback reason.
    - Adds BotID.
  - **`t5-report-delivery`:** renders the copy and persists the personal text with the report.
  - **`t6-eval-set`:** compares verdicts with labels.
