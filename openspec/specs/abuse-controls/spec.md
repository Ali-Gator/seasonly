# abuse-controls Specification

## Purpose

Keeps the cost of free analyses bounded. Every analysis with a photo costs one paid vision call, so the number of calls per day is capped in Postgres, and a slot is claimed before each call. Vercel BotID refuses bots on the analyze route before a slot is claimed.

## Public Interface

```typescript
// apps/web/src/lib/abuse/daily-cap.ts (server only)
type SlotClaim = "granted" | "capped" | "unavailable";
type ClaimRpc = (
  cap: number,
  signal: AbortSignal,
) => PromiseLike<{ data: unknown; error: unknown }>;
function dailyCap(): number; // DAILY_ANALYSIS_CAP if /^[1-9]\d*$/, else 200
function claimAnalysisSlot(opts?: { cap?: number; rpc?: ClaimRpc }): Promise<SlotClaim>;
```

```sql
-- supabase/migrations/20261003162810_daily_cap.sql
public.analysis_daily_count (day date primary key, count integer not null) -- RLS on, no policies
public.claim_analysis_slot(cap integer) returns boolean -- security definer; true = granted, null = capped
-- execute revoked from public, anon, authenticated; granted to service_role
```

## Behavior

- `claim_analysis_slot` is one upsert on today's UTC date: insert count 1, or add 1 only while `count < cap`. The upsert locks the day's row, so a concurrent claim waits and re-checks. No row back means the cap is reached.
- `claimAnalysisSlot` calls the RPC through a lazily created supabase-js client (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `persistSession: false`), with a 3 s abort that is also raced. `true` gives `granted`, anything else `capped`; an error, a throw, missing env vars or the timeout give `unavailable`.
- Changing `DAILY_ANALYSIS_CAP` on Vercel takes a redeploy, not a code change.
- The migration's SQL is tested in PGlite after recreating Supabase's roles and replaying its default grants on `public`.

## Edge Cases

- `SUPABASE_URL` must be the bare project URL; a Data API URL ending in `/rest/v1/` makes every claim `unavailable` (PostgREST `PGRST125`). `verify:env` rejects a path.
- A claim that commits just after the 3 s timeout spends a slot with no model call; it errs toward fewer calls.
- Rows accumulate one per day and are never pruned; at one small row a day that needs no cleanup.
- BotID's real check runs only where `VERCEL_ENV` is set (every Vercel deployment); locally and in CI it runs in development mode and answers human, so a self-hosted copy has no bot check.

## Requirements

### Requirement: Vision calls are capped per UTC day

A slot claim SHALL be granted while fewer than the cap have been granted on the current UTC day, and refused once the cap is reached. A new UTC day SHALL start from zero. Counting and granting SHALL happen in one atomic database statement, so concurrent claims never grant more than the cap.

**Unenforced:** concurrency itself is not exercised, because the in-process test database has one connection. The single-statement upsert, which locks the day's row, carries it; the scenarios below prove the counting.

#### Scenario: The last slot and the next claim

- **WHEN** the cap is 200 and 200 claims have been granted today
- **THEN** the 200th claim was granted and the 201st is refused

#### Scenario: A new day

- **WHEN** the cap was reached yesterday (UTC)
- **THEN** the first claim today is granted

### Requirement: The cap defaults to 200 a day

The cap SHALL be 200 unless `DAILY_ANALYSIS_CAP` holds a positive integer, which then replaces it. Any other value SHALL be ignored, and the cap SHALL stay 200.

#### Scenario: No override

- **WHEN** `DAILY_ANALYSIS_CAP` is unset
- **THEN** claims are made against a cap of 200

#### Scenario: A malformed override

- **WHEN** `DAILY_ANALYSIS_CAP` is `lots`
- **THEN** claims are made against a cap of 200

### Requirement: Only the server can claim a slot

The counter SHALL be readable and writable only through the claim, and the claim SHALL run only with the server's secret key. A browser holding the public key SHALL NOT be able to read the counter or claim a slot.

#### Scenario: The public role tries to claim

- **WHEN** the database's anonymous role calls the claim or reads the counter
- **THEN** it is refused with a permission error

### Requirement: An unreachable counter grants nothing

When the counter cannot be reached or answers with an error, the claim SHALL answer `unavailable` and grant no slot.

#### Scenario: The database is down

- **WHEN** the claim's database request fails
- **THEN** the claim answers `unavailable`

### Requirement: Bots are refused on the analyze route

The analyze route SHALL check each request with Vercel BotID before anything else. A request classified as a bot SHALL be answered 403 and SHALL NOT claim a slot, call the model or store anything. The browser SHALL attach BotID's challenge to `POST /api/analyze`.

**Unenforced:** BotID classifies real traffic only on a Vercel deployment. Off Vercel (no `VERCEL_ENV`, which the platform sets on every deployment) the route runs BotID in its development mode, which answers "human", so local runs and CI's E2E pass through. BotID's own development check is `NODE_ENV`, which `next start` sets to `production`; there it throws for want of Vercel's OIDC token (checked in task 3.3). The unit test proves the refusal with a bot answer, and a preview deployment shows the challenge on the request.

#### Scenario: A bot

- **WHEN** BotID classifies an analyze request as a bot
- **THEN** the route answers 403, and no slot is claimed, no model call is made and nothing is stored

#### Scenario: The browser protects the request

- **WHEN** the client instrumentation starts
- **THEN** BotID protects `POST /api/analyze`
