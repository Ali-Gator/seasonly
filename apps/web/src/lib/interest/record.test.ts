/**
 * The interest_clicks migration runs as SQL in PGlite, on a stub `reports` table, after recreating
 * Supabase's roles and replaying its default grants on `public`, as in daily-cap.test.ts.
 *
 * @see openspec/specs/interest-button/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = path.resolve(import.meta.dirname, "../../../../../supabase/migrations");

function migration(): string {
  const file = fs.readdirSync(MIGRATIONS).find((f) => f.endsWith("_interest_clicks.sql"));
  if (!file) throw new Error("no *_interest_clicks.sql migration");
  return fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
}

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    create table public.reports (id text primary key, is_test boolean not null default true);
    revoke all on public.reports from public, anon, authenticated;
    grant select, insert on public.reports to service_role;
  `);
  await db.exec(migration());
}, 30_000);

afterEach(async () => {
  await db.exec("reset role");
});

let n = 0;
const report = async () => {
  const id = `report-${++n}`;
  await db.query("insert into public.reports (id) values ($1)", [id]);
  return id;
};

/** The upsert with ignoreDuplicates that the interest route sends, as the server's role. */
const tap = async (reportId: string, isTest = false) => {
  await db.exec("set role service_role");
  try {
    await db.query(
      "insert into public.interest_clicks (report_id, is_test) values ($1, $2) on conflict do nothing",
      [reportId, isTest],
    );
  } finally {
    await db.exec("reset role");
  }
};

const count = async (sql: string) =>
  Number((await db.query<{ count: number }>(sql)).rows[0]?.count);

describe("interest_clicks", () => {
  /** {@link openspec/specs/interest-button/spec.md#scenario-a-second-tap-from-another-device} */
  it("keeps one record when interest is recorded again", async () => {
    const id = await report();
    await tap(id);
    await tap(id);
    expect(
      await count(`select count(*) from public.interest_clicks where report_id = '${id}'`),
    ).toBe(1);
  });

  /** {@link openspec/specs/interest-button/spec.md#scenario-counting} */
  it("counts production reports with interest once each, leaving out test rows", async () => {
    await db.exec("delete from public.interest_clicks");
    const [a, b, t] = [await report(), await report(), await report()];
    await tap(a);
    await tap(a);
    await tap(a);
    await tap(b);
    await tap(t, true);
    expect(await count("select count(*) from public.interest_clicks where not is_test")).toBe(2);
  });

  /** {@link openspec/specs/interest-button/spec.md#scenario-an-unknown-id} */
  it("refuses interest for a missing report with a foreign-key error", async () => {
    await expect(tap("no-such-report")).rejects.toMatchObject({ code: "23503" });
  });

  /** {@link openspec/specs/interest-button/spec.md#scenario-the-public-role-reads-interest} */
  it("refuses the anonymous role select and insert", async () => {
    const id = await report();
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await expect(db.query("select * from public.interest_clicks")).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        db.query(`insert into public.interest_clicks (report_id, is_test) values ('${id}', true)`),
      ).rejects.toThrow(/permission denied/);
      await db.exec("reset role");
    }
  });

  it("deletes a report's interest with the report", async () => {
    const id = await report();
    await tap(id);
    await db.query("delete from public.reports where id = $1", [id]);
    expect(
      await count(`select count(*) from public.interest_clicks where report_id = '${id}'`),
    ).toBe(0);
  });
});
