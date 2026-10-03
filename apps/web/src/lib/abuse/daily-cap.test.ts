/**
 * The cap's SQL runs as SQL: the migration file is loaded into PGlite (Postgres in WASM),
 * after recreating Supabase's roles and replaying its default grants on `public`, so the
 * anonymous-role check fails if the migration stops revoking them.
 *
 * @see openspec/specs/abuse-controls/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { afterEach, describe, expect, it, vi } from "vitest";

import { claimAnalysisSlot, dailyCap, type ClaimRpc } from "./daily-cap";

const MIGRATIONS = path.resolve(import.meta.dirname, "../../../../../supabase/migrations");

function migration(): string {
  const file = fs.readdirSync(MIGRATIONS).find((f) => f.endsWith("_daily_cap.sql"));
  if (!file) throw new Error("no *_daily_cap.sql migration");
  return fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
}

/** A fresh database shaped like a Supabase project, with the migration applied. */
async function database(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  await db.exec(migration());
  return db;
}

const claim = async (db: PGlite, cap: number) =>
  (await db.query<{ r: boolean | null }>("select public.claim_analysis_slot($1) as r", [cap]))
    .rows[0]?.r;

/** The production RPC's shape, answered by PGlite. */
const pgliteRpc =
  (db: PGlite): ClaimRpc =>
  async (cap) => ({ data: await claim(db, cap), error: null });

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("claim_analysis_slot", () => {
  /** {@link openspec/specs/abuse-controls/spec.md#scenario-the-last-slot-and-the-next-claim} */
  it("grants the 200th claim and refuses the 201st at cap 200", async () => {
    const db = await database();
    const results: (boolean | null | undefined)[] = [];
    for (let i = 0; i < 201; i++) results.push(await claim(db, 200));
    expect(results.slice(0, 200).every((r) => r === true)).toBe(true);
    expect(results[200]).toBeNull();
  });

  /** {@link openspec/specs/abuse-controls/spec.md#scenario-the-last-slot-and-the-next-claim} */
  it("reads a refused claim as capped", async () => {
    const db = await database();
    await db.query("select public.claim_analysis_slot(1)");
    expect(await claimAnalysisSlot({ cap: 1, rpc: pgliteRpc(db) })).toBe("capped");
  });

  /** {@link openspec/specs/abuse-controls/spec.md#scenario-a-new-day} */
  it("grants today's first claim after yesterday hit the cap", async () => {
    const db = await database();
    await db.exec(
      "insert into public.analysis_daily_count values ((now() at time zone 'utc')::date - 1, 200)",
    );
    expect(await claimAnalysisSlot({ cap: 200, rpc: pgliteRpc(db) })).toBe("granted");
  });

  /** {@link openspec/specs/abuse-controls/spec.md#scenario-the-public-role-tries-to-claim} */
  it("refuses the anonymous role both the claim and the counter", async () => {
    const db = await database();
    await db.exec("set role anon");
    await expect(claim(db, 1)).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.analysis_daily_count")).rejects.toThrow(
      /permission denied/,
    );
    await db.exec("set role service_role");
    expect(await claim(db, 1)).toBe(true);
  });
});

describe("claimAnalysisSlot", () => {
  /** {@link openspec/specs/abuse-controls/spec.md#scenario-the-database-is-down} */
  it("answers unavailable when the request fails or errors", async () => {
    expect(
      await claimAnalysisSlot({ rpc: () => Promise.reject(new TypeError("fetch failed")) }),
    ).toBe("unavailable");
    expect(
      await claimAnalysisSlot({ rpc: async () => ({ data: null, error: { message: "boom" } }) }),
    ).toBe("unavailable");
  });

  /** {@link openspec/specs/abuse-controls/spec.md#scenario-the-database-is-down} */
  it("answers unavailable after 3 s when the database never answers", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const pending = claimAnalysisSlot({
      rpc: (_cap, s) => {
        signal = s;
        return new Promise(() => {});
      },
    });
    await vi.advanceTimersByTimeAsync(2999);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBe("unavailable");
    expect(signal?.aborted).toBe(true);
  });

  /** {@link openspec/specs/abuse-controls/spec.md#scenario-the-database-is-down} */
  it("answers unavailable without its env vars", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(await claimAnalysisSlot()).toBe("unavailable");
  });

  /** {@link openspec/specs/abuse-controls/spec.md#scenario-no-override} */
  it("claims against dailyCap() by default", async () => {
    vi.stubEnv("DAILY_ANALYSIS_CAP", "350");
    const rpc = vi.fn<ClaimRpc>(async () => ({ data: true, error: null }));
    expect(await claimAnalysisSlot({ rpc })).toBe("granted");
    expect(rpc).toHaveBeenCalledWith(350, expect.any(AbortSignal));
  });
});

describe("dailyCap", () => {
  /** {@link openspec/specs/abuse-controls/spec.md#scenario-no-override} */
  it("is 200 when DAILY_ANALYSIS_CAP is unset", () => {
    vi.stubEnv("DAILY_ANALYSIS_CAP", undefined);
    expect(dailyCap()).toBe(200);
  });

  /** {@link openspec/specs/abuse-controls/spec.md#scenario-a-malformed-override} */
  it.each(["lots", "0", "-5", "1.5", " 300"])("ignores %j", (value) => {
    vi.stubEnv("DAILY_ANALYSIS_CAP", value);
    expect(dailyCap()).toBe(200);
  });

  /** {@link openspec/specs/abuse-controls/spec.md#requirement-the-cap-defaults-to-200-a-day} */
  it("takes a positive integer", () => {
    vi.stubEnv("DAILY_ANALYSIS_CAP", "350");
    expect(dailyCap()).toBe(350);
  });
});
