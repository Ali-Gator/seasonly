/**
 * The report_emails migration runs as SQL in PGlite, on a stub `reports` table, after recreating
 * Supabase's roles and replaying its default grants on `public`, as in daily-cap.test.ts.
 *
 * @see openspec/specs/email-capture/spec.md
 */
import fs from "node:fs";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

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
    create table public.reports (id text primary key, is_test boolean not null default true);
    revoke all on public.reports from public, anon, authenticated;
    grant select, insert on public.reports to service_role;
  `);
  await db.exec(migration("_report_emails.sql"));
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

/** Called as the server's role: run as the superuser, a missing privilege would go unseen. */
const store = async (reportId: string, email = "maya.reyes@gmail.com") => {
  await db.exec("set role service_role");
  try {
    const { rows } = await db.query<{ outcome: string; email_id: number | null }>(
      "select * from public.store_report_email($1, $2, true)",
      [reportId, email],
    );
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
    const { rows } = await db.query("select email from public.report_emails where report_id = $1", [
      id,
    ]);
    expect(rows).toHaveLength(3);
  });

  /** {@link openspec/specs/email-capture/spec.md#scenario-an-unknown-id} */
  it("answers unknown for a missing report and stores nothing", async () => {
    expect(await store("no-such-report")).toEqual({ outcome: "unknown", email_id: null });
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
      /from public\.reports where id = p_report_id for update/,
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
