/**
 * The report_emails migration runs as SQL in PGlite, on a stub `reports` table, after recreating
 * Supabase's roles and replaying its default grants on `public`, as in daily-cap.test.ts.
 *
 * @see openspec/specs/email-capture/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import * as Sentry from "@sentry/nextjs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { type StoreEmailRpc, storeReportEmail } from "./store";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  flush: vi.fn(async () => true),
}));

const MIGRATIONS = path.resolve(import.meta.dirname, "../../../../../supabase/migrations");

function migration(suffix: string): string {
  const file = fs.readdirSync(MIGRATIONS).find((f) => f.endsWith(suffix));
  if (!file) throw new Error(`no *${suffix} migration`);
  return fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
}

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    create table public.reports (id text primary key, season text not null default 'soft-autumn', agreement text not null default 'agree', is_test boolean not null default true);
    revoke all on public.reports from public, anon, authenticated;
    grant select, insert on public.reports to service_role;
  `);
  await db.exec(migration("_report_emails.sql"));
}, 30_000);

afterEach(async () => {
  await db.exec("reset role");
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

let n = 0;
const report = async () => {
  const id = `report-${++n}`;
  await db.query("insert into public.reports (id) values ($1)", [id]);
  return id;
};

/** Called as the server's role: run as the superuser, a missing privilege would go unseen. */
const store = async (reportId: string, email = "maya.reyes@gmail.com") => {
  await db.exec("set role service_role");
  try {
    const { rows } = await db.query<{
      outcome: string;
      email_id: number | null;
      season: string | null;
      agreement: string | null;
    }>("select * from public.store_report_email($1, $2, true)", [reportId, email]);
    return rows[0];
  } finally {
    await db.exec("reset role");
  }
};

describe("store_report_email", () => {
  /** {@link openspec/specs/abuse-controls/spec.md#scenario-the-fourth-address} */
  it("stores three addresses, then answers limit", async () => {
    const id = await report();
    const outcomes = [];
    for (let i = 0; i < 4; i++) outcomes.push(await store(id, `p${i}@example.com`));
    expect(outcomes.map((o) => o?.outcome)).toEqual(["stored", "stored", "stored", "limit"]);
    expect(outcomes.slice(0, 3).every((o) => typeof o?.email_id === "number")).toBe(true);
    expect(outcomes[3]?.email_id).toBeNull();
    expect(outcomes.every((o) => o?.season === "soft-autumn" && o.agreement === "agree")).toBe(
      true,
    );
    const { rows } = await db.query("select email from public.report_emails where report_id = $1", [
      id,
    ]);
    expect(rows).toHaveLength(3);
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-an-unknown-id} */
  it("answers unknown for a missing report and stores nothing", async () => {
    expect(await store("no-such-report")).toEqual({
      outcome: "unknown",
      email_id: null,
      season: null,
      agreement: null,
    });
    const { rows } = await db.query(
      "select 1 from public.report_emails where report_id = 'no-such-report'",
    );
    expect(rows).toHaveLength(0);
  });

  /**
   * PGlite has one connection, so two calls cannot race here; the lock on the report row is what
   * serializes them on Supabase.
   *
   * {@link openspec/specs/abuse-controls/spec.md#scenario-two-requests-at-once}
   */
  it("locks the report row before counting", () => {
    expect(migration("_report_emails.sql")).toMatch(
      /from public\.reports rp where rp\.id = p_report_id for update/,
    );
  });

  it("refuses an address longer than 254 characters", async () => {
    const id = await report();
    await expect(store(id, `${"a".repeat(243)}@example.com`)).rejects.toThrow(/check/);
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-the-public-role-reads-addresses} */
  it("refuses the anonymous role select, insert and execute", async () => {
    const id = await report();
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await expect(db.query("select * from public.report_emails")).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        db.query(
          `insert into public.report_emails (report_id, email, is_test) values ('${id}', 'a@b.co', true)`,
        ),
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query(`select * from public.store_report_email('${id}', 'a@b.co', true)`),
      ).rejects.toThrow(/permission denied/);
      await db.exec("reset role");
    }
  });

  it("deletes a report's addresses with the report", async () => {
    const id = await report();
    await store(id);
    await db.query("delete from public.reports where id = $1", [id]);
    const { rows } = await db.query("select 1 from public.report_emails where report_id = $1", [
      id,
    ]);
    expect(rows).toHaveLength(0);
  });
});

/** The production RPC's shape, answered by PGlite as the server's role. */
const pgliteRpc: StoreEmailRpc = async (args) => {
  await db.exec("set role service_role");
  try {
    const { rows } = await db.query("select * from public.store_report_email($1, $2, $3)", [
      args.p_report_id,
      args.p_email,
      args.p_is_test,
    ]);
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error: error as { code?: string } };
  } finally {
    await db.exec("reset role");
  }
};

const TO = "maya.reyes@gmail.com";

describe("storeReportEmail", () => {
  /** {@link openspec/specs/email-capture/spec.md#scenario-a-valid-address} */
  it("stores the address under its report with the season to render", async () => {
    const id = await report();
    const outcome = await storeReportEmail(id, TO, { rpc: pgliteRpc });
    expect(outcome).toEqual({
      kind: "stored",
      emailId: expect.any(Number),
      season: "soft-autumn",
      quizOnly: false,
    });
    const { rows } = await db.query("select email from public.report_emails where report_id = $1", [
      id,
    ]);
    expect(rows).toEqual([{ email: TO }]);
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-a-preview-deployment} */
  it("marks an address as test data outside production", async () => {
    const flags: boolean[] = [];
    const rpc: StoreEmailRpc = async (args) => {
      flags.push(args.p_is_test);
      return { data: [{ outcome: "unknown" }], error: null };
    };
    vi.stubEnv("VERCEL_ENV", "preview");
    await storeReportEmail("x", TO, { rpc });
    vi.stubEnv("VERCEL_ENV", "production");
    await storeReportEmail("x", TO, { rpc });
    expect(flags).toEqual([true, false]);
  });

  it("answers limit and unknown as the function does", async () => {
    const id = await report();
    for (let i = 0; i < 3; i++) await storeReportEmail(id, TO, { rpc: pgliteRpc });
    expect(await storeReportEmail(id, TO, { rpc: pgliteRpc })).toEqual({ kind: "limit" });
    expect(await storeReportEmail("no-such-report", TO, { rpc: pgliteRpc })).toEqual({
      kind: "unknown",
    });
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-the-database-is-down} */
  it("gives failed and reports to Sentry without the address", async () => {
    const rpc: StoreEmailRpc = async () => ({
      data: null,
      error: {
        code: "XX000",
        message: `boom for ${TO}`,
        details: `Failing row contains (${TO})`,
      } as {
        code?: string;
      },
    });
    expect(await storeReportEmail("k7m2qx", TO, { rpc })).toEqual({ kind: "failed" });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const calls = JSON.stringify(vi.mocked(Sentry.captureException).mock.calls, (_, v) =>
      v instanceof Error ? { message: v.message, cause: v.cause } : v,
    );
    expect(calls).toContain("k7m2qx");
    expect(calls).toContain("XX000");
    expect(calls).not.toContain(TO);
  });

  /** {@link openspec/specs/email-capture/spec.md#requirement-a-failed-store-keeps-the-person-on-the-step} */
  it("gives failed after 3 s when the database never answers", async () => {
    vi.useFakeTimers();
    const pending = storeReportEmail("k7m2qx", TO, { rpc: () => new Promise(() => {}) });
    await vi.advanceTimersByTimeAsync(3000);
    expect(await pending).toEqual({ kind: "failed" });
  });
});
