## Context

`packages/analysis` returns a `SeasonResult` from `classify()`: the season, the runner-up, a confidence, an agreement case (`agree`, `differ`, `photo-only` or `quiz-only`) and the traits. It also returns `PALETTES` and `RETAKE_TIPS`. `architecture-boundaries` limits the core to the standard library and `zod`. An import of `ai`, `@ai-sdk/*` or `@supabase/*` there fails lint.

`apps/web` has no server code that calls a service yet. Its `lib/observability` wraps route handlers for Sentry. `supabase/migrations/` holds only the empty init migration. The Supabase project `seasonly` exists (ref `qisseuermrrwvvnfyjet`), with no tables.

The approved canvas report (`project/Report.dc.html` on https://claude.ai/artifact/Q83bgjLjtYk2sS1ovCffy3) shows two kinds of words:

- **Season-level:**
  - the tagline "Warm, soft and earthy.";
  - the summary paragraph;
  - Undertone, Chroma and Contrast;
  - the neutrals intro "Swap black and stark white for these…", which is wrong for a Winter, whose best colors include black;
  - the metals and makeup intros;
  - the hair tip;
  - the draping sentence.
- **Personal:** the agreement note's body, "Green veins and gold jewelry point warm. Your soft brown hair and hazel eyes point muted."

The other section intros ("Wear these near your face…", "Keep them away from your face…") are the same for every season. They stay page copy for `t5-report-delivery`.

`ai` is at 7.x and is not installed. Every SDK name below (`generateText`, `Output.object`, the mock model in `ai/test`) must be checked against `node_modules/ai/docs` after install.

Motivation: proposal.md. Requirements: `specs/report-text/spec.md` and `specs/abuse-controls/spec.md`.

## Goals / Non-Goals

**Goals:**

- The model writes as little as possible: a summary, an agreement note and a verdict. Everything else is fixed copy. A fallback report is then almost the same as a personal one, and fewer fields can fail validation.
- Every way to fall back is a returned value, not a thrown error, so `t5` maps each one to an event without try/catch.
- The cap's SQL is tested as SQL, not through a stub.

**Non-Goals:**

- The analyze route, BotID, uploads and PostHog events. All are `t5`.
- Persisting the personal text, which `t5-report-delivery` does with the report row.
- Text for quiz-only results. They have no photo, so `t5` uses the fixed copy and makes no call.
- Streaming. The reveal waits for the whole result anyway.
- Choosing a model by experiment. That is `t6-eval-set` territory.

## Decisions

### 1. Files

```
packages/analysis/src/report-text/
  index.ts             types, COPY_LIMITS, re-exports
  copy.ts              SEASON_COPY, AGREEMENT_COPY
  report-text.test.ts
apps/web/src/lib/report-text/
  index.ts             generateReportText, the prompt, the output schema, REPORT_TEXT_MODEL
  report-text.test.ts
  report-text.smoke.ts the paid smoke run (not a unit test; see decision 9)
apps/web/src/lib/abuse/
  daily-cap.ts         claimAnalysisSlot, dailyCap
  daily-cap.test.ts    env parsing, unavailable, and the migration's SQL in PGlite
supabase/migrations/<timestamp>_daily_cap.sql
vitest.config.smoke.ts
```

The copy goes in the core so that season pages (T9) and the plugin (T12) show the same words as the report, as palettes already do. The call and the client go in `apps/web`, because the boundary forbids them in the core. The output schema goes next to the call because only the model's output uses it.

- Alternative: everything in `apps/web`. Rejected, because season pages and the plugin would then copy the season text.

### 2. Core interface

```ts
interface SeasonCopy {
  tagline: string;
  summary: string;
  undertone: string;
  chroma: string;
  contrast: string;
  neutralsIntro: string;
  metalsIntro: string;
  makeupIntro: string;
  hairTip: string;
  drapingLine: string;
}
interface AgreementCopy {
  title: string;
  body: string;
}
const SEASON_COPY: Record<SeasonSlug, SeasonCopy>;
const AGREEMENT_COPY: Record<Agreement, AgreementCopy>;
const COPY_LIMITS: { [K in keyof SeasonCopy | "noteTitle" | "noteBody"]: number };
```

Limits, in characters. Soft Autumn's canvas copy fits each limit with room to spare:

| Field                                   | Limit |
| --------------------------------------- | ----- |
| tagline                                 | 60    |
| summary                                 | 600   |
| undertone, chroma, contrast             | 40    |
| neutralsIntro, metalsIntro, makeupIntro | 160   |
| hairTip                                 | 160   |
| drapingLine                             | 120   |
| noteTitle                               | 40    |
| noteBody                                | 240   |

`Record<SeasonSlug, …>` and `Record<Agreement, …>` make a missing entry a compile error, as `PALETTES` does.

### 3. Web interface

```ts
type PhotoVerdict = "ok" | "no-face" | "several-faces" | "filter" | "heavy-makeup";
type FallbackReason = "capped" | "cap-unavailable" | "failed" | "timeout" | "invalid";
type ReportTextResult =
  | {
      kind: "personal";
      summary: string;
      agreementNote: string;
      photo: "ok" | "filter" | "heavy-makeup";
    }
  | { kind: "static"; reason: FallbackReason }
  | { kind: "rejected"; problem: "no-face" | "several-faces" };

function generateReportText(input: {
  faceCrop: Uint8Array; // JPEG
  result: SeasonResult;
  answers: QuizAnswers;
  // test seams; production uses the defaults
  claimSlot?: () => Promise<"granted" | "capped" | "unavailable">;
  model?: LanguageModel;
}): Promise<ReportTextResult>;
```

`static` carries no text. The page reads `SEASON_COPY[season].summary` and `AGREEMENT_COPY[agreement].body`. On `personal`, the page uses the two personal strings in their place. Either way the agreement title comes from `AGREEMENT_COPY`.

### 4. The call

The steps run in this order:

1. `claimSlot()`. `capped` returns `static/capped`. `unavailable` returns `static/cap-unavailable`.
2. One `generateText` call with these options:
   - a structured output, `Output.object({ schema })`;
   - `maxRetries: 0`. The SDK default retries would break "one vision call".
   - an `AbortController` aborted by `setTimeout(20_000)`. This rather than `AbortSignal.timeout`, so Vitest's fake timers can drive the test.
   - `providerOptions: { gateway: { zeroDataRetention: true } }`, which the Vercel docs say routes only to ZDR-verified providers;
   - one user message: a text part and an image part holding `faceCrop`, `image/jpeg`.
3. Map the outcome:
   - an abort gives `timeout`;
   - a no-object or schema error gives `invalid`;
   - any other throw gives `failed`;
   - the verdict `no-face` or `several-faces` gives `rejected`;
   - otherwise the result is `personal`.
4. Every fallback except `capped` calls `Sentry.captureException(new Error("report-text fallback: <reason>"), { extra: { cause } })` and then `await Sentry.flush(2000)`. A fallback returns normally, so nothing else flushes before the Vercel function freezes; `with-error-capture.ts` flushes only on a thrown error. The flush runs on failure paths only, and 20 s plus 2 s stays inside the 30 s budget.

Output schema (zod, `.strict()`):

```ts
{ photo: z.enum([...5 verdicts]), summary: z.string().min(1).max(700), agreementNote: z.string().min(1).max(300) }
```

These limits are looser than the fixed copy's (600 and 240). A model that runs a little long should not be thrown away. The page wraps text, and these two fields sit in free-flowing blocks.

- Alternative: let the AI SDK retry once on a schema failure. Rejected, because that is a second paid call per analysis.

### 5. The prompt

The prompt is one system string and one user text part, built from:

- the season name and family;
- the runner-up;
- the agreement case;
- the three traits with what their sign means (−1 cool / deep / soft to +1 warm / light / clear);
- the quiz answers in words;
- the season's fixed `summary`, as a voice and length anchor.

The rules come from the spec's "describes coloring only" requirement, which the prompt cites. The prompt also tells the model that the season is decided and not to be questioned, and how to judge each verdict. The prompt lives in `index.ts` as a template function, so the unit test can assert that it names the season.

### 6. Model

`REPORT_TEXT_MODEL = "google/gemini-3.8-flash"`. It is a vision and structured-output model on the Gateway, priced at $0.75 per million input tokens and $3.75 per million output. That is about $0.003 a call, or $0.60 a day at the cap. The pick comes from the Gateway's model list on 2026-10-03; re-check the list at apply. The smoke run confirms that a ZDR provider serves it. If none does, the call fails, and the next vision model with a ZDR provider is picked.

- Alternative: an env var for the model id. Rejected. Changing a constant is a one-line change. An env var would add a catalogue entry for a value that changes once a quarter at most.

### 7. The daily cap

```sql
create table public.analysis_daily_count (day date primary key, count integer not null);
alter table public.analysis_daily_count enable row level security; -- no policies
revoke all on public.analysis_daily_count from anon, authenticated;

create function public.claim_analysis_slot(cap integer) returns boolean
  language sql security definer set search_path = '' as $$
  insert into public.analysis_daily_count as c (day, count)
  values ((now() at time zone 'utc')::date, 1)
  on conflict (day) do update set count = c.count + 1 where c.count < cap
  returning true
$$;
revoke execute on function public.claim_analysis_slot(integer) from public, anon, authenticated;
grant execute on function public.claim_analysis_slot(integer) to service_role;
```

The `on conflict … where` upsert locks the day's row. A concurrent claim waits and re-checks `count < cap`, so the cap holds under load. When the cap is reached, no row comes back and the function returns `null`, which `claimAnalysisSlot` reads as `capped`.

`claimAnalysisSlot()` uses a lazily created `@supabase/supabase-js` client with `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and `auth: { persistSession: false }`, and calls `rpc("claim_analysis_slot", { cap: dailyCap() })` with a 3-second abort signal, so a hanging database cannot break the flow's 30 s budget. A missing env var, a network error, an RPC error or the timeout gives `unavailable`.

`dailyCap()` returns `Number(DAILY_ANALYSIS_CAP)` when the value matches `/^[1-9]\d*$/`, otherwise 200.

- Alternative: keep the cap in a Postgres row, which could change without a redeploy. Rejected for now. The user picked an env var, and a redeploy takes a minute. Move the cap into a row if it changes often.
- Alternative: Upstash or Vercel KV. Rejected, because the concept already chose Postgres and that would add a service.

### 8. Testing the SQL

`daily-cap.test.ts` loads the migration file into PGlite (`@electric-sql/pglite`, root dev dependency), which is Postgres compiled to WASM and running in-process. It first creates the `anon`, `authenticated` and `service_role` roles, which Supabase provides and PGlite lacks. Before loading the migration, it replays Supabase's default grants: `alter default privileges in schema public grant all on tables to anon, authenticated, service_role`, and the same for functions. A fresh PGlite role has no table grants, so without this replay the `anon` check would pass whether or not the migration revokes anything. The test then checks four things:

- With `cap = 3`, claims 1–3 return `true` and claim 4 returns `null`.
- With yesterday's row inserted at the cap, today's first claim returns `true`.
- After `set role anon`, both the claim and a select on the table raise a permission error.
- The env parsing and the `unavailable` path are tested with a stubbed client.

The 200-slot scenario runs at cap 200 in a loop. It takes milliseconds in PGlite.

- Alternative: the Supabase CLI's local stack in CI. Rejected, because it needs Docker and adds minutes to every push.

### 9. The smoke run

`report-text.smoke.ts` is not matched by the unit or eval globs. It runs only through `pnpm test:smoke`, which uses `vitest.config.smoke.ts`. A key exported in a shell can therefore never turn `pnpm test:unit` into a paid run. It calls `generateReportText` three times on `evals/photos/smoke.jpg` (git-ignored; the user supplies it), with `claimSlot` stubbed to `granted`. Vitest does not read `apps/web/.env.local`, so the config loads it with Vite's `loadEnv`. For each call it prints the result kind, the verdict, both strings and the latency. A human reads the output against the "describes coloring only" rules.

### 10. Env

| Variable              | Phase | Required | Browser | Shape            |
| --------------------- | ----- | -------- | ------- | ---------------- |
| `SUPABASE_URL`        | 1     | yes      | no      | `^https://`      |
| `SUPABASE_SECRET_KEY` | 1     | yes      | no      | checked at apply |
| `AI_GATEWAY_API_KEY`  | 1     | no       | no      | none             |
| `DAILY_ANALYSIS_CAP`  | 1     | no       | no      | `^[1-9]\d*$`     |

`AI_GATEWAY_API_KEY` is optional because Vercel deployments authenticate with OIDC (`VERCEL_OIDC_TOKEN`, injected by the platform). The SDK reads both itself, so no code reads them. They are still catalogued, because a local smoke run needs the key.

`SUPABASE_SECRET_KEY` gets its shape at apply: `^sb_secret_` for the new keys, or a JWT if the project only has legacy keys. `env.test.ts` exempts platform-injected variables, so `VERCEL_OIDC_TOKEN` is added to its exempt list and to the spec's exempt sentence, if it is ever read directly. It is not read today.

## Risks / Trade-offs

- [The chosen model has no ZDR provider on the Gateway] → Every call fails into a reported `failed`. The smoke run catches it before `t5`, and decision 6 says to pick another.
- [The model's verdict wrongly says `no-face` on a good photo] → That loses a user to a retake. The verdict is returned and `t5` records it, so `t6-eval-set` measures the false-reject rate. If it is high, demote `no-face` to recorded-only, which is a one-line change plus a spec edit.
- [A schema-invalid rate high enough that most reports go static] → Sentry shows the reason count. The smoke run's three calls give a first read. The limits are loose, as decision 4 explains.
- [A slot is spent on a call that then fails] → Accepted, because the cap guards cost, and a failed call can still cost tokens.
- [A Vercel env change needs a redeploy] → Use Redeploy in the dashboard with no code change. Decision 7 records the Postgres-row upgrade path.
- [PGlite is not Supabase] → The roles are recreated by hand, and Supabase's default grants on `public` are revoked explicitly in the migration, so the migration does not rely on either. The migration is applied to the real project once, and one claim is run there by hand (task 6.2).

## Migration Plan

1. Merge with the migration file. Nothing calls `generateReportText` until `t5`, so production behavior does not change.
2. After the user confirms, apply the migration to the Supabase project `seasonly` through the Supabase connector. Call `claim_analysis_slot(200)` once and delete the test row. Then confirm that `set role anon; select public.claim_analysis_slot(1)` fails with a permission error.
3. The user puts `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in Vercel and `.env.local`, and enables AI Gateway for the Vercel project. An optional API-key budget on the Gateway is a second cost guard.

Rollback: drop the function and the table in a new migration. The web code has no caller before `t5`.

## Open Questions

- Copy for a several-faces retake tip. There is no canvas screen. Needed by `t5`, not here.
